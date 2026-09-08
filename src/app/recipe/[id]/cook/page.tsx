'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  Minus,
  Plus,
} from 'lucide-react'

type Recipe = {
  id: string
  cookbook_id: string
  title: string
  ingredients_text: string
  steps_text: string
  servings: number | null
}

type ParsedStep = { text: string; spec: string }
type ParsedIngredient = {
  original: string
  quantity: number | null
  unit: string
  name: string
}

// Formato guardado por la página de editar: un ingrediente por línea,
// un paso por línea (con "[spec: texto]" al final si tiene especificación).
const SPEC_TAG = /\[spec:\s*(.*?)\]/i

function parseLines(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseSteps(text: string): ParsedStep[] {
  return parseLines(text).map((line) => {
    const match = line.match(SPEC_TAG)
    const spec = match ? match[1].trim() : ''
    const main = (match ? line.replace(match[0], '') : line)
      .replace(/^\d+\s*[.)-]\s*/, '')
      .trim()
    return { text: main, spec }
  })
}

// Detecta ingredientes "al gusto" (sal al gusto, chile al gusto, etc.)
// para no intentar escalarlos como si tuvieran una cantidad numérica.
const AL_GUSTO = /al\s+gusto/i

function parseIngredient(line: string): ParsedIngredient {
  const cleaned = line.replace(/^-+\s*/, '').trim()

  if (AL_GUSTO.test(cleaned)) {
    return { original: line, quantity: null, unit: '', name: cleaned }
  }

  const match = cleaned.match(
    /^([\d.,/]+)\s*(g|kg|ml|l|taza|tazas|cda|cdta|pieza|piezas|pizca|pizcas|cucharada|cucharadas|cucharadita|cucharaditas|litro|litros|gramo|gramos|kilo|kilos|rebanada|rebanadas|diente|dientes|rama|ramas|hoja|hojas|lata|latas|paquete|paquetes|barra|barras|trozo|trozos|manojo|manojos)?\s*(?:de\s+)?(.+)/i
  )

  if (match) {
    const qtyStr = match[1].replace(',', '.')
    let qty: number
    if (qtyStr.includes('/')) {
      const parts = qtyStr.split('/')
      qty = parseFloat(parts[0]) / parseFloat(parts[1])
    } else {
      qty = parseFloat(qtyStr)
    }
    return {
      original: line,
      quantity: isNaN(qty) ? null : qty,
      unit: (match[2] || '').trim(),
      name: match[3].trim(),
    }
  }

  return { original: line, quantity: null, unit: '', name: cleaned }
}

function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return n.toString()
  if (Math.abs(n - Math.round(n * 4) / 4) < 0.01) {
    const whole = Math.floor(n)
    const frac = n - whole
    if (frac < 0.13) return whole.toString()
    if (frac < 0.38) return whole > 0 ? `${whole} 1/4` : '1/4'
    if (frac < 0.63) return whole > 0 ? `${whole} 1/2` : '1/2'
    if (frac < 0.88) return whole > 0 ? `${whole} 3/4` : '3/4'
    return (whole + 1).toString()
  }
  return n.toFixed(1)
}

function scaleIngredientLine(parsed: ParsedIngredient, ratio: number): string {
  // "al gusto" y otros ingredientes sin cantidad numérica nunca se escalan.
  if (parsed.quantity === null || ratio === 1) {
    return parsed.original
  }
  const scaled = parsed.quantity * ratio
  const qtyStr = formatQuantity(scaled)
  if (parsed.unit) {
    return `${qtyStr} ${parsed.unit} de ${parsed.name}`
  }
  return `${qtyStr} ${parsed.name}`
}

