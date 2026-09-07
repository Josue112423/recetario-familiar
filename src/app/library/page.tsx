'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { BookOpen, Share2, User } from "lucide-react"

type Cookbook = {
  id: string
  family_id: string
  owner_id: string
  title: string
  created_at: string
  color: string | null
  cover_image: string | null
}

// --- Paleta de colores (misma que en Library.tsx de Replit) ---
const BOOK_COLOR_MAP: Record<string, { spine: string; cover: string; text: string; pages: string }> = {
  brown:  { spine: "#8B6F47", cover: "linear-gradient(180deg, #c2956a 0%, #a07a50 100%)", text: "#fff8f0", pages: "#f5efe6" },
  red:    { spine: "#8B4444", cover: "linear-gradient(180deg, #b85c5c 0%, #8B4444 100%)", text: "#fff0f0", pages: "#faf0f0" },
  blue:   { spine: "#446688", cover: "linear-gradient(180deg, #5c8bb8 0%, #446688 100%)", text: "#f0f6ff", pages: "#f0f4fa" },
  green:  { spine: "#3d7a56", cover: "linear-gradient(180deg, #5ca87a 0%, #3d7a56 100%)", text: "#f0fff6", pages: "#f0faf5" },
  purple: { spine: "#6d5090", cover: "linear-gradient(180deg, #9678b8 0%, #6d5090 100%)", text: "#f6f0ff", pages: "#f4f0fa" },
  gold:   { spine: "#9a7d3a", cover: "linear-gradient(180deg, #c4a35a 0%, #9a7d3a 100%)", text: "#fff8e8", pages: "#faf5e8" },
  teal:   { spine: "#4a7878", cover: "linear-gradient(180deg, #6b9e9e 0%, #4a7878 100%)", text: "#f0ffff", pages: "#f0fafa" },
  pink:   { spine: "#99526b", cover: "linear-gradient(180deg, #c47a96 0%, #99526b 100%)", text: "#fff0f6", pages: "#faf0f5" },
  orange: { spine: "#b06b2a", cover: "linear-gradient(180deg, #d49350 0%, #b06b2a 100%)", text: "#fff5e8", pages: "#faf3e8" },
}

const BOOK_COLOR_KEYS = Object.keys(BOOK_COLOR_MAP)

function hash(seed: string) {
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0
  return n
}

function darkenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  const newL = Math.max(0, l - amount / 100)
  const newS = s
  const a2 = newS * Math.min(newL, 1 - newL)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const c = newL - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function lightenForText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2
  return l > 0.55 ? "#2a2218" : "#fff8f0"
}

// Devuelve los colores reales del libro:
// 1) si "color" es una key conocida (brown, red, blue...) usa esa
// 2) si "color" es un hex (#RRGGBB) genera la paleta a partir de ese hex
// 3) si no hay color guardado, cae al color "aleatorio" por id (comportamiento anterior)
function getBookColor(cookbook: Cookbook) {
  if (cookbook.color && cookbook.color in BOOK_COLOR_MAP) {
    return BOOK_COLOR_MAP[cookbook.color]
  }
  if (cookbook.color && /^#[0-9a-fA-F]{6}$/.test(cookbook.color)) {
    const hexColor = cookbook.color
    const spine = darkenHex(hexColor, 18)
    const coverDark = darkenHex(hexColor, 12)
    return {
      spine,
      cover: `linear-gradient(180deg, ${hexColor} 0%, ${coverDark} 100%)`,
      text: lightenForText(hexColor),
      pages: "#f5efe6",
    }
  }
  const n = hash(cookbook.id)
  return BOOK_COLOR_MAP[BOOK_COLOR_KEYS[n % BOOK_COLOR_KEYS.length]] || BOOK_COLOR_MAP.brown
}

function getBookSize(seed: string) {
  const n = hash(seed)
  const w = 54 + (n % 18)
  const h = 108 + ((n >>> 4) % 26)
  return { w, h }
}

