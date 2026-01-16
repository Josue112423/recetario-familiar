'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

function makeCode6() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default function JoinPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [familyName, setFamilyName] = useState('Mi familia')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setEmail(u?.email ?? null)
      if (!u) router.replace('/login')
    })
  }, [router])


  const createFamily = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) throw new Error('No hay sesión activa.')

      if (!displayName.trim()) throw new Error('Pon tu nombre (ej. “Abuela Lupita”).')

      // Genera un código único (intenta varias veces por si choca)
      let code = ''
      for (let i = 0; i < 10; i++) {
        const candidate = makeCode6()
        const { data: existing } = await supabase
          .from('families')
          .select('id')
          .eq('code', candidate)
          .maybeSingle()
        if (!existing) {
          code = candidate
          break
        }
      }
      if (!code) throw new Error('No pude generar un código único, intenta de nuevo.')

      // 1) Crea familia
      const { data: fam, error: famErr } = await supabase
        .from('families')
        .insert({
          name: familyName.trim() || 'Mi familia',
          code,
          created_by: user.id,
        })
        .select()
        .single()

      if (famErr) throw famErr

      // 2) Te agrega como miembro admin
      const { error: memErr } = await supabase.from('family_members').insert({
        family_id: fam.id,
        user_id: user.id,
        display_name: displayName.trim(),
        role: 'admin',
      })
      if (memErr) throw memErr

      // 3) Crea tu recetario automático
      const { error: cbErr } = await supabase.from('cookbooks').insert({
        family_id: fam.id,
        owner_id: user.id,
        title: `Recetario de ${displayName.trim()}`,
      })
      if (cbErr) throw cbErr

      setMsg(`Listo ✅ Tu código de familia es: ${code}`)
      localStorage.setItem('active_family_id', fam.id)
      router.push('/library')
    } catch (e: unknown) {
        if (e instanceof Error) {
            setMsg(e.message)
        } else {
            setMsg('Ocurrió un error inesperado')
        }
    } finally {
      setLoading(false)
    }
  }

  const joinFamily = async () => {
  setLoading(true)
  setMsg('')

  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) throw new Error('No hay sesión activa.')

    if (!displayName.trim()) throw new Error('Pon tu nombre (ej. “Abuela Lupita”).')

    const code = familyCode.trim().toUpperCase()
    if (code.length !== 6) throw new Error('El código debe tener 6 dígitos.')

    // 1) Busca familia por código
    const { data: fam, error: famErr } = await supabase
      .from('families')
      .select('id,name,code')
      .eq('code', code)
      .single()

    if (famErr || !fam) throw new Error('Código inválido o familia no encontrada.')

    // 2) ¿Ya soy miembro?
    const { data: existingMembers, error: exErr } = await supabase
      .from('family_members')
      .select('family_id,user_id,display_name')
      .eq('family_id', fam.id)
      .eq('user_id', user.id)
      .limit(1)

    if (exErr) throw exErr
      const existingMember = (existingMembers && existingMembers.length > 0) ? existingMembers[0] : null


    // 3) Si NO existe, insertar; si SÍ existe, no hacemos nada
    if (!existingMember) {
      const { error: memErr } = await supabase.from('family_members').insert({
        family_id: fam.id,
        user_id: user.id,
        display_name: displayName.trim(),
        role: 'member',
      })
      if (memErr) throw memErr
    }

    // 4) Crear tu recetario automático SOLO si no existe ya uno tuyo
    const { data: myCookbook, error: cbCheckErr } = await supabase
      .from('cookbooks')
      .select('id')
      .eq('family_id', fam.id)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (cbCheckErr) throw cbCheckErr

    if (!myCookbook) {
      const { error: cbErr } = await supabase.from('cookbooks').insert({
        family_id: fam.id,
        owner_id: user.id,
        title: `Recetario de ${displayName.trim()}`,
      })
      if (cbErr) throw cbErr
    }

    // 5) Entrar
    localStorage.setItem('active_family_id', fam.id)
    setMsg(`Bienvenido/a ✅ Entraste a: ${fam.name}`)
    router.replace('/library')

  } catch (e: unknown) {
    setMsg(e instanceof Error ? e.message : 'Ocurrió un error inesperado')
  } finally {
    setLoading(false)
  }
  
}


  return (
    <main style={{ maxWidth: 560, margin: '50px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Familia</h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        {email ? `Sesión: ${email}` : 'Cargando sesión...'}
      </p>

      <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Tu nombre en la familia</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder='Ej. "Abuela Lupita"'
            style={{ width: '100%', padding: 14, fontSize: 18, borderRadius: 10, border: '1px solid #ccc', marginTop: 6 }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600 }}>Crear familia (opcional: nombre)</label>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder='Ej. "Familia Patiño"'
            style={{ width: '100%', padding: 14, fontSize: 18, borderRadius: 10, border: '1px solid #ccc', marginTop: 6 }}
          />
        </div>

        <button
          onClick={createFamily}
          disabled={loading}
          style={{ width: '100%', padding: 14, fontSize: 18, borderRadius: 10, border: 'none' }}
        >
          {loading ? 'Procesando...' : 'Crear familia (genera código)'}
        </button>

        <hr style={{ margin: '10px 0' }} />

        <div>
          <label style={{ fontWeight: 600 }}>Código de familia (6 dígitos)</label>
          <input
            value={familyCode}
            onChange={(e) => setFamilyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder='Ej. 123456'
            style={{ width: '100%', padding: 14, fontSize: 18, borderRadius: 10, border: '1px solid #ccc', marginTop: 6, letterSpacing: 4 }}
          />
        </div>

        <button
          onClick={joinFamily}
          disabled={loading}
          style={{ width: '100%', padding: 14, fontSize: 18, borderRadius: 10, border: 'none' }}
        >
          {loading ? 'Procesando...' : 'Unirme a familia'}
        </button>

        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
      </div>
    </main>
  )
}

