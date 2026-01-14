'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

type Recipe = {
  id: string
  cookbook_id: string
  title: string
  ingredients_text: string
  steps_text: string
}

function parseLines(text: string) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseSteps(text: string) {
  // acepta "1. ..." o "1) ..." o texto plano
  const lines = parseLines(text)
  return lines.map((l) => l.replace(/^\d+\s*[.)-]\s*/, ''))
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

  const storageKey = useMemo(() => `cook:${recipeId}`, [recipeId])

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('recipes')
        .select('id,cookbook_id,title,ingredients_text,steps_text')
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

      // carga progreso guardado
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const obj = JSON.parse(saved) as { stepIndex?: number; checked?: Record<number, boolean>; sideOpen?: boolean }
          if (typeof obj.stepIndex === 'number') setStepIndex(obj.stepIndex)
          if (obj.checked) setChecked(obj.checked)
          if (typeof obj.sideOpen === 'boolean') setSideOpen(obj.sideOpen)
        }
      } catch {}

      setLoading(false)
    }

    run()
  }, [recipeId, storageKey])

  const ingredients = useMemo(() => (recipe ? parseLines(recipe.ingredients_text) : []), [recipe])
  const steps = useMemo(() => (recipe ? parseSteps(recipe.steps_text) : []), [recipe])

  useEffect(() => {
    // guarda progreso cada que cambie
    try {
      localStorage.setItem(storageKey, JSON.stringify({ stepIndex, checked, sideOpen }))
    } catch {}
  }, [storageKey, stepIndex, checked, sideOpen])

  const canPrev = stepIndex > 0
  const canNext = stepIndex < steps.length - 1

  const toggleChecked = (i: number) => {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const resetProgress = () => {
    if (!confirm('¿Reiniciar progreso de esta receta?')) return
    setStepIndex(0)
    setChecked({})
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-slate-900">
        <p className="text-slate-800">Cargando…</p>
      </main>
    )
  }

  if (!recipe) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-slate-900">
        <p className="text-slate-800">No encontré la receta.</p>
        <button className="mt-4 rounded-xl border bg-white px-4 py-3" onClick={() => router.push('/library')}>
          Volver
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 text-slate-900">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            className="text-sm text-slate-100 hover:underline"
            onClick={() => router.push(`/recipe/${recipe.id}`)}
          >
            ← Volver a receta
          </button>
          <h1 className="mt-2  text-slate-100 text-3xl font-extrabold">{recipe.title}</h1>
          <p className="mt-1 text-slate-100">Modo cocinar</p>
        </div>

        <div className="flex gap-2">
          <button className="rounded-xl border bg-white px-4 py-3 hover:bg-slate-50" onClick={resetProgress}>
            Reiniciar
          </button>
          <button
            className="rounded-xl border bg-white px-4 py-3 hover:bg-slate-50"
            onClick={() => setSideOpen((v) => !v)}
          >
            {sideOpen ? 'Ocultar ingredientes →' : '← Ver ingredientes'}
          </button>
        </div>
      </div>

      {/* layout */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* paso */}
        <section className={`rounded-3xl border bg-white p-6 shadow-sm ${sideOpen ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Paso {steps.length ? stepIndex + 1 : 0} de {steps.length}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-6">
            <div className="text-2xl leading-relaxed text-slate-900">
              {steps.length ? steps[stepIndex] : 'No hay pasos.'}
            </div>
          </div>

          {/* controles */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              className="rounded-2xl border bg-white px-5 py-4 text-lg hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={!canPrev}
            >
              ← Anterior
            </button>

            <button
              className="rounded-2xl bg-slate-900 px-6 py-4 text-lg text-white hover:opacity-90 disabled:opacity-50"
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={!canNext}
            >
              Siguiente →
            </button>
          </div>
        </section>

        {/* sidebar ingredientes */}
        {sideOpen && (
          <aside className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Ingredientes</h2>

              {/* flechita colapsar */}
              <button
                className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => setSideOpen(false)}
                aria-label="Ocultar ingredientes"
              >
                →
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-800">
              Marca lo que ya tienes o ya usaste.
            </p>

            <div className="mt-4 space-y-2">
              {ingredients.map((ing, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5"
                    checked={!!checked[i]}
                    onChange={() => toggleChecked(i)}
                  />
                  <span className={`text-base ${checked[i] ? 'line-through text-slate-500' : 'text-slate-900'}`}>
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
