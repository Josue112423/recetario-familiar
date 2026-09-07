'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Users, Plus, LogIn } from 'lucide-react'

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

      if (!displayName.trim()) throw new Error('Pon tu nombre (ej. "Abuela Lupita").')

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

      if (!displayName.trim()) throw new Error('Pon tu nombre (ej. "Abuela Lupita").')

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
      const existingMember = existingMembers && existingMembers.length > 0 ? existingMembers[0] : null

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

  const canCreate = !loading && displayName.trim().length > 0
  const canJoin = !loading && displayName.trim().length > 0 && familyCode.length === 6

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--planner-bg)' }}>
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-8 animate-fade-up">
          <div
            className="mx-auto flex items-center justify-center rounded-full p-3"
            style={{ width: 64, height: 64, background: 'rgba(173,131,101,0.12)' }}
          >
            <Users style={{ width: 32, height: 32, color: '#ad8365' }} />
          </div>
          <h1 className="title-font mt-4 text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Familia
          </h1>
          <p className="mt-2 handwritten text-lg" style={{ color: 'var(--recipe-muted)' }}>
            Crea una familia nueva o únete a una existente.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Tu nombre en la familia
            </label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 transition-all"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder='Ej. "Abuela Lupita"'
            />
          </div>

          {/* Crear familia */}
          <div
            className="planner-card rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)' }}
          >
            <h2
              className="title-font text-lg font-bold flex items-center gap-2 mb-4"
              style={{ color: 'var(--ink)' }}
            >
              <Plus style={{ width: 18, height: 18 }} />
              Crear familia
            </h2>

            <label className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Nombre de la familia (opcional)
            </label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 transition-all"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder='Ej. "Familia Patiño"'
            />

            <button
              className="mt-4 w-full rounded-xl px-4 py-3 text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'hsl(var(--primary))' }}
              onClick={createFamily}
              disabled={!canCreate}
            >
              {loading ? 'Procesando…' : 'Crear familia (genera código)'}
            </button>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
            <span className="text-sm" style={{ color: 'var(--recipe-muted)' }}>o</span>
            <div className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
          </div>

          {/* Unirse a familia */}
          <div
            className="planner-card rounded-2xl border p-6"
            style={{ borderColor: 'var(--rule)' }}
          >
            <h2
              className="title-font text-lg font-bold flex items-center gap-2 mb-4"
              style={{ color: 'var(--ink)' }}
            >
              <LogIn style={{ width: 18, height: 18 }} />
              Unirme a una familia
            </h2>

            <label className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Código de familia (6 dígitos)
            </label>
            <input
              className="mt-2 w-full rounded-xl border px-4 py-3 text-lg text-center tracking-[0.3em] focus:outline-none focus:ring-2 transition-all"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
            />

            <button
              className="mt-4 w-full rounded-xl border px-4 py-3 font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)', color: 'var(--ink)' }}
              onClick={joinFamily}
              disabled={!canJoin}
            >
              {loading ? 'Uniéndome…' : 'Unirme a familia'}
            </button>
          </div>

          {msg && (
            <p className="text-center text-sm" style={{ color: 'var(--ink)' }}>
              {msg}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}