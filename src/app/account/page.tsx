'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Users, BookOpen, LogOut, ArrowRightLeft, Check } from 'lucide-react'

type ProfileData = {
  email: string | null
  displayName: string | null
  familyName: string | null
  familyCode: string | null
  members: { id: string; display_name: string; role: string; user_id: string }[]
  myUserId: string | null
  cookbookTitle: string | null
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  /* nombre editable */
  const [nameEditing, setNameEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const fid = localStorage.getItem('active_family_id')

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (!user) {
        router.push('/login')
        return
      }

      // Email del usuario
      const email = user.email ?? null
      const myUserId = user.id

      if (!fid) {
        setProfile({ email, displayName: null, familyName: null, familyCode: null, members: [], myUserId, cookbookTitle: null })
        setLoading(false)
        return
      }

      // Familia
      const { data: family } = await supabase
        .from('families')
        .select('name, code')
        .eq('id', fid)
        .single()

      // Mi member row
      const { data: myMember } = await supabase
        .from('family_members')
        .select('display_name, role')
        .eq('family_id', fid)
        .eq('user_id', myUserId)
        .single()

      // Todos los miembros
      const { data: members } = await supabase
        .from('family_members')
        .select('id, display_name, role, user_id')
        .eq('family_id', fid)
        .order('created_at', { ascending: true })

      // Mi recetario
      const { data: cookbook } = await supabase
        .from('cookbooks')
        .select('title')
        .eq('family_id', fid)
        .eq('owner_id', myUserId)
        .single()

      const displayName = myMember?.display_name ?? null

      setNewName(displayName ?? '')
      setProfile({
        email,
        displayName,
        familyName: family?.name ?? null,
        familyCode: family?.code ?? null,
        members: (members ?? []) as ProfileData['members'],
        myUserId,
        cookbookTitle: cookbook?.title ?? null,
      })
      setLoading(false)
    }

    load()
  }, [router])

  const saveDisplayName = async () => {
    if (!newName.trim()) return
    setNameSaving(true)
    setNameMsg('')
    const fid = localStorage.getItem('active_family_id')
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    const { error } = await supabase
      .from('family_members')
      .update({ display_name: newName.trim() })
      .eq('family_id', fid)
      .eq('user_id', userId)

    if (error) {
      setNameMsg('Error al guardar')
    } else {
      setProfile((p) => p ? { ...p, displayName: newName.trim() } : p)
      setNameEditing(false)
    }
    setNameSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('active_family_id')
    router.push('/login')
  }

  const handleChangeFamily = () => {
    localStorage.removeItem('active_family_id')
    router.push('/join')
  }

  /* ── UI ── */
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">

      {/* Back */}
      <button
        className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--recipe-muted)' }}
        onClick={() => router.push('/library')}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a biblioteca
      </button>

      {/* Title */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 48, height: 48, background: 'rgba(173,131,101,0.12)' }}
        >
          <User className="w-5 h-5" style={{ color: '#ad8365' }} />
        </div>
        <div>
          <h1 className="title-font text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Mi cuenta
          </h1>
          <p className="text-sm" style={{ color: 'var(--recipe-muted)' }}>
            Configuracion y perfil
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--recipe-muted)' }}>Cargando…</p>
      ) : !profile ? (
        <p style={{ color: 'var(--recipe-muted)' }}>No se pudo cargar tu perfil.</p>
      ) : (
        <div className="space-y-5 animate-fade-up">

          {/* ── Perfil ── */}
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: '#ad8365' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--recipe-muted)' }}>
                Perfil
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {profile.email && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span style={{ color: 'var(--recipe-muted)' }}>Correo</span>
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>{profile.email}</span>
                </div>
              )}
              {profile.cookbookTitle && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span style={{ color: 'var(--recipe-muted)' }}>Tu recetario</span>
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>
                    <BookOpen className="inline w-3.5 h-3.5 mr-1 opacity-60" />
                    {profile.cookbookTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Nombre en familia ── */}
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: '#ad8365' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--recipe-muted)' }}>
                Nombre en la familia
              </span>
            </div>

            <p className="text-sm" style={{ color: 'var(--recipe-muted)' }}>
              Este nombre aparece en tu familia y en el título de tu recetario.
            </p>

            {nameEditing ? (
              <div className="flex flex-wrap gap-2">
                <input
                  className="planner-input flex-1 py-2 text-sm min-w-[160px]"
                  style={{ color: 'var(--ink)' }}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tu nombre"
                  onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                />
                <button
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: 'hsl(var(--primary))' }}
                  onClick={saveDisplayName}
                  disabled={nameSaving || !newName.trim()}
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar
                </button>
                <button
                  className="rounded-xl border px-4 py-2 text-sm"
                  style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                  onClick={() => { setNameEditing(false); setNewName(profile.displayName ?? '') }}
                >
                  Cancelar
                </button>
                {nameMsg && <p className="w-full text-xs text-rose-600">{nameMsg}</p>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                  {profile.displayName || 'Sin nombre'}
                </span>
                <button
                  className="rounded-xl border px-4 py-2 text-sm transition-opacity hover:opacity-70"
                  style={{ borderColor: 'var(--rule)', color: 'var(--ink)', background: 'transparent' }}
                  onClick={() => setNameEditing(true)}
                >
                  Cambiar nombre
                </button>
              </div>
            )}
          </div>

          {/* ── Familia ── */}
          {(profile.familyName || profile.members.length > 0) && (
            <div
              className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: '#ad8365' }} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--recipe-muted)' }}>
                  Familia{profile.familyName ? `: ${profile.familyName}` : ''}
                </span>
              </div>

              {profile.familyCode && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span style={{ color: 'var(--recipe-muted)' }}>Código de familia</span>
                  <span className="text-lg font-extrabold tracking-[0.2em]" style={{ color: 'var(--ink)' }}>
                    {profile.familyCode}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs" style={{ color: 'var(--recipe-muted)' }}>
                  Miembros ({profile.members.length}):
                </p>
                {profile.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: m.user_id === profile.myUserId
                        ? 'rgba(173,131,101,0.08)'
                        : 'transparent',
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {m.display_name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--recipe-muted)' }}>
                      {m.role === 'admin' ? 'Creador' : 'Miembro'}
                      {m.user_id === profile.myUserId ? ' (tú)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink)', background: 'var(--paper)' }}
              onClick={handleChangeFamily}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Cambiar familia
            </button>
            <button
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626', background: 'transparent' }}
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>

        </div>
      )}
    </main>
  )
}