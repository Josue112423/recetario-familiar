'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const signInWithGoogle = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      // Supabase redirige a Google automáticamente; no hace falta hacer nada más aquí.
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error inesperado')
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'var(--planner-bg)' }}
    >
      <div className="w-full max-w-md">
        <button
          className="flex items-center gap-1 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: 'var(--recipe-muted)' }}
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>

        <div
          className="planner-card watercolor-paper warm-glow rounded-[24px] border p-8 md:p-10 text-center"
          style={{ borderColor: 'var(--rule)' }}
        >
          <div
            className="mx-auto flex items-center justify-center rounded-full p-4"
            style={{ width: 72, height: 72, background: 'rgba(173,131,101,0.12)' }}
          >
            <BookOpen style={{ width: 32, height: 32, color: '#ad8365' }} />
          </div>

          <h1 className="title-font mt-6 text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--recipe-muted)' }}>
            Entra con tu cuenta de Google, sin contraseñas.
          </p>

          <button
            className="mt-8 w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 font-medium border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
            onClick={signInWithGoogle}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
            {loading ? 'Conectando…' : 'Continuar con Google'}
          </button>

          {msg && (
            <p className="mt-4 text-sm" style={{ color: 'var(--ink)' }}>
              {msg}
            </p>
          )}

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--rule)' }}>
            <button
              className="w-full rounded-xl border px-4 py-3 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--rule)', background: 'transparent', color: 'var(--ink)' }}
              onClick={() => router.push('/join')}
            >
              Ya tengo sesión / Ir a unirme
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}