'use client'

import { useEffect, useMemo, useRef, useState, useCallback, type DragEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Upload, X, Plus, Trash2, Clock, Users, StickyNote, ChevronDown } from 'lucide-react'

type Recipe = {
  id: string
  cookbook_id: string
  title: string
  ingredients_text: string
  steps_text: string
  photo_url: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  notes: string | null
}

type ListItem = { id: string; text: string }
type StepItem = { id: string; text: string; spec: string; specOpen: boolean }

function makeId() {
  return Math.random().toString(36).slice(2)
}

// ---------- Ingredientes: texto <-> filas ----------
function textToList(text: string): ListItem[] {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return [{ id: makeId(), text: '' }]
  return lines.map((l) => ({ id: makeId(), text: l }))
}

function listToText(list: ListItem[]): string {
  return list
    .map((i) => i.text.trim())
    .filter((t) => t.length > 0)
    .join('\n')
}

// ---------- Pasos: texto <-> filas (con especificacion opcional) ----------
// Formato guardado: un paso por línea (sin separadores extra, para que el
// display siga leyendo "una línea = un paso"). Si el paso tiene
// especificación, va al final de la MISMA línea como "[spec: texto]".
const SPEC_TAG = /\[spec:\s*(.*?)\]/i

function textToSteps(text: string): StepItem[] {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return [{ id: makeId(), text: '', spec: '', specOpen: false }]

  return lines.map((line) => {
    let spec = ''
    let main = line
    const match = line.match(SPEC_TAG)
    if (match) {
      spec = match[1].trim()
      main = line.replace(match[0], '').trim()
    }
    main = main.replace(/^-\s*/, '').trim()
    return { id: makeId(), text: main, spec, specOpen: !!spec }
  })
}

function stepsToText(steps: StepItem[]): string {
  return steps
    .filter((s) => s.text.trim().length > 0)
    .map((s) => {
      const spec = s.spec.trim()
      return spec ? `${s.text.trim()} [spec: ${spec}]` : s.text.trim()
    })
    .join('\n')
}

