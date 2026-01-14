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

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const recipeId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [recipe, setRecipe] = useState<Recipe | null>(null)

  // campos editables
  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState('')

  const isDirty = useMemo(() => {
    if (!recipe) return false
    return title !== recipe.title || ingredients !== recipe.ingredients_text || steps !== recipe.steps_text
  }, [recipe, title, ingredients, steps])

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
      } else {
        const r = data as Recipe
        setRecipe(r)
        setTitle(r.title)
        setIngredients(r.ingredients_text)
        setSteps(r.steps_text)
      }
      setLoading(false)
    }

    run()
  }, [recipeId])

  const onCancel = () => {
    if (isDirty && !confirm('Tienes cambios sin guardar. ¿Salir sin guardar?')) return
    if (recipe) router.push(`/recipe/${recipe.id}`)
    else router.push('/library')
  }

  const onSave = async () => {
    if (!recipe) return
    setSaving(true)
    setMsg('')

    const { error } = await supabase
      .from('recipes')
      .update({
        title: title.trim(),
        ingredients_text: ingredients.trim(),
        steps_text: steps.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipe.id)

    if (error) {
      setMsg(error.message)
      setSaving(false)
      return
    }

    router.push(`/recipe/${recipe.id}`)
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Editar receta</h1>
          <p className="mt-2 text-slate-800">Haz cambios y guarda.</p>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-xl border bg-white px-4 py-3 hover:bg-slate-50"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:opacity-90 disabled:opacity-50"
            onClick={onSave}
            disabled={saving || !recipe}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-slate-800">Cargando…</p>
      ) : !recipe ? (
        <p className="mt-8 text-slate-800">No encontré la receta.</p>
      ) : (
        <div className="mt-8 grid gap-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <label className="text-base font-semibold">Nombre</label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3 text-lg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <label className="text-base font-semibold">Ingredientes</label>
            <textarea
              className="mt-2 h-48 w-full rounded-xl border px-4 py-3"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
            />
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <label className="text-base font-semibold">Pasos</label>
            <textarea
              className="mt-2 h-56 w-full rounded-xl border px-4 py-3"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </section>

          {msg && <p className="text-rose-700">{msg}</p>}
          {isDirty && <p className="text-slate-800">Tienes cambios sin guardar.</p>}
        </div>
      )}
    </main>
  )
}
