'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      // Esto “absorbe” el hash (#...) si viene del magic link
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        router.replace('/join')
        return
      }

      setLoading(false)
    }

    run()
  }, [router])

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-slate-900">
        <h1 className="text-2xl font-bold">Entrando…</h1>
        <p className="mt-2 text-slate-800">Cargando tu sesión.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12 text-slate-100">
      <h1 className="text-3xl font-extrabold">Recetario familiar</h1>
      <p className="mt-2 text-slate-200">
        Inicia sesión para entrar a tu familia.
      </p>

      <button
        className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-white hover:opacity-90"
        onClick={() => router.push('/login')}
      >
        Iniciar sesión
      </button>
    </main>
  )
}
