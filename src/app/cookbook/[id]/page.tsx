'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, Clock } from 'lucide-react'
import { Folder, FolderPlus, Flame, Users } from "lucide-react"

type Recipe = {
  id: string
  title: string
  created_at: string
  folder_id: string | null
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  difficulty: string | null
  ingredients_text: string
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

  const [cookbookTitle, setCookbookTitle] = useState<string>('Recetario')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")


  const refresh = async () => {

    const { data: cb } = await supabase
      .from('cookbooks')
      .select('title')
      .eq('id', cookbookId)
      .single()

    setCookbookTitle(cb?.title ?? 'Recetario')

    const { data: rs } = await supabase
      .from('recipes')
      .select('id,title,created_at,folder_id,prep_time_min,cook_time_min,servings,difficulty,ingredients_text')
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

  const ingredientCount = (txt?: string | null) => {
    const lines = (txt ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    return lines.length
  }

  const difficultyLevel = (d?: string | null) => {
    const v = (d ?? "").toLowerCase()
    if (v.includes("dif")) return 3
    if (v.includes("med")) return 2
    if (v.includes("fac")) return 1
    // si alguien puso "hard/medium/easy"
    if (v.includes("hard")) return 3
    if (v.includes("medium")) return 2
    if (v.includes("easy")) return 1
    return 1
  }

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

  const createFolder = async () => {
  const name = newFolderName.trim()
  if (!name) return

  const { error } = await supabase.from("recipe_folders").insert({
    cookbook_id: cookbookId,
    parent_folder_id: activeFolderId,
    name,
    photo_url: null,
  })

  if (error) {
    alert(error.message)
    return
  }

  setShowNewFolder(false)
  setNewFolderName("")
  await refresh()
}


  const deleteRecipe = async (recipeId: string) => {
    if (!confirm('¿Eliminar esta receta?')) return
    await supabase.from('recipes').delete().eq('id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
  }

  const deleteFolder = async (folderId: string) => {
  if (!confirm("¿Eliminar esta carpeta? Las recetas no se borrarán.")) return

  const { error } = await supabase
    .from("recipe_folders")
    .delete()
    .eq("id", folderId)

  if (error) {
    alert(error.message)
    return
  }

  await refresh()
}


  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="planner-card watercolor-paper warm-glow rounded-[24px] border p-6 md:p-8 relative overflow-hidden">

        <div className="relative z-20">

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                onClick={() => router.push('/library')}
                className="inline-flex items-center gap-2 text-sm"
                style={{ color: 'var(--ink)' }}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a biblioteca
              </button>

              <h1 className="mt-3 text-4xl title-font" style={{ color: 'var(--ink)' }}>
                {cookbookTitle}
              </h1>

              <p className="mt-2 handwritten" style={{ color: 'var(--recipe-muted)' }}>
                Índice de recetas
              </p>
            </div>

            <button
              onClick={() => router.push(`/cookbook/${cookbookId}/new`)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white whitespace-nowrap"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Agregar receta
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

          {showNewFolder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.25)" }}
                onClick={() => setShowNewFolder(false)}
              />
              <div
                className="relative w-[92%] max-w-md rounded-2xl border p-5"
                style={{ background: "var(--paper)", borderColor: "var(--rule)" }}
              >
                <div className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                  Nueva carpeta
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--recipe-muted)" }}>
                  Se creará dentro de la carpeta actual (si estás dentro de una).
                </p>

                <input
                  className="mt-4 w-full rounded-xl border px-3 py-2 outline-none"
                  style={{ background: "transparent", borderColor: "var(--rule)", color: "var(--ink)" }}
                  placeholder="Ej. Pollo, Postres, Navidad…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createFolder()
                    if (e.key === "Escape") setShowNewFolder(false)
                  }}
                  autoFocus
                />

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="rounded-xl border px-4 py-2 text-sm"
                    style={{ borderColor: "var(--rule)", color: "var(--ink)" }}
                    onClick={() => setShowNewFolder(false)}
                  >
                    Cancelar
                  </button>

                  <button
                    className="rounded-xl px-4 py-2 text-sm text-white whitespace-nowrap"
                    style={{ background: "hsl(var(--primary))" }}
                    onClick={createFolder}
                  >
                    Crear
                  </button>
                </div>
              </div>
            </div>
          )}


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

          {/* Header de CARPETAS */}
        <div className="mt-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em]"
            style={{ color: 'var(--recipe-muted)' }}
          >
            <Folder className="h-4 w-4 opacity-60" />
            <span>CARPETAS</span>
          </div>

          <button
            className="inline-flex items-center gap-2 text-sm whitespace-nowrap"
            style={{ color: 'var(--ink)' }}
            onClick={() => setShowNewFolder(true)}
          >
            <Plus className="h-4 w-4 shrink-0" />
            Nueva carpeta
          </button>
        </div>

          {/* Folders */}
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {currentFolders.map(folder=>(
              <button
                key={folder.id}
                className="folder-card w-full text-left rounded-2xl border p-4 relative overflow-hidden transition-all duration-300"
                style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
                onClick={() => setFolderStack((s) => [...s, folder.id])}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverFolderId(folder.id)
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={() => moveRecipeToFolder(draggingRecipeId!, folder.id)}
              >
                {/* overlay cuando arrastras encima */}
                {dragOverFolderId === folder.id && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'rgba(173,131,101,0.08)',
                      outline: '2px solid rgba(173,131,101,0.55)',
                    }}
                  />
                )}

                <button
                  type="button"
                  className="recipe-card-delete"
                  title="Eliminar carpeta"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteFolder(folder.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="relative">
                  <div className="flex items-center justify-center h-[92px] rounded-xl"
                      style={{ background: 'rgba(173,131,101,0.06)' }}>
                    <div className="folder-icon">
                      <FolderPlus className="h-8 w-8 opacity-40" />
                    </div>

                  </div>

                  <div className="mt-3 font-semibold" style={{ color: 'var(--ink)' }}>
                    {folder.name}
                  </div>

                  <div className="mt-1 text-xs" style={{ color: 'var(--recipe-muted)' }}>
                    {/* si aún no tienes count, deja esto fijo por ahora */}
                    {/* luego lo conectamos con conteo real */}
                    Carpeta
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Recipes */}
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {filteredRecipes.map(r=>(
              <div
                key={r.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", r.id)
                  setDraggingRecipeId(r.id)
                }}
                onDragEnd={() => {
                  setDraggingRecipeId(null)
                  setDragOverFolderId(null)
                  setDragOverRemove(false)
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

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--recipe-muted)" }}>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 opacity-60" />
                        {totalMinutes(r) ? `${totalMinutes(r)} min` : "—"}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 opacity-60" />
                        {r.servings ?? "—"} porciones
                      </span>

                      <span>
                        {ingredientCount(r.ingredients_text) || "—"} ingredientes
                      </span>
                    </div>

                    <div className="mt-2 border-t" style={{ borderColor: "var(--rule2)" }} />

                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--recipe-muted)" }}>
                      <span className="inline-flex items-center gap-1">
                        {Array.from({ length: difficultyLevel(r.difficulty) }).map((_, i) => (
                          <Flame key={i} className="h-3.5 w-3.5 opacity-70" />
                        ))}
                      </span>
                      <span>{r.difficulty ?? "Fácil"}</span>
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
