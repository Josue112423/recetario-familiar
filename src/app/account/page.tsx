'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Users, BookOpen, LogOut,
  ArrowRightLeft, Check, Palette, Upload, X,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────── */
type Member = { id: string; display_name: string; role: string; user_id: string }

type ProfileData = {
  email: string | null
  displayName: string | null
  familyName: string | null
  familyCode: string | null
  members: Member[]
  myUserId: string | null
  cookbookId: string | null
  cookbookTitle: string | null
  cookbookColor: string | null
}

type ColorMode = 'presets' | 'custom'

/* ─── Color helpers ──────────────────────────────────── */
const PRESETS = [
  { key: 'brown',  label: 'Café',     spine: '#8B6F47', cover: 'linear-gradient(180deg,#c2956a 0%,#a07a50 100%)', ink: '#fff8f0' },
  { key: 'red',    label: 'Rojo',     spine: '#8B4444', cover: 'linear-gradient(180deg,#b85c5c 0%,#8B4444 100%)', ink: '#fff0f0' },
  { key: 'blue',   label: 'Azul',     spine: '#446688', cover: 'linear-gradient(180deg,#5c8bb8 0%,#446688 100%)', ink: '#f0f6ff' },
  { key: 'green',  label: 'Verde',    spine: '#3d7a56', cover: 'linear-gradient(180deg,#5ca87a 0%,#3d7a56 100%)', ink: '#f0fff6' },
  { key: 'purple', label: 'Morado',   spine: '#6d5090', cover: 'linear-gradient(180deg,#9678b8 0%,#6d5090 100%)', ink: '#f6f0ff' },
  { key: 'gold',   label: 'Dorado',   spine: '#9a7d3a', cover: 'linear-gradient(180deg,#c4a35a 0%,#9a7d3a 100%)', ink: '#fff8e8' },
  { key: 'teal',   label: 'Turquesa', spine: '#4a7878', cover: 'linear-gradient(180deg,#6b9e9e 0%,#4a7878 100%)', ink: '#f0ffff' },
  { key: 'pink',   label: 'Rosa',     spine: '#99526b', cover: 'linear-gradient(180deg,#c47a96 0%,#99526b 100%)', ink: '#fff0f6' },
  { key: 'orange', label: 'Naranja',  spine: '#b06b2a', cover: 'linear-gradient(180deg,#d49350 0%,#b06b2a 100%)', ink: '#fff5e8' },
]

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0
  const l = (max+min)/2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    if (max===r) h = ((g-b)/d+(g<b?6:0))/6
    else if (max===g) h = ((b-r)/d+2)/6
    else h = ((r-g)/d+4)/6
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) }
}

function hslToHex(h: number, s: number, l: number) {
  s/=100; l/=100
  const a = s*Math.min(l,1-l)
  const f = (n: number) => {
    const k = (n+h/30)%12
    const c = l - a*Math.max(Math.min(k-3,9-k,1),-1)
    return Math.round(255*c).toString(16).padStart(2,'0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function darken(hex: string, amt: number) {
  const {h,s,l} = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, l-amt))
}

function lightText(hex: string) {
  const {h,s,l} = hexToHsl(hex)
  return l > 55
    ? hslToHex(h, Math.min(100,s+10), Math.max(0,l-60))
    : hslToHex(h, Math.min(30,s), Math.min(97,l+50))
}

function buildCustomStyle(hex: string) {
  return {
    spine: darken(hex, 18),
    cover: `linear-gradient(180deg,${hex} 0%,${darken(hex,12)} 100%)`,
    ink: lightText(hex),
  }
}

function presetStyle(key: string) {
  return PRESETS.find(p => p.key === key) ?? PRESETS[0]
}

function bookStyleFromColor(color: string | null) {
  if (!color) return presetStyle('brown')
  if (PRESETS.find(p => p.key === color)) return presetStyle(color)
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return buildCustomStyle(color)
  return presetStyle('brown')
}

