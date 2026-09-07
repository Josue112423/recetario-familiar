'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Mail, ArrowLeft, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const sendLink = async () => {
    setLoading(true)
    setMsg('')
    try {
      if (!email.trim()) throw new Error('Escribe tu correo.')

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error

      setMsg('Listo ✅ Revisa tu correo y abre el link para entrar.')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
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
            Te mandamos un link mágico a tu correo, sin contraseñas.
          </p>

          <div className="mt-8 text-left">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              Correo
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: 'var(--recipe-muted)' }}
              />
              <input
                type="email"
                className="w-full pl-12 pr-4 py-3 rounded-xl border text-base focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--rule)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@gmail.com"
                onKeyDown={(e) => e.key === 'Enter' && sendLink()}
              />
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-xl px-4 py-3 text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'hsl(var(--primary))' }}
            onClick={sendLink}
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Enviar link mágico'}
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