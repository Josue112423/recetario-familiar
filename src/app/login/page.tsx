'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

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
        email, 
        options: { emailRedirectTo: 'https://recetario-familiar-jg7a.vercel.app/join',
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
    <main className="mx-auto max-w-md px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-extrabold">Iniciar sesión</h1>
      <p className="mt-2 text-slate-800">Te mandamos un link al correo para entrar.</p>

      <label className="mt-6 block text-sm font-semibold">Correo</label>
      <input
        className="mt-2 w-full rounded-xl border px-4 py-3 text-lg"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tucorreo@gmail.com"
      />

      <button
        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-white hover:opacity-90 disabled:opacity-50"
        onClick={sendLink}
        disabled={loading}
      >
        {loading ? 'Enviando…' : 'Enviar link'}
      </button>

      {msg && <p className="mt-4 text-slate-800">{msg}</p>}

      <button
        className="mt-6 w-full rounded-xl border bg-white px-4 py-3 hover:bg-slate-50"
        onClick={() => router.push('/join')}
      >
        Ya tengo sesión / Ir a unirme
      </button>
    </main>
  )
}
