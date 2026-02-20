'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { RecipeSheet } from '@/components/RecipeSheet'

type Recipe = {
  id: string
  cookbook_id: string
  title: string
  photo_url: string | null
  ingredients_text: string
  steps_text: string
  prep_time_min: number | null
  cook_time_min: number | null
  servings: string | null
  created_at: string
}

function formatTime(minutes: number | null): string | null {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
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
        .select('id,cookbook_id,title,photo_url,ingredients_text,steps_text,prep_time_min,cook_time_min,servings,created_at')
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
        <p style={{ color: 'var(--recipe-muted)' }}>Cargando…</p>
      ) : !recipe ? (
        <p style={{ color: 'var(--recipe-muted)' }}>No encontré la receta.</p>
      ) : (
        <>
          <button
            className="mb-6 flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'var(--recipe-muted)' }}
            onClick={() => router.push(`/cookbook/${recipe.cookbook_id}`)}
          >
            ← Volver al recetario
          </button>

          <RecipeSheet
            title={recipe.title}
            photoUrl={recipe.photo_url}
            metaLeft={formatTime(recipe.prep_time_min)}
            metaMid={formatTime(recipe.cook_time_min)}
            metaRight={recipe.servings ?? null}
            ingredients={recipe.ingredients_text}
            steps={recipe.steps_text}
            notes={null}
            onEdit={() => router.push(`/recipe/${recipe.id}/edit`)}
            onCook={() => router.push(`/recipe/${recipe.id}/cook`)}
          />
        </>
      )}
    </main>
  )
}