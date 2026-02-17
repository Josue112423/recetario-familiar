import Image from 'next/image'
import { motion } from 'framer-motion'
import { Edit2, Utensils } from 'lucide-react'

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

type RecipeSheetProps = {
  title: string
  photoUrl?: string | null
  metaLeft?: string | null
  metaMid?: string | null
  metaRight?: string | null
  ingredients: string
  steps: string
  notes?: string | null
  onEdit?: () => void
  onCook?: () => void
}

export function RecipeSheet({
  title,
  photoUrl,
  metaLeft,
  metaMid,
  metaRight,
  ingredients,
  steps,
  notes,
  onEdit,
  onCook,
}: RecipeSheetProps) {
  const ing = parseLines(ingredients)
  const st = parseLines(steps)

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* CARD */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="planner-card relative z-10 rounded-[34px] p-6 md:p-12"
      >
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold tracking-widest text-[#ad8365] uppercase">
              Recetario familiar
            </div>
            <h1 className="title-font text-4xl font-bold tracking-tight md:text-5xl">
              {title}
            </h1>
          </div>

          {/* mini tabs decorativas */}
          <div className="hidden flex-col items-end gap-2 text-[10px] font-bold tracking-widest text-[color:var(--muted)] md:flex">
            <div className="planner-divider rounded-full border px-4 py-1.5 uppercase">Recipes</div>
            <div className="planner-divider rounded-full border px-4 py-1.5 uppercase">Family</div>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-4 text-xs text-[color:var(--muted)] md:text-sm">
          <div className="planner-divider rounded-2xl border bg-white/50 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold tracking-wider uppercase text-[color:var(--ink)]">
              Prep
            </div>
            <div className="text-lg text-[#ad8365]">{metaLeft ?? '—'}</div>
          </div>
          <div className="planner-divider rounded-2xl border bg-white/50 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold tracking-wider uppercase text-[color:var(--ink)]">
              Cook
            </div>
            <div className="text-lg text-[#ad8365]">{metaMid ?? '—'}</div>
          </div>
          <div className="planner-divider rounded-2xl border bg-white/50 px-4 py-3">
            <div className="mb-1 text-[10px] font-bold tracking-wider uppercase text-[color:var(--ink)]">
              Serves
            </div>
            <div className="text-lg text-[#ad8365]">{metaRight ?? '—'}</div>
          </div>
        </div>

        <div className="planner-divider mt-8 border-t" />

        {/* Main grid */}
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          {/* LEFT */}
          <div className="space-y-8 lg:col-span-5">
            {photoUrl ? (
              <div className="planner-divider aspect-[4/3] overflow-hidden rounded-3xl border bg-white shadow-inner">
                {/* IMPORTANTE: para URLs remotas de Supabase, asegúrate de tener next.config.js domains */}
                <Image
                  src={photoUrl}
                  alt={`Foto de ${title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  priority
                />
              </div>
            ) : (
              <div className="planner-divider aspect-[4/3] rounded-3xl border bg-[#f9f7f4] flex items-center justify-center text-black/20">
                <Utensils className="h-16 w-16" />
              </div>
            )}

            <div>
              <div className="mb-4 text-xs font-bold tracking-widest text-[#ad8365] uppercase">
                Ingredientes
              </div>

              <div className="planner-divider rounded-3xl border bg-white/50 p-6 backdrop-blur-sm">
                <ul className="space-y-4 text-sm">
                  {ing.map((line, i) => (
                    <li key={i} className="group flex items-start gap-3">
                      <span className="mt-1.5 inline-flex h-3 w-3 flex-shrink-0 rounded-full border-2 border-[#ad8365]/30 transition-colors group-hover:bg-[#ad8365]" />
                      <span className="leading-relaxed text-[color:var(--ink)]/80">{line}</span>
                    </li>
                  ))}
                  {ing.length === 0 && (
                    <li className="italic text-[color:var(--muted)]">No hay ingredientes.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-8 lg:col-span-7">
            <div>
              <div className="mb-4 text-xs font-bold tracking-widest text-[#ad8365] uppercase">
                Direcciones
              </div>

              <div className="planner-divider rounded-3xl border bg-white/30 p-8">
                <ol className="space-y-6 text-sm leading-relaxed">
                  {st.map((line, idx) => (
                    <li key={idx} className="flex gap-4">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#ad8365]/10 text-xs font-bold text-[#ad8365]">
                        {idx + 1}
                      </span>
                      <span className="pt-1 text-[color:var(--ink)]/90">{line}</span>
                    </li>
                  ))}
                  {st.length === 0 && (
                    <li className="italic text-[color:var(--muted)]">No hay pasos.</li>
                  )}
                </ol>
              </div>
            </div>

            {/* Notes */}
            {notes?.trim() ? (
              <div className="planner-divider border-t pt-6">
                <div className="mb-3 text-xs font-bold tracking-widest text-[#ad8365] uppercase">
                  Notas
                </div>
                <div className="border-l-2 border-[#ad8365]/20 pl-4 text-lg leading-relaxed text-[color:var(--muted)]">
                  {notes}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Desktop Side Buttons (como Replit) */}
      <div className="hidden xl:flex flex-col absolute -right-20 top-20 gap-4">
        {onEdit && (
          <motion.button
            type="button"
            whileHover={{ x: 6 }}
            onClick={onEdit}
            className="rounded-r-2xl px-4 py-8 text-sm font-bold tracking-widest uppercase text-white bg-[#ad8365] shadow-lg shadow-[#ad8365]/20 hover:bg-[#8f6b54] transition-colors"
            style={{ writingMode: 'vertical-rl' }}
          >
            Editar
          </motion.button>
        )}

        {onCook && (
          <motion.button
            type="button"
            whileHover={{ x: 6 }}
            onClick={onCook}
            className="rounded-r-2xl px-4 py-8 text-sm font-bold tracking-widest uppercase text-white bg-[#ad8365] shadow-lg shadow-[#ad8365]/20 hover:bg-[#8f6b54] transition-colors"
            style={{ writingMode: 'vertical-rl' }}
          >
            Cocinar
          </motion.button>
        )}
      </div>

      {/* Mobile FABs */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 xl:hidden">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ad8365]/20 bg-white text-[#ad8365] shadow-lg"
            aria-label="Editar"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        )}
        {onCook && (
          <button
            type="button"
            onClick={onCook}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ad8365] text-white shadow-xl shadow-[#ad8365]/30"
            aria-label="Modo cocinar"
          >
            <Utensils className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  )
}
