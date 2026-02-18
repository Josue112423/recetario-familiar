'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, Clock } from 'lucide-react'

type Recipe = {
  id: string
  title: string
  created_at: string
  folder_id: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  difficulty: string | null
}

type RecipeFolder = {
  id: string
  name: string
  parent_folder_id: string | null
}

export default function CookbookPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const cookbookId = params.id

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [folders, setFolders] = useState<RecipeFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const [folderStack, setFolderStack] = useState<string[]>([])
  const activeFolderId = folderStack.at(-1) ?? null

  const [draggingRecipeId, setDraggingRecipeId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [dragOverRemove, setDragOverRemove] = useState(false)

  const refresh = async () => {
    const { data: rs } = await supabase
      .from('recipes')
      .select('id,title,created_at,folder_id,prep_time_min,cook_time_min,servings,difficulty')
      .eq('cookbook_id', cookbookId)
      .order('created_at', { ascending: false })

    const { data: fs } = await supabase
      .from('recipe_folders')
      .select('id,name,parent_folder_id')
      .eq('cookbook_id', cookbookId)

    setRecipes((rs ?? []) as Recipe[])
    setFolders((fs ?? []) as RecipeFolder[])
  }

  useEffect(() => {
  const run = async () => {
    setLoading(true)
    await refresh()
    setLoading(false)
  }

  run()
}, [cookbookId])

  const totalMinutes = (r: Recipe) =>
    (r.prep_time_min ?? 0) + (r.cook_time_min ?? 0)

  const difficultyIcons = (d?: string | null) => {
    if (!d) return 1
    const v = d.toLowerCase()
    if (v.includes('dif')) return 3
    if (v.includes('med')) return 2
    return 1
  }

  const filteredRecipes = useMemo(() => {
    const list = recipes.filter(r =>
      activeFolderId ? r.folder_id === activeFolderId : !r.folder_id
    )
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter(r => r.title.toLowerCase().includes(s))
  }, [recipes, q, activeFolderId])

  const currentFolders = folders.filter(f =>
    activeFolderId ? f.parent_folder_id === activeFolderId : !f.parent_folder_id
  )

  const moveRecipeToFolder = async (recipeId: string, folderId: string | null) => {
    await supabase.from('recipes').update({ folder_id: folderId }).eq('id', recipeId)
    refresh()
  }

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm('¿Eliminar esta receta?')) return
    await supabase.from('recipes').delete().eq('id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="planner-card watercolor-paper warm-glow rounded-[24px] border p-6 md:p-8 relative overflow-hidden">

        <div className="relative z-20">

          {/* Header */}
          <div className="flex justify-between items-center">
            <button onClick={() => router.push('/library')} className="flex items-center gap-2">
              <ArrowLeft size={16}/> Volver a biblioteca
            </button>

            <button
              onClick={() => router.push(`/cookbook/${cookbookId}/new`)}
              className="rounded-xl px-4 py-2 text-white"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <Plus size={16}/> Agregar receta
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-60"/>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Buscar recetas y carpetas..."
              className="w-full rounded-xl border pl-9 pr-3 py-2"
              style={{ borderColor:'var(--rule)', background:'var(--paper)' }}
            />
          </div>

          {/* Sacar de carpeta */}
          {activeFolderId && draggingRecipeId && (
            <div
              className="mt-4 p-3 rounded-xl text-center text-sm"
              onDragOver={(e)=>{e.preventDefault();setDragOverRemove(true)}}
              onDragLeave={()=>setDragOverRemove(false)}
              onDrop={()=>moveRecipeToFolder(draggingRecipeId,null)}
              style={{
                border:'1px dashed #ad8365',
                background:dragOverRemove?'rgba(173,131,101,0.25)':'rgba(173,131,101,0.08)'
              }}
            >
              Sacar de carpeta
            </div>
          )}

          {/* Folders */}
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {currentFolders.map(folder=>(
              <div
                key={folder.id}
                className="planner-card p-4 cursor-pointer"
                onClick={()=>setFolderStack(s=>[...s,folder.id])}
                onDragOver={(e)=>{e.preventDefault();setDragOverFolderId(folder.id)}}
                onDrop={()=>moveRecipeToFolder(draggingRecipeId!,folder.id)}
              >
                📁 {folder.name}
              </div>
            ))}
          </div>

          {/* Recipes */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {filteredRecipes.map(r=>(
              <div
                key={r.id}
                draggable
                onDragStart={(e)=>{
                  e.dataTransfer.setData('text/plain',r.id)
                  setDraggingRecipeId(r.id)
                }}
                className="recipe-card-container relative"
              >
                <button
                  className="recipe-card-delete"
                  onClick={()=>deleteRecipe(r.id)}
                >
                  <Trash2 size={14}/>
                </button>

                <button
                  onClick={()=>router.push(`/recipe/${r.id}`)}
                  className="recipe-card w-full text-left"
                >
                  <div className="recipe-card-body">
                    <div className="font-semibold">{r.title}</div>

                    <div className="mt-2 text-xs opacity-70 flex gap-3">
                      <span>⏱️ {totalMinutes(r)} min</span>
                      <span>👥 {r.servings ?? '-'}</span>
                    </div>

                    <div className="mt-2 border-t opacity-30"/>

                    <div className="mt-2 text-xs">
                      {'🔥'.repeat(difficultyIcons(r.difficulty))}
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>
    </main>
  )
}
