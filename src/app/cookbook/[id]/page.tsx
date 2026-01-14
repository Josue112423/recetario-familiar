'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'

type Recipe = {
  id: string
  title: string
  created_at: string
}

type Cookbook = {
  id: string
  title: string
}

export default function CookbookPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const cookbookId = params.id

  const [cookbook, setCookbook] = useState<Cookbook | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  const deleteRecipe = async (recipeId: string) => {
  if (!confirm('¿Eliminar esta receta? Esto no se puede deshacer.')) return

  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
  if (error) {
    alert('No se pudo eliminar. ' + error.message)
    return
  }
  setRecipes((prev) => prev.filter((r) => r.id !== recipeId))
}

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const { data: cb, error: cbErr } = await supabase
        .from('cookbooks')
        .select('id,title')
        .eq('id', cookbookId)
        .single()

      if (cbErr) console.error(cbErr)
      setCookbook(cb ?? null)

      const { data: rs, error: rErr } = await supabase
        .from('recipes')
        .select('id,title,created_at')
        .eq('cookbook_id', cookbookId)
        .order('created_at', { ascending: false })

      if (rErr) console.error(rErr)
      setRecipes((rs ?? []) as Recipe[])

      setLoading(false)
    }

    run()
  }, [cookbookId])

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button className="text-sm text-slate-100 hover:underline" onClick={() => router.push('/library')}>
            ← Volver a biblioteca
          </button>
          <h1 className="mt-3 text-3xl font-bold">{cookbook?.title ?? 'Recetario'}</h1>
          <p className="mt-2 text-slate-100">Índice de recetas</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:opacity-90"
          onClick={() => router.push(`/cookbook/${cookbookId}/new-recipe`)}
        >
          + Agregar receta
        </button>
      </div>

      <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-slate-800">Cargando…</p>
        ) : recipes.length === 0 ? (
          <p className="text-slate-800">Este recetario todavía no tiene recetas. Agrega la primera ✨</p>
        ) : (
          <ul className="divide-y">
            {recipes.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-center justify-between gap-3">
                    <button
                        className="flex-1 rounded-lg px-2 py-2 text-left text-slate-900 hover:bg-slate-100 hover:underline"
                        onClick={() => router.push(`/recipe/${r.id}`)}
                    >
                     <div className="text-lg font-semibold">{r.title}</div>
                     <div className="text-sm text-slate-700">{new Date(r.created_at).toLocaleString()}</div>
                    </button>

                    <button
                        className="rounded-xl border px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                        onClick={() => deleteRecipe(r.id)}
                    >
                        Eliminar
                    </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