/* ─── Mini Book Preview ──────────────────────────────── */
type BookStyle = { spine: string; cover: string; ink: string }

function BookPreview({ title, style }: { title: string; style: BookStyle }) {
  return (
    <div style={{ position: 'relative', width: 56, height: 80 }}>
      <div style={{
        width: 56, height: 80, borderRadius: '3px 5px 5px 3px',
        boxShadow: '2px 3px 10px rgba(30,20,10,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:8, background: style.spine, borderRadius:'3px 0 0 3px' }} />
        <div style={{
          position:'absolute', left:8, top:0, right:0, bottom:0,
          background: style.cover, color: style.ink,
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', padding:'6px 4px', textAlign:'center',
        }}>
          <span style={{ fontFamily:"'Comfortaa',cursive", fontSize:7, fontWeight:700, lineHeight:1.3, wordBreak:'break-word' }}>
            {title}
          </span>
          <span style={{ fontSize:5, fontWeight:800, letterSpacing:'0.12em', marginTop:4, opacity:0.85 }}>
            RECETARIO
          </span>
        </div>
        <div style={{
          position:'absolute', top:3, bottom:3, right:-3, width:4,
          borderRadius:'0 2px 2px 0',
          background:'repeating-linear-gradient(to bottom,#f5efe6 0px,#f5efe6 2px,#e8dfd1 2px,#e8dfd1 3px)',
        }} />
      </div>
    </div>
  )
}

/* ─── Hue Wheel ─────────────────────────────────────── */
function HueWheel({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const size = 160, center = 80, outerR = 78, innerR = 58
  const dragging = useRef(false)

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0,0,size,size)
    for (let a=0; a<360; a++) {
      const s = ((a-1)*Math.PI)/180, e = ((a+1)*Math.PI)/180
      ctx.beginPath(); ctx.arc(center,center,outerR,s,e); ctx.arc(center,center,innerR,e,s,true)
      ctx.closePath(); ctx.fillStyle=`hsl(${a},80%,55%)`; ctx.fill()
    }
    const ia = ((hue-90)*Math.PI)/180, midR=(outerR+innerR)/2
    const ix = center+Math.cos(ia)*midR, iy = center+Math.sin(ia)*midR
    ctx.beginPath(); ctx.arc(ix,iy,8,0,Math.PI*2)
    ctx.fillStyle=`hsl(${hue},80%,55%)`; ctx.fill()
    ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.stroke()
  }, [hue])

  const getHue = useCallback((cx: number, cy: number) => {
    const canvas = ref.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = cx-rect.left-center, y = cy-rect.top-center
    let a = Math.atan2(y,x)*(180/Math.PI)+90
    if (a<0) a+=360
    onChange(Math.round(a)%360)
  }, [onChange])

  useEffect(() => {
    const mm = (e: MouseEvent) => { if (dragging.current) getHue(e.clientX,e.clientY) }
    const mu = () => { dragging.current=false }
    const tm = (e: TouchEvent) => { if (dragging.current && e.touches[0]) getHue(e.touches[0].clientX,e.touches[0].clientY) }
    window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu)
    window.addEventListener('touchmove',tm,{passive:true}); window.addEventListener('touchend',mu)
    return () => { window.removeEventListener('mousemove',mm); window.removeEventListener('mouseup',mu); window.removeEventListener('touchmove',tm); window.removeEventListener('touchend',mu) }
  }, [getHue])

  return (
    <canvas ref={ref} width={size} height={size} className="cursor-pointer touch-none"
      onMouseDown={(e) => { dragging.current=true; getHue(e.clientX,e.clientY) }}
      onTouchStart={(e) => { dragging.current=true; if(e.touches[0]) getHue(e.touches[0].clientX,e.touches[0].clientY) }}
    />
  )
}