export default function CookModePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const recipeId = params.id

  const [loading, setLoading] = useState(true)
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  const [stepIndex, setStepIndex] = useState(0)
  const [sideOpen, setSideOpen] = useState(true)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [desiredServings, setDesiredServings] = useState<number>(0)

  const storageKey = useMemo(() => `cook:${recipeId}`, [recipeId])

  const baseServings = useMemo(() => {
    if (!recipe || !recipe.servings) return 0
    return recipe.servings
  }, [recipe])

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('recipes')
        .select('id,cookbook_id,title,ingredients_text,steps_text,servings')
        .eq('id', recipeId)
        .single()

      if (error) {
        console.error(error)
        setRecipe(null)
        setLoading(false)
        return
      }

      const r = data as Recipe
      setRecipe(r)

      // Por default, las porciones deseadas empiezan igual a las de la receta.
      let initialServings = r.servings && r.servings > 0 ? r.servings : 0

      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const obj = JSON.parse(saved) as {
            stepIndex?: number
            checked?: Record<number, boolean>
            sideOpen?: boolean
            desiredServings?: number
          }
          if (typeof obj.stepIndex === 'number') setStepIndex(obj.stepIndex)
          if (obj.checked) setChecked(obj.checked)
          if (typeof obj.sideOpen === 'boolean') setSideOpen(obj.sideOpen)
          if (typeof obj.desiredServings === 'number' && obj.desiredServings > 0) {
            initialServings = obj.desiredServings
          }
        }
      } catch {}

      setDesiredServings(initialServings)
      setLoading(false)
    }

    run()
  }, [recipeId, storageKey])

  const rawIngredients = useMemo(() => (recipe ? parseLines(recipe.ingredients_text) : []), [recipe])
  const parsedIngredients = useMemo(() => rawIngredients.map(parseIngredient), [rawIngredients])
  const steps = useMemo(() => (recipe ? parseSteps(recipe.steps_text) : []), [recipe])

  const ratio = useMemo(() => {
    if (baseServings <= 0 || desiredServings <= 0) return 1
    return desiredServings / baseServings
  }, [baseServings, desiredServings])

  const scaledIngredients = useMemo(
    () => parsedIngredients.map((p) => scaleIngredientLine(p, ratio)),
    [parsedIngredients, ratio]
  )

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ stepIndex, checked, sideOpen, desiredServings }))
    } catch {}
  }, [storageKey, stepIndex, checked, sideOpen, desiredServings])

  const canPrev = stepIndex > 0
  const canNext = stepIndex < steps.length - 1

  const toggleChecked = (i: number) => {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const resetProgress = () => {
    if (!confirm('¿Reiniciar progreso de esta receta?')) return
    setStepIndex(0)
    setChecked({})
    setDesiredServings(baseServings)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p style={{ color: 'var(--recipe-muted)' }}>Cargando…</p>
      </main>
    )
  }

  if (!recipe) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p style={{ color: 'var(--recipe-muted)' }}>No encontré la receta.</p>
        <button
          className="mt-4 rounded-xl border px-4 py-3 hover:opacity-70"
          style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
          onClick={() => router.push('/library')}
        >
          Volver
        </button>
      </main>
    )
  }

  const currentStep = steps[stepIndex]

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70"
            style={{ color: 'var(--ink)' }}
            onClick={() => router.push(`/recipe/${recipe.id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a receta
          </button>
          <h1 className="title-font mt-2 text-3xl font-extrabold" style={{ color: 'var(--ink)' }}>
            {recipe.title}
          </h1>
          <p className="mt-1 handwritten text-lg" style={{ color: 'var(--recipe-muted)' }}>
            Modo cocinar — Paso {steps.length ? stepIndex + 1 : 0} de {steps.length}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:opacity-70"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
            onClick={resetProgress}
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </button>
          <button
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:opacity-70"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
            onClick={() => setSideOpen((v) => !v)}
          >
            {sideOpen ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                Ocultar ingredientes
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                Ver ingredientes
              </>
            )}
          </button>
        </div>
      </div>

      {/* layout */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* paso */}
        <section
          className={`rounded-3xl border p-6 ${sideOpen ? 'lg:col-span-8' : 'lg:col-span-12'}`}
          style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
        >
          <div className="text-sm font-semibold" style={{ color: 'var(--recipe-muted)' }}>
            Paso {steps.length ? stepIndex + 1 : 0} de {steps.length}
          </div>

          <div
            className="mt-4 rounded-2xl p-8"
            style={{ minHeight: 140, background: 'rgba(173,131,101,0.08)' }}
          >
            <div className="text-2xl leading-relaxed" style={{ color: 'var(--ink)' }}>
              {steps.length ? currentStep.text : 'No hay pasos.'}
            </div>

            {steps.length > 0 && currentStep.spec && (
              <div
                className="mt-4 rounded-xl border-l-4 px-4 py-3 text-base"
                style={{ borderColor: '#ad8365', background: 'rgba(173,131,101,0.12)', color: 'var(--ink)' }}
              >
                <span className="font-semibold">Especificación:</span> {currentStep.spec}
              </div>
            )}
          </div>

          {/* controles */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              className="flex items-center gap-2 rounded-2xl border px-5 py-4 text-lg hover:opacity-70 disabled:opacity-40"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={!canPrev}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <div className="flex gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStepIndex(i)}
                  className="rounded-full transition-all duration-300"
                  aria-label={`Ir al paso ${i + 1}`}
                  style={{
                    width: i === stepIndex ? 12 : 8,
                    height: i === stepIndex ? 12 : 8,
                    backgroundColor:
                      i === stepIndex ? '#ad8365' : i < stepIndex ? 'rgba(173,131,101,0.4)' : 'var(--rule)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <button
              className="flex items-center gap-2 rounded-2xl px-6 py-4 text-lg text-white hover:opacity-90 disabled:opacity-40"
              style={{ background: 'hsl(var(--primary))' }}
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={!canNext}
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* sidebar ingredientes */}
        {sideOpen && (
          <aside
            className="rounded-3xl border p-6 lg:col-span-4"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold title-font" style={{ color: 'var(--ink)' }}>
                Ingredientes
              </h2>
              <button
                className="rounded-xl border p-2 hover:opacity-70"
                style={{ borderColor: 'var(--rule)' }}
                onClick={() => setSideOpen(false)}
                aria-label="Ocultar ingredientes"
              >
                <PanelRightClose className="w-4 h-4" style={{ color: 'var(--ink)' }} />
              </button>
            </div>

            {baseServings > 0 && (
              <div
                className="mt-3 rounded-xl border p-3"
                style={{ borderColor: 'var(--rule)', background: 'rgba(173,131,101,0.06)' }}
              >
                <label className="text-xs font-semibold" style={{ color: 'var(--recipe-muted)' }}>
                  ¿Para cuántas porciones?
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-70 disabled:opacity-40"
                    style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
                    onClick={() => setDesiredServings((v) => Math.max(1, v - 1))}
                    disabled={desiredServings <= 1}
                    aria-label="Menos porciones"
                  >
                    <Minus className="w-4 h-4" style={{ color: 'var(--ink)' }} />
                  </button>
                  <input
                    className="w-16 rounded-xl border py-2 text-center text-base"
                    style={{ borderColor: 'var(--rule)' }}
                    value={desiredServings}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      if (!isNaN(n) && n > 0) setDesiredServings(n)
                    }}
                    inputMode="numeric"
                  />
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-70"
                    style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
                    onClick={() => setDesiredServings((v) => v + 1)}
                    aria-label="Más porciones"
                  >
                    <Plus className="w-4 h-4" style={{ color: 'var(--ink)' }} />
                  </button>
                </div>
                {ratio !== 1 && (
                  <p className="mt-1.5 text-xs handwritten" style={{ color: '#ad8365' }}>
                    {Math.round(ratio * 100)}% de la receta original ({baseServings} porc.)
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 text-sm" style={{ color: 'var(--recipe-muted)' }}>
              Marca lo que ya tienes o ya usaste.
            </p>

            <div className="mt-4 space-y-2">
              {scaledIngredients.map((ing, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:opacity-80"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-primary"
                    checked={!!checked[i]}
                    onChange={() => toggleChecked(i)}
                  />
                  <span
                    className="text-base"
                    style={{
                      color: checked[i] ? 'var(--recipe-muted)' : 'var(--ink)',
                      textDecoration: checked[i] ? 'line-through' : 'none',
                    }}
                  >
                    {ing.replace(/^-+\s*/, '')}
                  </span>
                </label>
              ))}
            </div>
          </aside>
        )}
      </div>
    </main>
  )
}