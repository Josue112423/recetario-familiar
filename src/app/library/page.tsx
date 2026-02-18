'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Cookbook = {
  id: string
  family_id: string
  owner_id: string
  title: string
  created_at: string
}

function hash(seed: string) {
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0
  return n
}

function bookStyle(seed: string) {
  // paletas tipo “libro” (determinísticas por id)
  const palettes = [
    { spine: '#5B3A2E', cover: 'linear-gradient(180deg,#F59E0B 0%,#B45309 100%)', ink: '#fff' },
    { spine: '#1F3A5F', cover: 'linear-gradient(180deg,#60A5FA 0%,#2563EB 100%)', ink: '#fff' },
    { spine: '#2F4A3A', cover: 'linear-gradient(180deg,#34D399 0%,#059669 100%)', ink: '#0b1b12' },
    { spine: '#4A2F5A', cover: 'linear-gradient(180deg,#C4B5FD 0%,#7C3AED 100%)', ink: '#fff' },
    { spine: '#7A2E2E', cover: 'linear-gradient(180deg,#FDA4AF 0%,#E11D48 100%)', ink: '#fff' },
    { spine: '#6B5035', cover: 'linear-gradient(180deg,#E7D3B0 0%,#C4A67A 100%)', ink: '#2a2a2a' },
  ]
  const n = hash(seed)
  const p = palettes[n % palettes.length]
  const w = 54 + (n % 18) // 54–71
  const h = 108 + ((n >>> 4) % 26) // 108–133
  return { ...p, w, h }
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

      const { data, error } = await supabase
        .from('cookbooks')
        .select('id,family_id,owner_id,title,created_at')
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
      {/* Contenedor tipo planner/papel */}
      <section className="planner-card watercolor-paper warm-glow rounded-[24px] border p-6 md:p-8 relative overflow-hidden">
        {/* Decoraciones (usa tus imágenes en public/attached_assets) */}
        
        {/* Maceta abajo-izq (como la 2ª) */}
        <img
          src="/attached_assets/potted-plant.png"
          alt=""
          className="absolute bottom-[-10px] left-[10px] w-[90px] opacity-90 pointer-events-none"
        />

        {/* Enredadera derecha (como la 2ª) */}
        <img
          src="/attached_assets/plant-vine.png"
          alt=""
          className="absolute right-[-10px] top-[170px] w-[180px] opacity-80 pointer-events-none"
        />


        <div className="relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl title-font">Biblioteca familiar</h1>
              <p className="mt-2 text-[13px] md:text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Tus recetarios como libros en un estante.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
                onClick={() => router.push('/join')}
              >
                Cambiar / entrar a otra familia
              </button>

              <button
                className="rounded-xl border px-4 py-2 text-sm"
                style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
                onClick={async () => {
                  await supabase.auth.signOut()
                  localStorage.removeItem('active_family_id')
                  window.location.href = '/login'
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Código de familia */}
          {familyCode && (
            <div className="mt-5 rounded-2xl border p-4 md:p-5"
                 style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--recipe-muted)' }}>
                    Código de familia
                  </div>
                  <div
                    className="mt-1 text-2xl font-extrabold tracking-widest"
                    style={{ color: 'var(--ink)' }}
                  >
                    {familyCode}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--recipe-muted)' }}>
                    Compártelo para que se unan al recetario.
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-xl border px-4 py-2 text-sm"
                    style={{ borderColor: 'var(--rule)', background: 'transparent', color: 'var(--ink)' }}
                    onClick={async () => {
                      await navigator.clipboard.writeText(familyCode)
                      alert('Copiado ✅')
                    }}
                  >
                    Copiar
                  </button>

                  <button
                    className="rounded-xl px-4 py-2 text-sm text-white"
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
              <div className="floating-shelf-container animate-fade-up">
                <div className="floating-shelf-books">
                  {cookbooks.map((b) => {
                    const s = bookStyle(b.id)
                    const title = (b.title || 'Recetario').trim()
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
                          style={{
                            width: `${s.w}px`,
                            height: `${s.h}px`,
                          }}
                        >
                          <div
                            className="standing-book-spine"
                            style={{ background: s.spine }}
                          />
                          <div
                            className="standing-book-cover"
                            style={{
                              background: s.cover,
                              color: s.ink,
                            }}
                          >
                            <div className="standing-book-title">{title}</div>
                            <div className="standing-book-label">RECETAS</div>
                          </div>
                          <div className="standing-book-pages" />
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="floating-shelf-plank" />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
