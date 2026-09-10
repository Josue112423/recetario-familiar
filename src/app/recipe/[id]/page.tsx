'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { RecipeSheet } from '@/components/RecipeSheet'
import { Share2, Loader2 } from 'lucide-react'

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

function slugify(text: string) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    || 'receta'
}

export default function RecipePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const recipeId = params.id

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)

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

  const handleShare = async () => {
    if (!sheetRef.current || !recipe) return
    setSharing(true)

    const el = sheetRef.current
    const originalWidth = el.style.width
    const originalMaxWidth = el.style.maxWidth

    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      // Forzamos un ancho tipo "escritorio" para que SIEMPRE salga
      // el layout de 2 columnas, sin importar si compartes desde
      // celular o una ventana angosta.
      const CAPTURE_WIDTH = 820
      el.style.width = `${CAPTURE_WIDTH}px`
      el.style.maxWidth = `${CAPTURE_WIDTH}px`

      // Le damos un respiro al navegador para que recalcule el layout
      // con el nuevo ancho antes de capturar.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2, // más nitidez
        useCORS: true,
        windowWidth: CAPTURE_WIDTH,
        width: CAPTURE_WIDTH,
      })

      const imgData = canvas.toDataURL('image/png')

      // Márgenes alrededor del contenido para que no se sienta amontonado
      const MARGIN = 60
      const pdfWidth = canvas.width + MARGIN * 2
      const pdfHeight = canvas.height + MARGIN * 2

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pdfWidth, pdfHeight],
      })

      // Fondo cálido (mismo tono que tu app) en vez de blanco puro
      pdf.setFillColor('#f5ecd9')
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F')
      pdf.addImage(imgData, 'PNG', MARGIN, MARGIN, canvas.width, canvas.height)

      const fileName = `${slugify(recipe.title)}.pdf`
      const pdfBlob = pdf.output('blob')
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

      // En celular: abre el menú nativo de compartir (WhatsApp, Mensajes, etc.)
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: recipe.title,
          text: `Receta: ${recipe.title}`,
        })
      } else {
        // En escritorio (o si no soporta compartir archivos): descarga el PDF
        pdf.save(fileName)
      }
    } catch (e) {
      console.error(e)
      alert('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      el.style.width = originalWidth
      el.style.maxWidth = originalMaxWidth
      setSharing(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {loading ? (
        <p style={{ color: 'var(--recipe-muted)' }}>Cargando…</p>
      ) : !recipe ? (
        <p style={{ color: 'var(--recipe-muted)' }}>No encontré la receta.</p>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
              style={{ color: 'var(--recipe-muted)' }}
              onClick={() => router.push(`/cookbook/${recipe.cookbook_id}`)}
            >
              ← Volver al recetario
            </button>

            <button
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)', background: 'var(--paper)' }}
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {sharing ? 'Generando…' : 'Compartir'}
            </button>
          </div>

          <div ref={sheetRef}>
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
          </div>
        </>
      )}
    </main>
  )
}