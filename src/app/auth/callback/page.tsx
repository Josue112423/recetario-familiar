'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      // Esto hace que supabase-js lea el #hash del URL y guarde la sesión
      const { data } = await supabase.auth.getSession()

      // Si ya hay sesión (normal), manda a /join
      if (data.session) {
        router.replace('/join')
        return
      }

      // Si por alguna razón aún no hay sesión, igual manda a /login
      router.replace('/login')
    }

    run()
  }, [router])

  return (
    <main className="mx-auto max-w-md px-6 py-12 text-slate-900">
      <h1 className="text-2xl font-bold">Entrando…</h1>
      <p className="mt-2 text-slate-800">Estamos iniciando tu sesión.</p>
    </main>
  )
}
