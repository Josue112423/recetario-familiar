'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, UploadCloud, Plus, Trash2 } from 'lucide-react'

/* ─── Types ─────────────────────────────────────────── */
type WizardStep = 1 | 2 | 3 | 4

type IngredientRow = { name: string; amount: string; unit: string }
type StepRow = { text: string; spec: string }

const UNIT_OPTIONS = ['pieza', 'taza', 'cda', 'cdta', 'g', 'kg', 'ml', 'l', 'pizca', 'al gusto']

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Nombre y foto',
  2: 'Ingredientes',
  3: 'Instrucciones',
  4: 'Detalles',
}

/* ─── Helpers ───────────────────────────────────────── */
function ingredientsToText(rows: IngredientRow[]) {
  const compact = new Set(['g', 'kg', 'ml', 'l'])
  return rows
    .filter((r) => r.name.trim())
    .map((r) => {
      const name = r.name.trim()
      const amt = r.amount.trim()
      const unit = r.unit.trim()
      if (!amt) return `- ${name}`
      if (!unit) return `- ${amt} de ${name}`
      const qty = compact.has(unit) ? `${amt}${unit}` : `${amt} ${unit}`
      return `- ${qty} de ${name}`
    })
    .join('\n')
}

function stepsToText(rows: StepRow[]) {
  return rows
    .filter((r) => r.text.trim())
    .map((r) => {
      const base = r.text.trim()
      return r.spec.trim() ? `${base} [spec: ${r.spec.trim()}]` : base
    })
    .join('\n')
}