export default function LibraryPage() {
  const router = useRouter()
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([])
  const [loading, setLoading] = useState(true)
  const [familyCode, setFamilyCode] = useState<string | null>(null)

  const familyId = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('active_family_id')
  }, [])

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const fid = localStorage.getItem('active_family_id')
      if (!fid) {
        setCookbooks([])
        setFamilyCode(null)
        setLoading(false)
        return
      }

      const { data: fam, error: famErr } = await supabase
        .from('families')
        .select('code')
        .eq('id', fid)
        .single()

      if (!famErr) setFamilyCode((fam?.code ?? null) as string | null)

      // OJO: agregamos "color" y "cover_image" al select.
      // Si tus columnas en Supabase se llaman distinto, ajusta los nombres aquí.
      const { data, error } = await supabase
        .from('cookbooks')
        .select('id,family_id,owner_id,title,created_at,color,cover_image')
        .eq('family_id', fid)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setCookbooks([])
      } else {
        setCookbooks((data ?? []) as Cookbook[])
      }

      setLoading(false)
    }

    run()
  }, [familyId])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="planner-card watercolor-paper warm-glow rounded-[24px] border p-6 md:p-8 relative overflow-hidden"
               style={{ borderColor: 'var(--rule)' }}>

        {/* Maceta abajo-izquierda */}
        <img
          src="/attached_assets/potted-plant.png"
          alt=""
          className="pointer-events-none absolute bottom-[16px] left-[24px] w-[92px] z-[60]"
        />

        {/* FIX: Planta vine — contenida dentro del card con overflow-hidden del section */}
        <img
          src="/attached_assets/plant-vine.png"
          alt=""
          className="pointer-events-none absolute right-0 top-[60px] w-[100px] z-[60] opacity-90"
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl md:text-4xl title-font" style={{ color: 'var(--ink)' }}>
                <BookOpen className="w-6 h-6 opacity-70" />
                Biblioteca familiar
              </h1>
              <p className="mt-1 text-[13px] md:text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Tus recetarios favoritos
              </p>
            </div>

            {/* Botón Mi cuenta */}
            <button
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium self-start transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
              onClick={() => router.push('/account')}
            >
              <User className="w-4 h-4" />
              Mi cuenta
            </button>
          </div>

          {/* Código de familia */}
          {familyCode && (
            <div className="mt-5 rounded-2xl border p-4 md:p-5"
                 style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--recipe-muted)' }}>
                    Codigo de familia
                  </div>
                  <div className="mt-1 text-2xl font-extrabold tracking-widest" style={{ color: 'var(--ink)' }}>
                    {familyCode}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--recipe-muted)' }}>
                    Compartelo para que se unan al recetario.
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ borderColor: 'var(--rule)', background: 'transparent', color: 'var(--ink)' }}
                    onClick={async () => {
                      await navigator.clipboard.writeText(familyCode)
                      alert('Copiado ✅')
                    }}
                  >
                    Copiar
                  </button>

                  <button
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: 'hsl(var(--primary))' }}
                    onClick={async () => {
                      const text = `Únete a nuestro recetario familiar. Código: ${familyCode}\nLink: ${window.location.origin}/join`
                      if (navigator.share) {
                        await navigator.share({ title: 'Recetario familiar', text })
                      } else {
                        await navigator.clipboard.writeText(text)
                        alert('Mensaje copiado ✅')
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Estante + libros */}
          <div className="mt-6">
            {loading ? (
              <p style={{ color: 'var(--ink)' }}>Cargando…</p>
            ) : cookbooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8"
                   style={{ borderColor: 'var(--rule)', color: 'var(--ink)', background: 'rgba(255,255,255,0.25)' }}>
                No veo recetarios todavía. Regresa a <b>/join</b> y crea o únete a una familia.
              </div>
            ) : (
              <div className="floating-shelf-container animate-fade-up relative">
                <div className="floating-shelf-books relative z-20">
                  {cookbooks.map((b) => {
                    const color = getBookColor(b)
                    const { w, h } = getBookSize(b.id)
                    const title = (b.title || 'Recetario').trim()
                    const hasCoverImg = !!b.cover_image

                    return (
                      <button
                        key={b.id}
                        className="standing-book text-left"
                        onClick={() => router.push(`/cookbook/${b.id}`)}
                        aria-label={`Abrir recetario ${title}`}
                      >
                        <div className="standing-book-tooltip">
                          <span>📖</span>
                          <span>{title}</span>
                        </div>

                        <div
                          className="standing-book-body"
                          style={{ width: `${w}px`, height: `${h}px` }}
                        >
                          <div
                            className="standing-book-spine"
                            style={{ background: hasCoverImg ? "#333" : color.spine }}
                          />
                          <div
                            className="standing-book-cover"
                            style={
                              hasCoverImg
                                ? { backgroundImage: `url(${b.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" }
                                : { background: color.cover, color: color.text }
                            }
                          >
                            {!hasCoverImg && (
                              <>
                                <div className="standing-book-title">{title}</div>
                                <div className="standing-book-label" style={{ color: `${color.text}99` }}>
                                  RECETARIO
                                </div>
                              </>
                            )}
                          </div>
                          <div className="standing-book-pages" style={{ background: color.pages }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="floating-shelf-plank relative z-10" />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}