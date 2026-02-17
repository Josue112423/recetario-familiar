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

function coverClass(seed: string) {
  // elige una “portada” determinística según el id
  const options = [
    'bg-gradient-to-br from-amber-200 to-amber-500',
    'bg-gradient-to-br from-rose-200 to-rose-500',
    'bg-gradient-to-br from-sky-200 to-sky-500',
    'bg-gradient-to-br from-emerald-200 to-emerald-500',
    'bg-gradient-to-br from-violet-200 to-violet-500',
  ]
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % options.length
  return options[n]
}

export default function LibraryPage() {
  const router = useRouter()
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([])
  const [loading, setLoading] = useState(true)
  const familyId = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('active_family_id')
  }, [])

  const [familyCode, setFamilyCode] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)

      const fid = localStorage.getItem('active_family_id')
      if (!fid) {
        setCookbooks([])
        setLoading(false)
        return
      }

      const { data: fam, error: famErr } = await supabase
        .from('families')
        .select('code')
        .eq('id', fid)
        .single()

      if (!famErr) setFamilyCode(fam.code as string)


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
  <main className="mx-auto max-w-6xl px-6 py-10">
    <div className="relative">
      {/* HEADER CARD (Replit vibe) */}
      <div className="planner-card rounded-[34px] p-6 md:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold tracking-widest text-[#ad8365] uppercase">
              Biblioteca familiar
            </div>
            <h1 className="title-font mt-2 text-4xl md:text-5xl font-bold tracking-tight">
              Recetarios
            </h1>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Tus recetarios (como libros).
            </p>
          </div>

          {/* mini “tabs” decorativas */}
          <div className="hidden md:flex flex-col items-end gap-2 text-[10px] font-bold tracking-widest text-[color:var(--muted)]">
            <div className="planner-divider rounded-full border px-4 py-1.5 uppercase">RECIPES</div>
            <div className="planner-divider rounded-full border px-4 py-1.5 uppercase">FAMILY</div>
          </div>
        </div>

        <div className="planner-divider mt-8 border-t" />

        {/* ACTION ROW */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: family code (same functionality, Replit styling) */}
          {familyCode ? (
            <div className="planner-divider rounded-3xl border bg-white/50 p-5 backdrop-blur-sm">
              <div className="text-[10px] font-bold tracking-widest text-[#ad8365] uppercase">
                Código de familia
              </div>

              <div className="mt-2 text-2xl font-extrabold tracking-widest text-[color:var(--ink)]">
                {familyCode}
              </div>

              <div className="mt-2 text-sm text-[color:var(--muted)]">
                Compártelo para que se unan al recetario.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="planner-divider rounded-2xl border bg-white/60 px-4 py-3 text-xs font-bold tracking-widest uppercase text-[color:var(--ink)] transition hover:bg-white/80 hover:-translate-y-0.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(familyCode)
                    alert('Copiado ✅')
                  }}
                >
                  Copiar
                </button>

                <button
                  className="rounded-2xl bg-[#ad8365] px-4 py-3 text-xs font-bold tracking-widest uppercase text-white shadow-lg shadow-[#ad8365]/20 transition-all hover:bg-[#8f6b54] hover:-translate-y-0.5 hover:shadow-xl"
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
          ) : (
            <div className="text-sm text-[color:var(--muted)]">
              {loading ? 'Cargando…' : 'No hay familia activa.'}
            </div>
          )}

          {/* Right: buttons */}
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              className="planner-divider rounded-2xl border bg-white/60 px-5 py-3 text-xs font-bold tracking-widest uppercase text-[color:var(--ink)] transition hover:bg-white/80 hover:-translate-y-0.5"
              onClick={() => router.push('/join')}
            >
              Cambiar familia
            </button>

            <button
              className="rounded-2xl bg-[#ad8365] px-5 py-3 text-xs font-bold tracking-widest uppercase text-white shadow-lg shadow-[#ad8365]/20 transition-all hover:bg-[#8f6b54] hover:-translate-y-0.5 hover:shadow-xl"
              onClick={() => router.push('/join')}
            >
              Entrar / unirme
            </button>

            <button
              className="planner-divider rounded-2xl border bg-white/60 px-5 py-3 text-xs font-bold tracking-widest uppercase text-[color:var(--ink)] transition hover:bg-white/80 hover:-translate-y-0.5"
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
      </div>

      {/* CONTENT */}
      <div className="mt-8">
        {loading ? (
          <p className="text-slate-800">Cargando…</p>
        ) : cookbooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-slate-800">
            No veo recetarios todavía. Regresa a <b>/join</b> y crea o únete a una familia.
          </div>
        ) : (
          <section className="relative mt-10 h-[320px] overflow-hidden rounded-[28px]">
            {/* fondo suave tipo Replit */}
            <div className="absolute inset-0 bg-[radial-gradient(900px_400px_at_25%_0%,rgba(173,131,101,.18),transparent_60%),radial-gradient(700px_380px_at_85%_25%,rgba(245,158,11,.10),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,.35),rgba(255,255,255,.12))]" />

            {/* decoraciones (opcional) */}
            <div className="pointer-events-none absolute bottom-10 left-8 hidden md:block">
              <img
                src="/attached_assets/plant-left.png"
                alt=""
                className="h-28 w-auto opacity-95"
              />
            </div>
            <div className="pointer-events-none absolute right-0 top-24 hidden md:block">
              <img
                src="/attached_assets/vine-right.png"
                alt=""
                className="h-44 w-auto opacity-95"
              />
            </div>

            {/* repisa */}
            <div className="absolute bottom-6 left-6 right-6 h-10 rounded-xl bg-[#7a5f3c] shadow-[0_18px_35px_rgba(0,0,0,.25)]" />
            <div className="absolute bottom-6 left-6 right-6 h-[2px] rounded-xl bg-white/20" />

            {/* libros encima de la repisa */}
            <div className="absolute bottom-[46px] left-10 right-10 flex items-end gap-10 overflow-x-auto pb-4">
              {cookbooks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => router.push(`/cookbook/${b.id}`)}
                  className="group relative h-[200px] w-[120px] shrink-0"
                  title={b.title}
                >
                  {/* sombra en el piso */}
                  <div className="absolute -bottom-2 left-3 right-3 h-3 rounded-full bg-black/25 blur-md transition group-hover:bg-black/35" />

                  {/* libro */}
                  <div className="absolute inset-0 overflow-hidden rounded-[14px] border border-black/10 shadow-[0_18px_30px_rgba(0,0,0,.18)] transition-transform group-hover:-translate-y-1">
                    {/* portada */}
                    <div className={`absolute inset-0 ${coverClass(b.id)} opacity-95`} />

                    {/* lomo */}
                    <div className="absolute left-0 top-0 h-full w-4 bg-black/20" />
                    <div className="absolute left-4 top-0 h-full w-[2px] bg-white/35" />

                    {/* brillo */}
                    <div className="absolute -left-10 top-0 h-full w-24 rotate-12 bg-white/25 blur-sm" />

                    {/* texto centrado como Replit */}
                    <div className="relative z-10 flex h-full flex-col items-center justify-center px-3 text-center">
                      <div className="text-[11px] font-extrabold leading-tight text-black/90 drop-shadow-sm">
                        {b.title}
                      </div>
                      <div className="mt-2 text-[9px] font-bold tracking-widest text-black/60">
                        RECETARIO
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile FAB (opcional) */}
      <div className="fixed bottom-24 right-6 z-50 xl:hidden">
        <button
          type="button"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ad8365] text-white shadow-xl shadow-[#ad8365]/30"
          aria-label="Unirme"
          onClick={() => router.push('/join')}
        >
          +
        </button>
      </div>
    </div>
  </main>
)

}
