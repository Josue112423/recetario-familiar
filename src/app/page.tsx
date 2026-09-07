'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { BookOpen, ChefHat, Users, Heart } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      // Esto "absorbe" el hash (#...) si viene del magic link
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
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center px-6 py-20 md:py-28"
        style={{ minHeight: '80vh' }}
      >
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(/attached_assets/kitchen-hero.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px)',
          }}
        />
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(30,20,10,0.55) 0%, rgba(30,20,10,0.7) 50%, rgba(242,234,220,1) 100%)',
          }}
        />

        <img
          src="/attached_assets/decor-herbs.png"
          alt=""
          className="absolute top-4 left-4 z-0 hidden md:block"
          style={{ width: 200, opacity: 0.15, transform: 'rotate(-15deg)' }}
        />
        <img
          src="/attached_assets/decor-kitchen.png"
          alt=""
          className="absolute bottom-20 right-4 z-0 hidden md:block"
          style={{ width: 180, opacity: 0.12, transform: 'rotate(10deg)' }}
        />

        <div className="relative z-10 mx-auto max-w-lg text-center">
          <div
            className="mx-auto flex items-center justify-center rounded-full p-4"
            style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          >
            <BookOpen style={{ width: 40, height: 40, color: '#f7f0e4' }} />
          </div>

          <h1
            className="title-font mt-8 text-5xl md:text-6xl font-bold tracking-wide animate-fade-up"
            style={{ color: '#f7f0e4', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            Recetario Familiar
          </h1>

          <p
            className="mt-4 text-lg leading-relaxed animate-fade-up animate-fade-up-delay-1"
            style={{ color: 'rgba(247,240,228,0.85)' }}
          >
            Preserva las recetas de tu familia en un solo lugar. Comparte con tus seres queridos
            y cocinen juntos las recetas que han pasado de generación en generación.
          </p>

          <button
            className="mt-8 animate-fade-up animate-fade-up-delay-2 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
            style={{ fontSize: '1.1rem', padding: '12px 32px', background: 'hsl(var(--primary))' }}
            onClick={() => router.push('/login')}
          >
            Iniciar sesión
          </button>

          <p className="mt-4 text-sm animate-fade-up animate-fade-up-delay-3" style={{ color: 'rgba(247,240,228,0.6)' }}>
            Usa tu correo, Google, GitHub o Apple para entrar.
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-16" style={{ background: 'var(--planner-bg)' }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="title-font text-center text-2xl md:text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Tu cocina, tu familia, tus recetas
          </h2>
          <p className="mt-3 text-center handwritten text-lg" style={{ color: 'var(--recipe-muted)' }}>
            Todo en un solo lugar bonito
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="planner-card rounded-2xl p-6 text-center animate-fade-up">
              <div
                className="mx-auto flex items-center justify-center rounded-full p-3"
                style={{ width: 56, height: 56, background: 'rgba(173,131,101,0.12)' }}
              >
                <Users style={{ width: 28, height: 28, color: '#ad8365' }} />
              </div>
              <h3 className="title-font mt-4 text-lg font-bold" style={{ color: 'var(--ink)' }}>
                Comparte en familia
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Invita a todos con un código de 6 dígitos. Cada quien tiene su recetario.
              </p>
            </div>

            <div className="planner-card rounded-2xl p-6 text-center animate-fade-up animate-fade-up-delay-1">
              <div
                className="mx-auto flex items-center justify-center rounded-full p-3"
                style={{ width: 56, height: 56, background: 'rgba(173,131,101,0.12)' }}
              >
                <ChefHat style={{ width: 28, height: 28, color: '#ad8365' }} />
              </div>
              <h3 className="title-font mt-4 text-lg font-bold" style={{ color: 'var(--ink)' }}>
                Modo cocinar
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Paso a paso con lista de ingredientes. Guarda tu progreso mientras cocinas.
              </p>
            </div>

            <div className="planner-card rounded-2xl p-6 text-center animate-fade-up animate-fade-up-delay-2">
              <div
                className="mx-auto flex items-center justify-center rounded-full p-3"
                style={{ width: 56, height: 56, background: 'rgba(173,131,101,0.12)' }}
              >
                <Heart style={{ width: 28, height: 28, color: '#ad8365' }} />
              </div>
              <h3 className="title-font mt-4 text-lg font-bold" style={{ color: 'var(--ink)' }}>
                Bonito y personal
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--recipe-muted)' }}>
                Cada receta decorada como página de diario, con ilustraciones y tu toque personal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