// Nombre del bucket de Supabase Storage donde se guardan las fotos de recetas.
const PHOTO_BUCKET = 'recipe-photos'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const recipeId = params.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  const [title, setTitle] = useState('')
  const [ingredientsList, setIngredientsList] = useState<ListItem[]>([{ id: makeId(), text: '' }])
  const [stepsList, setStepsList] = useState<StepItem[]>([{ id: makeId(), text: '', spec: '', specOpen: false }])

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [prepTimeMin, setPrepTimeMin] = useState('')
  const [cookTimeMin, setCookTimeMin] = useState('')
  const [servings, setServings] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      // OJO: agregamos photo_url, prep_time_min, cook_time_min, servings y notes al select.
      // Ver notas al final del archivo si tu tabla todavía no tiene estas columnas.
      const { data, error } = await supabase
        .from('recipes')
        .select('id,cookbook_id,title,ingredients_text,steps_text,photo_url,prep_time_min,cook_time_min,servings,notes')
        .eq('id', recipeId)
        .single()

      if (error) {
        console.error(error)
        setRecipe(null)
      } else {
        const r = data as Recipe
        setRecipe(r)
        setTitle(r.title)
        setIngredientsList(textToList(r.ingredients_text))
        setStepsList(textToSteps(r.steps_text))
        setPhotoPreview(r.photo_url || null)

        setPrepTimeMin(r.prep_time_min != null ? String(r.prep_time_min) : '')
        setCookTimeMin(r.cook_time_min != null ? String(r.cook_time_min) : '')
        setServings(r.servings != null ? String(r.servings) : '')
        setNotes(r.notes != null ? String(r.notes) : '')
      }
      setLoading(false)
    }

    run()
  }, [recipeId])

  const ingredientsText = useMemo(() => listToText(ingredientsList), [ingredientsList])
  const stepsText = useMemo(() => stepsToText(stepsList), [stepsList])
  const isDirty = useMemo(() => {
    if (!recipe) return false
    const origPrep = recipe.prep_time_min != null ? String(recipe.prep_time_min) : ''
    const origCook = recipe.cook_time_min != null ? String(recipe.cook_time_min) : ''
    const origServings = recipe.servings != null ? String(recipe.servings) : ''
    const origNotes = recipe.notes != null ? String(recipe.notes) : ''
    return (
      title !== recipe.title ||
      ingredientsText !== recipe.ingredients_text ||
      stepsText !== recipe.steps_text ||
      photoFile !== null ||
      (photoPreview || null) !== (recipe.photo_url || null) ||
      prepTimeMin.trim() !== origPrep ||
      cookTimeMin.trim() !== origCook ||
      servings !== origServings ||
      notes !== origNotes
    )
  }, [recipe, title, ingredientsText, stepsText, photoFile, photoPreview, prepTimeMin, cookTimeMin, servings, notes])

  // ---------- Foto ----------
  const handlePhotoFile = (file: File) => {
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handlePhotoFile(file)
  }, [])

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${recipeId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  // ---------- Ingredientes ----------
  const updateIngredient = (id: string, text: string) => {
    setIngredientsList((list) => list.map((i) => (i.id === id ? { ...i, text } : i)))
  }
  const addIngredient = () => setIngredientsList((list) => [...list, { id: makeId(), text: '' }])
  const removeIngredient = (id: string) =>
    setIngredientsList((list) => (list.length > 1 ? list.filter((i) => i.id !== id) : list))

  // ---------- Pasos ----------
  const updateStep = (id: string, text: string) => {
    setStepsList((list) => list.map((s) => (s.id === id ? { ...s, text } : s)))
  }
  const addStep = () => setStepsList((list) => [...list, { id: makeId(), text: '', spec: '', specOpen: false }])
  const removeStep = (id: string) =>
    setStepsList((list) => (list.length > 1 ? list.filter((s) => s.id !== id) : list))

  const toggleStepSpec = (id: string) => {
    setStepsList((list) => list.map((s) => (s.id === id ? { ...s, specOpen: !s.specOpen } : s)))
  }
  const updateStepSpec = (id: string, spec: string) => {
    setStepsList((list) => list.map((s) => (s.id === id ? { ...s, spec } : s)))
  }
  const removeStepSpec = (id: string) => {
    setStepsList((list) => list.map((s) => (s.id === id ? { ...s, spec: '', specOpen: false } : s)))
  }

  const onCancel = () => {
    if (isDirty && !confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return
    if (recipe) router.push(`/recipe/${recipe.id}`)
    else router.push('/library')
  }

  const onSave = async () => {
    if (!recipe) return
    setSaving(true)
    setMsg('')

    try {
      let finalPhotoUrl: string | null = recipe.photo_url || null
      if (photoFile) {
        finalPhotoUrl = await uploadPhoto(photoFile)
      } else if (!photoPreview) {
        finalPhotoUrl = null
      }

      const { error } = await supabase
        .from('recipes')
        .update({
          title: title.trim(),
          ingredients_text: ingredientsText,
          steps_text: stepsText,
          photo_url: finalPhotoUrl,
          prep_time_min: prepTimeMin.trim() ? Number(prepTimeMin) : null,
          cook_time_min: cookTimeMin.trim() ? Number(cookTimeMin) : null,
          servings: servings.trim() ? Number(servings) : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipe.id)

      if (error) throw error

      router.push(`/recipe/${recipe.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al guardar.'
      setMsg(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <button
        className="flex items-center gap-2 text-sm font-medium hover:opacity-70"
        style={{ color: 'var(--ink)' }}
        onClick={onCancel}
        disabled={saving}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="mt-3">
        <h1 className="text-3xl font-bold title-font" style={{ color: 'var(--ink)' }}>
          Editar receta
        </h1>
        <p className="mt-1 text-base" style={{ color: 'var(--recipe-muted)' }}>
          {isDirty ? 'Tienes cambios sin guardar' : 'Haz cambios y guarda'}
        </p>
      </div>

      {loading ? (
        <p className="mt-8" style={{ color: 'var(--recipe-muted)' }}>
          Cargando…
        </p>
      ) : !recipe ? (
        <p className="mt-8" style={{ color: 'var(--recipe-muted)' }}>
          No encontré la receta.
        </p>
      ) : (
        <div className="mt-8 grid gap-6">
          {/* Nombre + Foto */}
          <section
            className="rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <label className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Nombre de la receta
            </label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3 text-lg"
              style={{ borderColor: 'var(--rule)' }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Mole de la abuela"
            />

            <label
              className="mt-6 flex items-center gap-2 text-lg font-semibold"
              style={{ color: 'var(--ink)' }}
            >
              <Upload className="w-4 h-4" style={{ color: '#ad8365' }} />
              Foto
            </label>

            {photoPreview ? (
              <div className="relative mt-2 rounded-lg overflow-hidden" style={{ maxHeight: 220 }}>
                <img
                  src={photoPreview}
                  alt="Vista previa"
                  className="w-full object-cover"
                  style={{ maxHeight: 220 }}
                />
                <button
                  className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  onClick={clearPhoto}
                  aria-label="Quitar foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  dragging ? 'border-[#ad8365] bg-[#ad8365]/10' : ''
                }`}
                style={{ borderColor: dragging ? undefined : 'var(--rule)' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="w-6 h-6" style={{ color: 'var(--recipe-muted)' }} />
                <p className="text-base text-center" style={{ color: 'var(--recipe-muted)' }}>
                  Toca aquí para elegir una foto
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handlePhotoFile(file)
                e.target.value = ''
              }}
            />
          </section>

          {/* Ingredientes: una casilla por ingrediente */}
          <section
            className="rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <label className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Ingredientes
            </label>
            <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
              Escribe un ingrediente en cada casilla.
            </p>

            <div className="mt-4 grid gap-3">
              {ingredientsList.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ background: 'var(--rule)', color: 'var(--ink)' }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    className="flex-1 rounded-xl border px-4 py-3 text-base"
                    style={{ borderColor: 'var(--rule)' }}
                    value={item.text}
                    onChange={(e) => updateIngredient(item.id, e.target.value)}
                    placeholder="Ej. 2 tazas de arroz"
                  />
                  <button
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl hover:bg-black/5 disabled:opacity-30"
                    onClick={() => removeIngredient(item.id)}
                    disabled={ingredientsList.length <= 1}
                    aria-label="Quitar ingrediente"
                  >
                    <Trash2 className="w-5 h-5" style={{ color: '#a33' }} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-base font-medium hover:bg-black/5"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              onClick={addIngredient}
            >
              <Plus className="w-5 h-5" />
              Agregar ingrediente
            </button>
          </section>

          {/* Pasos: una casilla por paso, con especificacion opcional */}
          <section
            className="rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <label className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              Pasos
            </label>
            <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
              Escribe un paso en cada casilla, en el orden en que se hacen.
            </p>

            <div className="mt-4 grid gap-4">
              {stepsList.map((item, idx) => (
                <div key={item.id} className="rounded-xl border" style={{ borderColor: 'var(--rule)' }}>
                  <div className="flex items-start gap-2 p-3">
                    <span
                      className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ background: 'var(--rule)', color: 'var(--ink)' }}
                    >
                      {idx + 1}
                    </span>
                    <textarea
                      className="flex-1 rounded-xl border px-4 py-3 text-base"
                      style={{ borderColor: 'var(--rule)', minHeight: 60 }}
                      value={item.text}
                      onChange={(e) => updateStep(item.id, e.target.value)}
                      placeholder="Ej. Cocer el pollo por 20 minutos"
                    />
                    <button
                      className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl hover:bg-black/5 disabled:opacity-30"
                      onClick={() => removeStep(item.id)}
                      disabled={stepsList.length <= 1}
                      aria-label="Quitar paso"
                    >
                      <Trash2 className="w-5 h-5" style={{ color: '#a33' }} />
                    </button>
                  </div>

                  {/* Especificacion opcional, como acordeon */}
                  <div className="px-3 pb-3 pl-14">
                    {item.specOpen ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: 'var(--recipe-muted)' }}>
                            ESPECIFICACIONES
                          </span>
                          <button
                            className="flex items-center gap-1 text-xs font-medium hover:opacity-70"
                            style={{ color: '#a33' }}
                            onClick={() => removeStepSpec(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Quitar
                          </button>
                        </div>
                        <input
                          className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
                          style={{ borderColor: 'var(--rule)' }}
                          value={item.spec}
                          onChange={(e) => updateStepSpec(item.id, e.target.value)}
                          placeholder="Ej. Horno a 180°C, tapado"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-sm font-medium hover:opacity-70"
                        style={{ color: 'var(--recipe-muted)' }}
                        onClick={() => toggleStepSpec(item.id)}
                      >
                        <ChevronDown className="w-4 h-4" />
                        Agregar especificación
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-base font-medium hover:bg-black/5"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              onClick={addStep}
            >
              <Plus className="w-5 h-5" />
              Agregar paso
            </button>
          </section>

          {/* Tiempos y porciones */}
          <section
            className="rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" style={{ color: '#ad8365' }} />
              <span className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Tiempos y porciones
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm" style={{ color: 'var(--recipe-muted)' }}>
                  Preparación (minutos)
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-base"
                  style={{ borderColor: 'var(--rule)' }}
                  value={prepTimeMin}
                  onChange={(e) => setPrepTimeMin(e.target.value)}
                  placeholder="30"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm" style={{ color: 'var(--recipe-muted)' }}>
                  Cocción (minutos)
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-base"
                  style={{ borderColor: 'var(--rule)' }}
                  value={cookTimeMin}
                  onChange={(e) => setCookTimeMin(e.target.value)}
                  placeholder="45"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                  <Users className="w-3.5 h-3.5" />
                  Porciones
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-base"
                  style={{ borderColor: 'var(--rule)' }}
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="4"
                  inputMode="numeric"
                />
              </div>
            </div>
          </section>

          {/* Notas */}
          <section
            className="rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <label
              className="flex items-center gap-2 text-lg font-semibold"
              style={{ color: 'var(--ink)' }}
            >
              <StickyNote className="w-4 h-4" style={{ color: '#ad8365' }} />
              Notas
            </label>
            <textarea
              className="mt-2 w-full rounded-xl border px-4 py-3 text-base"
              style={{ borderColor: 'var(--rule)', minHeight: 100 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trucos, sustituciones, historia de la receta..."
            />
          </section>

          {msg && <p style={{ color: '#a33' }}>{msg}</p>}

          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border px-5 py-3 text-base font-medium hover:opacity-70"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="rounded-xl px-5 py-3 text-base font-semibold text-white disabled:opacity-50"
              style={{ background: 'hsl(var(--primary))' }}
              onClick={onSave}
              disabled={saving || !isDirty}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

/*
NOTAS PARA QUE ESTO FUNCIONE:

1) Columnas nuevas en la tabla "recipes" (Supabase > SQL Editor), si te falta alguna:
     ALTER TABLE recipes ADD COLUMN IF NOT EXISTS photo_url text;
     ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_min integer;
     ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time_min integer;
     ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings integer;
     ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes text;
   (si alguna ya existe, "IF NOT EXISTS" evita error; tú ya tienes
   prep_time_min y cook_time_min, así que esas dos las puedes omitir)

2) Bucket de Storage para las fotos:
   Supabase > Storage > New bucket > nombre "recipe-photos" > público.
   Si tu bucket ya existe con otro nombre, cambia PHOTO_BUCKET arriba.

3) Formato de "Pasos" guardado en steps_text:
   Un paso por línea (sin separadores extra, para que el display siga
   leyendo cada línea como un paso). Si un paso tiene especificación,
   se agrega al final de esa MISMA línea como "[spec: texto]".
*/