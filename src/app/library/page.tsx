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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca familiar</h1>
          <p className="mt-2">Tus recetarios (como libros).</p>
        </div>

        {familyCode && (
            <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <div>
                   <div className="text-sm font-semibold text-slate-800">Código de familia</div>
                   <div className="mt-1 text-2xl font-extrabold tracking-widest text-slate-900">
                    {familyCode}
                 </div>
                  <div className="mt-1 text-sm text-slate-700">
                      Compártelo para que se unan al recetario.
                    </div>
                  </div>

                  <div className="flex gap-2">
                   <button
                    className="rounded-xl border  text-slate-800 bg-white px-4 py-3 hover:bg-slate-50"
                        onClick={async () => {
                     await navigator.clipboard.writeText(familyCode)
                       alert('Copiado ✅')
                      }}
                 >
                   Copiar
                  </button>

                 <button
                   className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:opacity-90"
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

        <button
          className="rounded-xl bg-slate-900 px-4 py-3 text-white hover:opacity-90"
          onClick={() => router.push('/join')}
        >
          Cambiar / entrar a otra familia
        </button>

        <button
            className="rounded-xl border  text-slate-800 bg-white px-4 py-3 hover:bg-slate-50"
             onClick={async () => {
              await supabase.auth.signOut()
             localStorage.removeItem('active_family_id')
             window.location.href = '/login'
             }}
            >
            Cerrar sesión
        </button>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-slate-800">Cargando…</p>
        ) : cookbooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-slate-800">
            No veo recetarios todavía. Regresa a <b>/join</b> y crea o únete a una familia.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cookbooks.map((b) => (
              <button
                key={b.id}
                onClick={() => router.push(`/cookbook/${b.id}`)}
                className="group text-left"
              >
                <div className="relative h-44 overflow-hidden rounded-2xl border bg-white shadow-sm transition group-hover:shadow-md">
                  {/* Portada */}
                  <div className={`absolute inset-0 ${coverClass(b.id)} opacity-95`} />

                  {/* “Lomo” del libro */}
                  <div className="absolute left-0 top-0 h-full w-5 bg-black/15" />
                  <div className="absolute left-5 top-0 h-full w-0.5 bg-white/40" />

                  {/* Brillo */}
                  <div className="absolute -left-10 top-0 h-full w-24 rotate-12 bg-white/25 blur-sm" />

                  {/* Texto */}
                  <div className="relative z-10 flex h-full flex-col justify-end p-4 text-slate-900">
                    <div className="text-lg font-extrabold drop-shadow-sm">{b.title}</div>
                    <div className="mt-1 text-sm text-black/70">Toca para abrir</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