/* ─── Component ─────────────────────────────────────── */
export default function NewRecipeWizard() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const cookbookId = params.id

  /* wizard state */
  const [step, setStep] = useState<WizardStep>(1)

  /* step 1 */
  const [title, setTitle] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* step 2 */
  const [ingredientsRows, setIngredientsRows] = useState<IngredientRow[]>([
    { name: '', amount: '', unit: 'pieza' },
  ])

  /* step 3 */
  const [stepsRows, setStepsRows] = useState<StepRow[]>([{ text: '', spec: '' }])

  /* step 4 */
  const [prepValue, setPrepValue] = useState('')
  const [prepUnit, setPrepUnit] = useState('min')
  const [cookValue, setCookValue] = useState('')
  const [cookUnit, setCookUnit] = useState('min')
  const [servings, setServings] = useState('')
  const [notes, setNotes] = useState('')

  /* misc */
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setFamilyId(localStorage.getItem('active_family_id'))
  }, [])

  /* ── Ingredient helpers ── */
  const addIngredientRow = () =>
    setIngredientsRows((r) => [...r, { name: '', amount: '', unit: 'pieza' }])
  const removeIngredientRow = (i: number) =>
    setIngredientsRows((r) => r.filter((_, idx) => idx !== i))
  const updateIngredientRow = (i: number, patch: Partial<IngredientRow>) =>
    setIngredientsRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  /* ── Step helpers ── */
  const addStepRow = () => setStepsRows((r) => [...r, { text: '', spec: '' }])
  const removeStepRow = (i: number) => setStepsRows((r) => r.filter((_, idx) => idx !== i))
  const updateStepRow = (i: number, patch: Partial<StepRow>) =>
    setStepsRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

  /* ── Navigation ── */
  const next = () => setStep((s) => (s < 4 ? ((s + 1) as WizardStep) : s))
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))

  /* ── Save ── */
  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const fid = familyId || localStorage.getItem('active_family_id')
      if (!fid) throw new Error('No encontré familia activa.')

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) throw new Error('No hay sesión activa.')
      if (!title.trim()) throw new Error('Pon el nombre de la receta.')

      const ingredientsText = ingredientsToText(ingredientsRows)
      if (!ingredientsText.trim()) throw new Error('Agrega al menos un ingrediente.')

      const stepsTextFinal = stepsToText(stepsRows)
      if (!stepsTextFinal.trim()) throw new Error('Agrega al menos un paso.')

      const metaLeft = prepValue ? `${prepValue} ${prepUnit}` : null
      const metaMid = cookValue ? `${cookValue} ${cookUnit}` : null
      const metaRight = servings.trim() || null

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          family_id: fid,
          cookbook_id: cookbookId,
          author_id: user.id,
          title: title.trim(),
          photo_url: null,
          ingredients_text: ingredientsText,
          steps_text: stepsTextFinal,
          meta_left: metaLeft,
          meta_mid: metaMid,
          meta_right: metaRight,
          notes: notes.trim() || null,
        })
        .select('id')
        .single()

      if (error) throw error
      const recipeId = data.id as string

      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const path = `${fid}/${recipeId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('recipe-photos')
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type || 'image/jpeg' })
        if (upErr) throw upErr

        const { data: pub } = supabase.storage.from('recipe-photos').getPublicUrl(path)
        await supabase.from('recipes').update({ photo_url: pub.publicUrl }).eq('id', recipeId)
      }

      router.push(`/recipe/${recipeId}`)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Ocurrió un error inesperado')
    } finally {
      setSaving(false)
    }
  }

  /* ── Drag-over for photo ── */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('image/')) {
      setPhotoFile(f)
      setPhotoPreview(URL.createObjectURL(f))
    }
  }

  /* ─────────────────────────── UI ────────────────────── */
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">

      {/* Back link */}
      <button
        className="flex items-center gap-1.5 text-sm mb-5 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--recipe-muted)' }}
        onClick={() => router.push(`/cookbook/${cookbookId}`)}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al recetario
      </button>

      {/* Title + step label */}
      <h1 className="title-font text-3xl md:text-4xl font-bold" style={{ color: 'var(--ink)' }}>
        Nueva receta
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
        Paso {step} de 4 — {STEP_LABELS[step]}
      </p>

      {/* Progress bar */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {([1, 2, 3, 4] as WizardStep[]).map((s) => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              background: s <= step
                ? 'hsl(var(--primary))'
                : 'rgba(40,35,30,0.14)',
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="mt-6 watercolor-paper warm-glow rounded-[24px] border overflow-hidden"
        style={{ borderColor: 'var(--rule)' }}
      >
        {/* Card header */}
        <div
          className="px-6 py-3 border-b text-xs font-semibold tracking-widest uppercase"
          style={{
            borderColor: 'var(--rule)',
            color: 'var(--recipe-muted)',
            background: 'rgba(40,35,30,0.03)',
            fontFamily: "'Comfortaa', cursive",
          }}
        >
          Recetario familiar
        </div>

        {/* Step content */}
        <div className="p-6 md:p-10 min-h-[420px]">

          {/* ── STEP 1: Nombre y foto ── */}
          {step === 1 && (
            <div>
              <h2 className="title-font text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Nombre y foto
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Escribe el nombre y agrega una foto de la receta.
              </p>

              <label className="mt-8 block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Nombre de la receta
              </label>
              <input
                className="planner-input mt-2 w-full py-2 text-base"
                style={{ color: 'var(--ink)' }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Ej. "Mole de la abuela"'
              />

              <label className="mt-8 block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Foto (opcional)
              </label>

              {/* Drop zone */}
              <div
                className="mt-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
                style={{
                  borderColor: 'rgba(173,131,101,0.35)',
                  background: 'rgba(173,131,101,0.04)',
                  minHeight: photoPreview ? 'auto' : '180px',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {photoPreview ? (
                  <div className="relative w-full overflow-hidden rounded-xl">
                    <Image
                      src={photoPreview}
                      alt="Vista previa"
                      width={800}
                      height={500}
                      className="w-full h-auto object-cover max-h-72"
                    />
                    <button
                      type="button"
                      className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                    <div
                      className="rounded-full p-3"
                      style={{ background: 'rgba(173,131,101,0.12)' }}
                    >
                      <UploadCloud className="w-6 h-6" style={{ color: 'var(--recipe-muted)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      Sube una foto de tu platillo
                    </p>
                    <p className="text-xs" style={{ color: 'var(--recipe-muted)' }}>
                      Arrastra una imagen o toca para seleccionar
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setPhotoFile(f)
                  setPhotoPreview(f ? URL.createObjectURL(f) : null)
                }}
              />
            </div>
          )}

          {/* ── STEP 2: Ingredientes ── */}
          {step === 2 && (
            <div>
              <h2 className="title-font text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Ingredientes
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Agrega los ingredientes uno por uno.
              </p>

              <div className="mt-6 space-y-3">
                {/* Headers */}
                <div
                  className="grid gap-2 text-xs font-bold tracking-wider uppercase"
                  style={{
                    gridTemplateColumns: '1fr 100px 110px 32px',
                    color: 'var(--recipe-muted)',
                  }}
                >
                  <div>Ingrediente</div>
                  <div>Cantidad</div>
                  <div>Unidad</div>
                  <div />
                </div>

                {ingredientsRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 items-center"
                    style={{ gridTemplateColumns: '1fr 100px 110px 32px' }}
                  >
                    <input
                      className="planner-input py-2 text-sm w-full"
                      style={{ color: 'var(--ink)' }}
                      placeholder="Ej. Harina"
                      value={row.name}
                      onChange={(e) => updateIngredientRow(idx, { name: e.target.value })}
                    />
                    <input
                      className="planner-input py-2 text-sm w-full"
                      style={{ color: 'var(--ink)' }}
                      placeholder="Ej. 2"
                      value={row.amount}
                      inputMode="decimal"
                      onChange={(e) => updateIngredientRow(idx, { amount: e.target.value })}
                    />
                    <select
                      className="planner-input py-2 text-sm w-full"
                      style={{ color: 'var(--ink)' }}
                      value={row.unit}
                      onChange={(e) => updateIngredientRow(idx, { unit: e.target.value })}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    {ingredientsRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(idx)}
                        className="flex items-center justify-center rounded-full w-7 h-7 transition-colors hover:bg-rose-50"
                        style={{ color: 'var(--recipe-muted)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : <div />}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addIngredientRow}
                className="mt-5 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  borderColor: 'rgba(173,131,101,0.4)',
                  color: 'var(--ink)',
                  background: 'rgba(173,131,101,0.06)',
                }}
              >
                <Plus className="w-4 h-4" />
                Agregar ingrediente
              </button>

              <p className="mt-4 text-xs italic" style={{ color: 'var(--recipe-muted)' }}>
                Tip: si no sabes la cantidad exacta, puedes dejarla en blanco o usar al gusto.
              </p>
            </div>
          )}

          {/* ── STEP 3: Instrucciones ── */}
          {step === 3 && (
            <div>
              <h2 className="title-font text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Instrucciones
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Agrega los pasos en orden. Puedes agregar especificaciones opcionales a cada paso.
              </p>

              <div className="mt-6 space-y-4">
                {stepsRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border p-4"
                    style={{ borderColor: 'var(--rule)', background: 'rgba(255,255,255,0.4)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                        Paso {idx + 1}
                      </span>
                      {stepsRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStepRow(idx)}
                          className="rounded-full p-1 hover:bg-rose-50 transition-colors"
                          style={{ color: 'var(--recipe-muted)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <textarea
                      className="planner-input w-full text-sm py-2 resize-none"
                      style={{ color: 'var(--ink)', minHeight: '80px' }}
                      placeholder="Ej. Precalentar el horno a 180 C"
                      value={row.text}
                      onChange={(e) => updateStepRow(idx, { text: e.target.value })}
                      rows={3}
                    />

                    <label
                      className="mt-3 block text-xs font-semibold"
                      style={{ color: 'var(--recipe-muted)' }}
                    >
                      Especificaciones (opcional)
                    </label>
                    <input
                      className="planner-input mt-1 w-full text-sm py-1.5"
                      style={{ color: 'var(--ink)' }}
                      placeholder="Ej. Temperatura: 180°C, Tiempo: 15 min"
                      value={row.spec}
                      onChange={(e) => updateStepRow(idx, { spec: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addStepRow}
                className="mt-4 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  borderColor: 'rgba(173,131,101,0.4)',
                  color: 'var(--ink)',
                  background: 'rgba(173,131,101,0.06)',
                }}
              >
                <Plus className="w-4 h-4" />
                Agregar otro paso
              </button>

              <p className="mt-4 text-xs italic" style={{ color: 'var(--recipe-muted)' }}>
                Tip: escribe los pasos como se los explicarías a alguien más.
              </p>
            </div>
          )}

          {/* ── STEP 4: Detalles ── */}
          {step === 4 && (
            <div>
              <h2 className="title-font text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                Detalles
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Agrega informacion adicional sobre la receta.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-6">
                {/* Prep */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Tiempo de preparacion
                  </label>
                  <div className="flex gap-2 items-end">
                    <input
                      className="planner-input flex-1 py-2 text-sm"
                      style={{ color: 'var(--ink)' }}
                      placeholder="Ej. 30"
                      inputMode="numeric"
                      value={prepValue}
                      onChange={(e) => setPrepValue(e.target.value)}
                    />
                    <select
                      className="planner-input py-2 text-sm"
                      style={{ color: 'var(--ink)', width: '72px' }}
                      value={prepUnit}
                      onChange={(e) => setPrepUnit(e.target.value)}
                    >
                      <option value="min">min</option>
                      <option value="hr">hr</option>
                    </select>
                  </div>
                </div>

                {/* Cook */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    Tiempo de coccion
                  </label>
                  <div className="flex gap-2 items-end">
                    <input
                      className="planner-input flex-1 py-2 text-sm"
                      style={{ color: 'var(--ink)' }}
                      placeholder="Ej. 45"
                      inputMode="numeric"
                      value={cookValue}
                      onChange={(e) => setCookValue(e.target.value)}
                    />
                    <select
                      className="planner-input py-2 text-sm"
                      style={{ color: 'var(--ink)', width: '72px' }}
                      value={cookUnit}
                      onChange={(e) => setCookUnit(e.target.value)}
                    >
                      <option value="min">min</option>
                      <option value="hr">hr</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Servings */}
              <div className="mt-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  Porciones
                </label>
                <input
                  className="planner-input w-full py-2 text-sm"
                  style={{ color: 'var(--ink)' }}
                  placeholder="Ej. 4 personas"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                  Notas (opcional)
                </label>
                <textarea
                  className="planner-input w-full py-2 text-sm resize-none"
                  style={{ color: 'var(--ink)', minHeight: '100px' }}
                  placeholder="Ej. Esta receta es de mi abuela, se hace mejor con chocolate de Oaxaca..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: 'var(--rule)', background: 'rgba(40,35,30,0.03)' }}
        >
          <button
            className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-30"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)', background: 'var(--paper)' }}
            onClick={back}
            disabled={step === 1 || saving}
          >
            Atras
          </button>

          {msg && (
            <span className="text-sm text-rose-600 text-center flex-1 px-4">{msg}</span>
          )}

          {step < 4 ? (
            <button
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'hsl(var(--primary))' }}
              onClick={next}
            >
              Siguiente
            </button>
          ) : (
            <button
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'hsl(var(--primary))' }}
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar receta'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}