/* ─── Main Component ─────────────────────────────────── */
export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  /* nombre */
  const [nameEditing, setNameEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState('')

  /* color */
  const [colorMode, setColorMode] = useState<ColorMode>('presets')
  const [colorSaving, setColorSaving] = useState(false)
  const [colorMsg, setColorMsg] = useState('')

  /* custom color state */
  const [hsl, setHsl] = useState({ h: 25, s: 60, l: 55 })
  const [hexInput, setHexInput] = useState('')

  const customHex = hslToHex(hsl.h, hsl.s, hsl.l)
  const rgbFromHex = (hex: string) => ({
    r: parseInt(hex.slice(1,3),16),
    g: parseInt(hex.slice(3,5),16),
    b: parseInt(hex.slice(5,7),16),
  })
  const rgb = rgbFromHex(customHex)

  /* sync hexInput with hsl */
  useEffect(() => { setHexInput(customHex) }, [customHex])

  /* ── Load profile ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const fid = localStorage.getItem('active_family_id')
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) { router.push('/login'); return }

      const myUserId = user.id

      if (!fid) {
        setProfile({ email: user.email??null, displayName:null, familyName:null, familyCode:null, members:[], myUserId, cookbookId:null, cookbookTitle:null, cookbookColor:null })
        setLoading(false); return
      }

      const [{ data: family }, { data: myMember }, { data: members }, { data: cookbook }] = await Promise.all([
        supabase.from('families').select('name,code').eq('id',fid).single(),
        supabase.from('family_members').select('display_name,role').eq('family_id',fid).eq('user_id',myUserId).single(),
        supabase.from('family_members').select('id,display_name,role,user_id').eq('family_id',fid).order('created_at',{ascending:true}),
        supabase.from('cookbooks').select('id,title,color').eq('family_id',fid).eq('owner_id',myUserId).single(),
      ])

      const displayName = myMember?.display_name ?? null
      setNewName(displayName ?? '')

      // Init custom color from saved color if it's a hex
      const savedColor = cookbook?.color ?? null
      if (savedColor && /^#[0-9a-fA-F]{6}$/.test(savedColor)) {
        setHsl(hexToHsl(savedColor))
        setColorMode('custom')
      }

      setProfile({
        email: user.email ?? null,
        displayName,
        familyName: family?.name ?? null,
        familyCode: family?.code ?? null,
        members: (members ?? []) as Member[],
        myUserId,
        cookbookId: cookbook?.id ?? null,
        cookbookTitle: cookbook?.title ?? null,
        cookbookColor: savedColor,
      })
      setLoading(false)
    }
    load()
  }, [router])

  /* ── Save display name ── */
  const saveDisplayName = async () => {
    if (!newName.trim()) return
    setNameSaving(true); setNameMsg('')
    const fid = localStorage.getItem('active_family_id')
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('family_members')
      .update({ display_name: newName.trim() })
      .eq('family_id', fid)
      .eq('user_id', userData.user?.id)
    if (error) setNameMsg('Error al guardar')
    else {
      setProfile(p => p ? { ...p, displayName: newName.trim() } : p)
      setNameEditing(false)
    }
    setNameSaving(false)
  }

  /* ── Save color ── */
  const saveColor = async (color: string) => {
    if (!profile?.cookbookId) return
    setColorSaving(true); setColorMsg('')
    const { error } = await supabase.from('cookbooks')
      .update({ color })
      .eq('id', profile.cookbookId)
    if (error) setColorMsg('Error al guardar color')
    else setProfile(p => p ? { ...p, cookbookColor: color } : p)
    setColorSaving(false)
  }

  const handleApplyCustom = () => saveColor(customHex)

  const handleHexInput = (val: string) => {
    setHexInput(val)
    if (/^#[0-9a-fA-F]{6}$/.test(val)) setHsl(hexToHsl(val))
  }

  /* ── Misc ── */
  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('active_family_id')
    router.push('/login')
  }

  const currentStyle = bookStyleFromColor(profile?.cookbookColor ?? null)
  const previewStyle = colorMode === 'custom' ? buildCustomStyle(customHex) : currentStyle

  /* ── Render ── */
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">

      <button className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--recipe-muted)' }} onClick={() => router.push('/library')}>
        <ArrowLeft className="w-4 h-4" /> Volver a biblioteca
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center rounded-full"
          style={{ width:48, height:48, background:'rgba(173,131,101,0.12)' }}>
          <User className="w-5 h-5" style={{ color:'#ad8365' }} />
        </div>
        <div>
          <h1 className="title-font text-3xl font-bold" style={{ color:'var(--ink)' }}>Mi cuenta</h1>
          <p className="text-sm" style={{ color:'var(--recipe-muted)' }}>Configuracion y perfil</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'var(--recipe-muted)' }}>Cargando…</p>
      ) : !profile ? (
        <p style={{ color:'var(--recipe-muted)' }}>No se pudo cargar tu perfil.</p>
      ) : (
        <div className="space-y-5 animate-fade-up">

          {/* ── Perfil ── */}
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ borderColor:'var(--rule)', background:'var(--paper)' }}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color:'#ad8365' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color:'var(--recipe-muted)' }}>Perfil</span>
            </div>
            <div className="space-y-2 text-sm">
              {profile.email && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span style={{ color:'var(--recipe-muted)' }}>Correo</span>
                  <span className="font-medium" style={{ color:'var(--ink)' }}>{profile.email}</span>
                </div>
              )}
              {profile.cookbookTitle && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span style={{ color:'var(--recipe-muted)' }}>Tu recetario</span>
                  <span className="font-medium" style={{ color:'var(--ink)' }}>
                    <BookOpen className="inline w-3.5 h-3.5 mr-1 opacity-60" />{profile.cookbookTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Nombre ── */}
          <div className="rounded-2xl border p-5 space-y-4"
            style={{ borderColor:'var(--rule)', background:'var(--paper)' }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color:'#ad8365' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color:'var(--recipe-muted)' }}>Nombre en la familia</span>
            </div>
            <p className="text-sm" style={{ color:'var(--recipe-muted)' }}>
              Este nombre aparece en tu familia y en el título de tu recetario.
            </p>
            {nameEditing ? (
              <div className="flex flex-wrap gap-2">
                <input className="planner-input flex-1 py-2 text-sm min-w-[160px]"
                  style={{ color:'var(--ink)' }} value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && saveDisplayName()}
                  placeholder="Tu nombre" />
                <button className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background:'hsl(var(--primary))' }}
                  onClick={saveDisplayName} disabled={nameSaving||!newName.trim()}>
                  <Check className="w-3.5 h-3.5" /> Guardar
                </button>
                <button className="rounded-xl border px-4 py-2 text-sm"
                  style={{ borderColor:'var(--rule)', color:'var(--ink)' }}
                  onClick={() => { setNameEditing(false); setNewName(profile.displayName??'') }}>
                  Cancelar
                </button>
                {nameMsg && <p className="w-full text-xs text-rose-600">{nameMsg}</p>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold" style={{ color:'var(--ink)' }}>
                  {profile.displayName || 'Sin nombre'}
                </span>
                <button className="rounded-xl border px-4 py-2 text-sm hover:opacity-70 transition-opacity"
                  style={{ borderColor:'var(--rule)', color:'var(--ink)' }}
                  onClick={() => setNameEditing(true)}>
                  Cambiar nombre
                </button>
              </div>
            )}
          </div>

          {/* ── Color del recetario ── */}
          <div className="rounded-2xl border p-5 space-y-4"
            style={{ borderColor:'var(--rule)', background:'var(--paper)' }}>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color:'#ad8365' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color:'var(--recipe-muted)' }}>Portada de tu recetario</span>
            </div>
            <p className="text-sm" style={{ color:'var(--recipe-muted)' }}>
              Personaliza tu libro de recetas. Elige un color predefinido o crea tu propio color.
            </p>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor:'var(--rule)' }}>
              {(['presets','custom'] as ColorMode[]).map((m) => (
                <button key={m} onClick={() => setColorMode(m)}
                  className="flex-1 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: colorMode===m ? 'var(--paper)' : 'rgba(40,35,30,0.04)',
                    color: colorMode===m ? 'var(--ink)' : 'var(--recipe-muted)',
                    borderRight: m==='presets' ? `1px solid var(--rule)` : 'none',
                  }}>
                  {m==='presets' ? '🎨 Colores' : '⚙ Personalizado'}
                </button>
              ))}
            </div>

            {/* Presets */}
            {colorMode === 'presets' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(p => {
                    const active = profile.cookbookColor === p.key
                    return (
                      <button key={p.key} onClick={() => saveColor(p.key)}
                        disabled={colorSaving}
                        className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all"
                        style={{
                          border: `2px solid ${active ? '#ad8365' : 'transparent'}`,
                          background: active ? 'rgba(173,131,101,0.08)' : 'transparent',
                        }}>
                        <div style={{
                          width:32, height:44, borderRadius:'2px 4px 4px 2px',
                          background: p.cover, boxShadow:'1px 2px 6px rgba(30,20,10,0.2)',
                          position:'relative', overflow:'hidden',
                        }}>
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background:p.spine }} />
                        </div>
                        <span className="text-xs" style={{ color:'var(--recipe-muted)' }}>{p.label}</span>
                        {active && <Check className="w-3 h-3" style={{ color:'#ad8365' }} />}
                      </button>
                    )
                  })}
                </div>
                {colorMsg && <p className="text-xs text-rose-600">{colorMsg}</p>}
              </div>
            )}

            {/* Custom */}
            {colorMode === 'custom' && (
              <div className="space-y-5">
                <div className="flex gap-6 items-start flex-wrap">
                  {/* Hue wheel */}
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ position:'relative', width:160, height:160 }}>
                      <HueWheel hue={hsl.h} onChange={h => setHsl(v => ({...v, h}))} />
                      {/* Center preview */}
                      <div style={{
                        position:'absolute', top:'50%', left:'50%',
                        transform:'translate(-50%,-50%)',
                        width:56, height:56, borderRadius:8,
                        background: customHex,
                        boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
                        border:'2px solid rgba(255,255,255,0.8)',
                      }} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <BookPreview title={profile.cookbookTitle ?? 'Recetario'} style={previewStyle} />
                      <span className="text-xs" style={{ color:'var(--recipe-muted)' }}>Vista previa</span>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 space-y-4 min-w-[200px]">
                    {/* HSL */}
                    <div>
                      <label className="text-xs font-bold tracking-wider" style={{ color:'var(--recipe-muted)' }}>HSL</label>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {(['h','s','l'] as const).map(k => (
                          <div key={k}>
                            <span className="text-[10px] uppercase" style={{ color:'var(--recipe-muted)' }}>{k}</span>
                            <input type="number" className="planner-input w-full py-1 text-sm text-center"
                              style={{ color:'var(--ink)' }}
                              value={hsl[k]}
                              min={0} max={k==='h'?360:100}
                              onChange={e => setHsl(v => ({...v, [k]: Number(e.target.value)}))} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RGB */}
                    <div>
                      <label className="text-xs font-bold tracking-wider" style={{ color:'var(--recipe-muted)' }}>RGB</label>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {(['r','g','b'] as const).map(k => (
                          <div key={k}>
                            <span className="text-[10px] uppercase" style={{ color:'var(--recipe-muted)' }}>{k}</span>
                            <input type="number" className="planner-input w-full py-1 text-sm text-center"
                              style={{ color:'var(--ink)' }}
                              value={rgb[k]} min={0} max={255}
                              onChange={e => {
                                const newRgb = {...rgb, [k]: Number(e.target.value)}
                                const hex = '#'+[newRgb.r,newRgb.g,newRgb.b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('')
                                setHsl(hexToHsl(hex))
                              }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* HEX */}
                    <div>
                      <label className="text-xs font-bold tracking-wider" style={{ color:'var(--recipe-muted)' }}>HEX</label>
                      <div className="mt-1 flex gap-2 items-center">
                        <input className="planner-input flex-1 py-1.5 text-sm"
                          style={{ color:'var(--ink)' }}
                          value={hexInput}
                          onChange={e => handleHexInput(e.target.value)} />
                        <div style={{ width:32, height:32, borderRadius:6, background:customHex, border:'1px solid var(--rule)', flexShrink:0 }} />
                      </div>
                    </div>

                    {/* Sliders S & L */}
                    <div>
                      <label className="text-xs font-bold tracking-wider" style={{ color:'var(--recipe-muted)' }}>Saturacion y brillo</label>
                      <div className="mt-2 space-y-3">
                        <div>
                          <input type="range" min={0} max={100} value={hsl.s}
                            onChange={e => setHsl(v=>({...v, s:Number(e.target.value)}))}
                            className="w-full accent-[#ad8365]" />
                          <div className="flex justify-between text-[10px]" style={{ color:'var(--recipe-muted)' }}>
                            <span>Gris</span><span>Saturado</span>
                          </div>
                        </div>
                        <div>
                          <input type="range" min={10} max={90} value={hsl.l}
                            onChange={e => setHsl(v=>({...v, l:Number(e.target.value)}))}
                            className="w-full accent-[#ad8365]" />
                          <div className="flex justify-between text-[10px]" style={{ color:'var(--recipe-muted)' }}>
                            <span>Oscuro</span><span>Claro</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleApplyCustom} disabled={colorSaving}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background:'hsl(var(--primary))' }}>
                  <Check className="w-4 h-4" />
                  {colorSaving ? 'Guardando…' : 'Aplicar este color'}
                </button>
                {colorMsg && <p className="text-xs text-rose-600">{colorMsg}</p>}
              </div>
            )}

            {profile.cookbookTitle && (
              <div className="flex items-center gap-2 pt-1">
                <BookOpen className="w-3.5 h-3.5" style={{ color:'var(--recipe-muted)' }} />
                <span className="text-sm" style={{ color:'var(--recipe-muted)' }}>
                  Tu recetario: <b style={{ color:'var(--ink)' }}>{profile.cookbookTitle}</b>
                </span>
              </div>
            )}
          </div>

          {/* ── Familia ── */}
          {(profile.familyName || profile.members.length > 0) && (
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor:'var(--rule)', background:'var(--paper)' }}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color:'#ad8365' }} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color:'var(--recipe-muted)' }}>
                  Familia{profile.familyName ? `: ${profile.familyName}` : ''}
                </span>
              </div>
              {profile.familyCode && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span style={{ color:'var(--recipe-muted)' }}>Código de familia</span>
                  <span className="text-lg font-extrabold tracking-[0.2em]" style={{ color:'var(--ink)' }}>{profile.familyCode}</span>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs" style={{ color:'var(--recipe-muted)' }}>Miembros ({profile.members.length}):</p>
                {profile.members.map(m => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2"
                    style={{ background: m.user_id===profile.myUserId ? 'rgba(173,131,101,0.08)' : 'transparent' }}>
                    <span className="text-sm font-medium" style={{ color:'var(--ink)' }}>{m.display_name}</span>
                    <span className="text-xs" style={{ color:'var(--recipe-muted)' }}>
                      {m.role==='admin' ? 'Creador' : 'Miembro'}{m.user_id===profile.myUserId ? ' (tú)' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ borderColor:'var(--rule)', color:'var(--ink)', background:'var(--paper)' }}
              onClick={() => { localStorage.removeItem('active_family_id'); router.push('/join') }}>
              <ArrowRightLeft className="w-4 h-4" /> Cambiar familia
            </button>
            <button className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ borderColor:'rgba(220,38,38,0.2)', color:'#dc2626', background:'transparent' }}
              onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>

        </div>
      )}
    </main>
  )
}