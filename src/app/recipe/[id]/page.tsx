'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { RecipeSheet } from '@/components/RecipeSheet'


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

          <RecipeSheet
             title={recipe.title}
              photoUrl={recipe.photo_url}
             metaLeft="15 min"
             metaMid="10–12 min"
             metaRight="—"
             ingredients={recipe.ingredients_text}
             steps={recipe.steps_text}
             notes="Tip: si te gusta más salado, agrega una pizca extra."
            />
        </>
      )}
    </main>
  )
}
