'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, BookOpen, Clock } from 'lucide-react'

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
  const [q, setQ] = useState('')

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return recipes
    return recipes.filter((r) => r.title.toLowerCase().includes(s))
  }, [recipes, q])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="planner-card watercolor-paper warm-glow rounded-[24px] border p-6 md:p-8 relative overflow-hidden">
        {/* decor (si existen en /public/attached_assets) */}

        <div className="relative z-[20]">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                className="inline-flex items-center gap-2 text-sm hover:underline"
                onClick={() => router.push('/library')}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a biblioteca
              </button>

              <div className="mt-3 flex items-center gap-2">
                <BookOpen className="h-6 w-6 opacity-70" />
                <h1 className="text-3xl md:text-4xl title-font">
                  {cookbook?.title ?? 'Recetario'}
                </h1>
              </div>

              <p className="mt-2 handwritten text-base" style={{ color: 'var(--recipe-muted)' }}>
                Índice de recetas
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white"
                style={{ background: 'hsl(var(--primary))' }}
                onClick={() => router.push(`/cookbook/${cookbookId}/new-recipe`)}
              >
                <Plus className="h-4 w-4" />
                Agregar receta
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 flex items-center gap-2 rounded-2xl border px-4 py-3"
               style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}>
            <Search className="h-4 w-4 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar receta…"
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: 'var(--ink)' }}
            />
          </div>

          {/* Content */}
          <div className="mt-6">
            {loading ? (
              <p style={{ color: 'var(--recipe-muted)' }}>Cargando…</p>
            ) : filtered.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-8 text-center"
                style={{
                  borderColor: 'var(--rule)',
                  color: 'var(--recipe-muted)',
                  background: 'rgba(255,255,255,0.25)',
                }}
              >
                {recipes.length === 0
                  ? 'Este recetario todavía no tiene recetas. Agrega la primera ✨'
                  : 'No encontré recetas con ese nombre.'}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r) => (
                  <div key={r.id} className="recipe-card-container">
                    {/* Delete button (solo visible al hover por tu CSS .recipe-card-delete) */}
                    <button
                      className="recipe-card-delete"
                      onClick={() => deleteRecipe(r.id)}
                      aria-label="Eliminar receta"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                      className="recipe-card w-full text-left"
                      onClick={() => router.push(`/recipe/${r.id}`)}
                      aria-label={`Abrir receta ${r.title}`}
                    >
                      <div className="recipe-card-hero">
                        {/* placeholder bonito */}
                        <div className="recipe-card-hero-placeholder">
                          <span className="handwritten text-sm" style={{ color: 'var(--recipe-muted)' }}>
                            {r.title.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                        <div className="recipe-card-hero-fade" />
                      </div>

                      <div className="recipe-card-body">
                        <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                          {r.title}
                        </div>

                        <div className="mt-2 recipe-card-meta">
                          <Clock className="h-3.5 w-3.5 opacity-60" />
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Maceta (si existe). La dejamos al frente y casi al nivel del estante si luego lo agregas aquí */}
       
      </section>
    </main>
  )
}
