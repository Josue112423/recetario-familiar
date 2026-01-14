'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const sendMagicLink = async () => {
    setStatus('sending')
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
      emailRedirectTo: `${window.location.origin}/join`,
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage('Listo ✅ Te mandé un enlace a tu correo para entrar.')
  }

  return (
    <main style={{ maxWidth: 520, margin: '60px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Recetario Familiar</h1>
      <p style={{ marginBottom: 24, fontSize: 16, opacity: 0.8 }}>
        Entra con tu correo. Te mandamos un enlace (sin contraseña).
      </p>

      <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Correo</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu_correo@gmail.com"
        style={{
          width: '100%',
          padding: 14,
          fontSize: 18,
          borderRadius: 10,
          border: '1px solid #ccc',
          marginBottom: 16,
        }}
      />

      <button
        onClick={sendMagicLink}
        disabled={!email || status === 'sending'}
        style={{
          width: '100%',
          padding: 14,
          fontSize: 18,
          borderRadius: 10,
          border: 'none',
          cursor: !email || status === 'sending' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'sending' ? 'Enviando...' : 'Enviarme enlace'}
      </button>

      {message && (
        <p style={{ marginTop: 16, fontSize: 16 }}>
          {message}
        </p>
      )}
    </main>
  )
}
