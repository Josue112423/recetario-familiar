'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

type Recipe = {
  id: string
  cookbook_id: string
  title: string
  photo_url: string | null
  ingredients_text: string
  steps_text: string
  created_at: string
}

export default function RecipePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const recipeId = params.id

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('recipes')
        .select('id,cookbook_id,title,photo_url,ingredients_text,steps_text,created_at')
        .eq('id', recipeId)
        .single()

      if (error) console.error(error)
      setRecipe((data ?? null) as Recipe | null)
      setLoading(false)
    }
    run()
  }, [recipeId])

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {loading ? (
        <p className="text-slate-800">Cargando…</p>
      ) : !recipe ? (
        <p className="text-slate-800">No encontré la receta.</p>
      ) : (
        <>
          <button
            className="text-sm text-slate-100 hover:underline"
            onClick={() => router.push(`/cookbook/${recipe.cookbook_id}`)}
          >
            ← Volver al recetario
          </button>

          <h1 className="mt-3 text-3xl font-bold">{recipe.title}</h1>
          <p className="mt-2 text-slate-100">{new Date(recipe.created_at).toLocaleString()}</p>

          <button
            className="ml-4 rounded-xl border  text-slate-700 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => router.push(`/recipe/${recipe.id}/edit`)}
            >
             Editar
          </button>

          <button
            className="ml-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:opacity-90"
            onClick={() => router.push(`/recipe/${recipe.id}/cook`)}
            >
            Seguir receta
          </button>

          {recipe.photo_url && (
            <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
              <Image
                src={recipe.photo_url}
                alt={`Foto de ${recipe.title}`}
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          )}

          <div className="mt-8 grid gap-6">
            <section className="rounded-2xl border text-slate-700 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Ingredientes</h2>
              <pre className="mt-3 whitespace-pre-wrap text-base text-slate-700">{recipe.ingredients_text}</pre>
            </section>

            <section className="rounded-2xl border text-slate-700 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Pasos</h2>
              <pre className="mt-3 whitespace-pre-wrap text-base text-slate-700">{recipe.steps_text}</pre>
            </section>
          </div>
        </>
      )}
    </main>
  )
}
