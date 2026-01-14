'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

type Step = 1 | 2 | 3

type IngredientRow = {
  name: string
  amount: string
  unit: string
}

const UNIT_OPTIONS = [
  'pieza',
  'taza',
  'cda',
  'cdta',
  'g',
  'kg',
  'ml',
  'l',
  'pizca',
  'al gusto',
]

export default function NewRecipeWizard() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const cookbookId = params.id

  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('')
  const [ingredientsRows, setIngredientsRows] = useState<IngredientRow[]>([
    { name: '', amount: '', unit: 'pieza' },
  ])

  const addStepRow = () => {
  setStepsRows((rows) => [...rows, { text: '' }])
    }

    const removeStepRow = (idx: number) => {
  setStepsRows((rows) => rows.filter((_, i) => i !== idx))
    }

    const updateStepRow = (idx: number, text: string) => {
  setStepsRows((rows) =>
    rows.map((r, i) => (i === idx ? { text } : r))
  )
    }

const stepsToText = () => {
  const clean = stepsRows
    .map((r) => r.text.trim())
    .filter((t) => t.length > 0)

  return clean
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n')
}


  type StepRow = {
  text: string
    }

    const [stepsRows, setStepsRows] = useState<StepRow[]>([
    { text: '' },
    ])

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [familyId, setFamilyId] = useState<string | null>(null)

  useEffect(() => {
    setFamilyId(localStorage.getItem('active_family_id'))
  }, [])

  /* ---------------- INGREDIENTS HELPERS ---------------- */

  const addIngredientRow = () => {
    setIngredientsRows((rows) => [...rows, { name: '', amount: '', unit: 'pieza' }])
  }

  const removeIngredientRow = (idx: number) => {
    setIngredientsRows((rows) => rows.filter((_, i) => i !== idx))
  }

  const updateIngredientRow = (idx: number, patch: Partial<IngredientRow>) => {
    setIngredientsRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    )
  }

  const ingredientsToText = () => {
  const clean = ingredientsRows
    .map((r) => ({
      name: r.name.trim(),
      amount: r.amount.trim(),
      unit: r.unit.trim(),
    }))
    .filter((r) => r.name.length > 0)

  return clean
    .map((r) => {
      // Si no hay cantidad, solo ponemos el ingrediente
      if (!r.amount) return `- ${r.name}`

      // Si hay cantidad pero no unidad, "10 de Harina" (raro pero válido)
      if (!r.unit) return `- ${r.amount} de ${r.name}`

      // Unidad pegada (g, kg, ml, l) -> "10g de Harina"
      const compactUnits = new Set(['g', 'kg', 'ml', 'l'])
      const qtyUnit = compactUnits.has(r.unit)
        ? `${r.amount}${r.unit}`
        : `${r.amount} ${r.unit}`

      // "10g de Harina" / "2 tazas de Harina"
      return `- ${qtyUnit} de ${r.name}`
    })
    .join('\n')
}

  /* ---------------- NAVIGATION ---------------- */

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s))
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))

  /* ---------------- SAVE ---------------- */

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

      const ingredientsText = ingredientsToText()
      if (!ingredientsText.trim()) throw new Error('Agrega al menos un ingrediente.')

      const stepsTextFinal = stepsToText()
      if (!stepsTextFinal.trim()) throw new Error('Agrega al menos un paso.')

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
        })
        .select('id')
        .single()

      if (error) throw error

      router.push(`/recipe/${data.id}`)
    } catch (e: unknown) {
      if (e instanceof Error) setMsg(e.message)
      else setMsg('Ocurrió un error inesperado')
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-900">
      <button
        className="text-sm text-slate-100 hover:underline"
        onClick={() => router.push(`/cookbook/${cookbookId}`)}
      >
        ← Volver al recetario
      </button>

      <h1 className="mt-3 text-3xl font-bold">Nueva receta</h1>
      <p className="mt-2 text-slate-800">Paso {step} de 3</p>

      <div className="mt-4 flex gap-2">
        <button
            className="rounded-xl border bg-white px-4 py-3 text-slate-900 hover:bg-slate-50"
            onClick={() => router.push(`/cookbook/${cookbookId}`)}
        >
            ← Volver al recetario
        </button>
      </div>


      <div className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
        {/* Header */}
        <div className="border-b bg-slate-100 px-6 py-4 text-sm font-semibold text-slate-800">
          Recetario familiar
        </div>

        {/* Pages */}
        <div className="relative h-105 overflow-hidden">
          <div
            className="absolute inset-0 flex w-[300%] transition-transform duration-500"
            style={{ transform: `translateX(${-(step - 1) * (100 / 3)}%)` }}
          >
            {/* PAGE 1 */}
            <section className="w-1/3 h-105 overflow-y-auto p-8">
              <h2 className="text-2xl font-bold">1) Nombre</h2>
              <p className="mt-2 text-slate-800">
                Escribe el nombre de la receta.
              </p>

              <label className="mt-6 block text-base font-semibold">
                Nombre de la receta
              </label>
              <input
                className="mt-2 w-full rounded-xl border px-4 py-3 text-lg"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Ej. "Mole de la abuela"'
              />
            </section>

            {/* PAGE 2 */}
            <section className="w-1/3 h-105 overflow-y-auto p-8">
            <h2 className="text-2xl font-bold text-slate-900">
                2) Ingredientes
            </h2>

             <p className="mt-2 text-slate-800">
              Agrega los ingredientes uno por uno.
             </p>

            <div className="mt-6 rounded-2xl border bg-white p-4">
              {/* Encabezados */}
              <div className="mb-3 grid grid-cols-12 gap-2 text-sm font-semibold text-slate-900">
               <div className="col-span-6">Ingrediente</div>
                <div className="col-span-3">Cantidad</div>
                 <div className="col-span-3">Unidad</div>
              </div>

               {/* Filas */}
                <div className="grid gap-3">
                {ingredientsRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                    {/* Ingrediente */}
                    <input
                        className="col-span-6 rounded-xl border px-3 py-3 text-base text-slate-900"
                        placeholder="Ej. Harina"
                        value={row.name}
                        onChange={(e) =>
                        updateIngredientRow(idx, { name: e.target.value })
                        }
                    />

                    {/* Cantidad */}
                    <input
                        className="col-span-3 rounded-xl border px-3 py-3 text-base text-slate-900"
                        placeholder="Ej. 2"
                        value={row.amount}
                        onChange={(e) =>
                        updateIngredientRow(idx, { amount: e.target.value })
                        }
                        inputMode="decimal"
                    />

                    {/* Unidad */}
                    <select
                        className="col-span-3 rounded-xl border px-3 py-3 text-base text-slate-900"
                        value={row.unit}
                        onChange={(e) =>
                        updateIngredientRow(idx, { unit: e.target.value })
                        }
                    >
                        {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                            {u}
                        </option>
                        ))}
                    </select>

                    {/* Quitar */}
                    {ingredientsRows.length > 1 && (
                        <button
                        type="button"
                        className="col-span-12 text-left text-sm text-rose-700 hover:underline"
                        onClick={() => removeIngredientRow(idx)}
                        >
                        Quitar ingrediente
                        </button>
                    )}
                    </div>
                ))}
                </div>

                {/* Agregar */}
                <div className="mt-4">
                <button
                 type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
                    onClick={addIngredientRow}
                >
                    + Agregar ingrediente
                </button>
                </div>

                <p className="mt-3 text-sm text-slate-800">
                Tip: si no sabes la cantidad exacta, puedes dejarla en blanco o usar “al gusto”.
                </p>
            </div>
            </section>


        {/* PAGE 3 */}
        <section className="w-1/3 h-105 overflow-y-auto p-8 pb-24">
        <h2 className="text-2xl font-bold text-slate-900">3) Instrucciones</h2>

        <p className="mt-2 text-slate-800">
            Agrega los pasos en orden.
        </p>

        <div className="mt-6 rounded-2xl border bg-white p-4">
            <div className="mb-3 flex justify-between">
            <span className="font-semibold text-slate-900">Pasos</span>
            </div>

            <div className="grid gap-3">
            {stepsRows.map((row, idx) => (
                <div key={idx} className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">
                    Paso {idx + 1}
                </label>

                <textarea
                    className="w-full rounded-xl border px-4 py-3 text-base text-slate-900"
                    placeholder="Ej. Precalentar el horno a 180°C"
                    value={row.text}
                    onChange={(e) => updateStepRow(idx, e.target.value)}
                    rows={3}
                />

                {stepsRows.length > 1 && (
                    <button
                    type="button"
                    className="text-left text-sm text-rose-700 hover:underline"
                    onClick={() => removeStepRow(idx)}
                    >
                    Quitar este paso
                    </button>
                )}
                </div>
            ))}
            </div>

            <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-4 py-3 text-base text-white hover:opacity-90"
                        onClick={addStepRow}
                    >
                        + Agregar otro paso
                    </button>
            </div>

            <p className="mt-3 text-sm text-slate-800">
            Tip: escribe los pasos como se los explicarías a alguien más.
            </p>
        </div>
        </section>
        </div>
        </div>


        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-slate-100 px-6 py-4">
          <button
            className="rounded-xl border bg-white px-4 py-3 disabled:opacity-50"
            onClick={back}
            disabled={step === 1 || saving}
          >
            ← Atrás
          </button>

          {msg && <span className="text-rose-600">{msg}</span>}

          {step < 3 ? (
            <button
              className="rounded-xl bg-slate-900 px-4 py-3 text-white"
              onClick={next}
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="rounded-xl bg-emerald-600 px-4 py-3 text-white"
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
