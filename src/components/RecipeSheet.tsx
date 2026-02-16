import Image from 'next/image'

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
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
}: {
  title: string
  photoUrl?: string | null
  metaLeft?: string
  metaMid?: string
  metaRight?: string
  ingredients: string
  steps: string
  notes?: string
  onEdit?: () => void
  onCook?: () => void
}) {

  const ing = parseLines(ingredients)
  const st = parseLines(steps)

  return (
  <div className="relative">
    <div className="planner-card rounded-[34px] p-6 md:p-8">
      {/* ...todo tu contenido actual... */}
    </div>

    {/* Tabs laterales */}
    <div className="absolute right-[-14px] top-28 hidden md:flex flex-col gap-3">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-l-2xl rounded-r-xl border planner-divider bg-[color:var(--paper)] px-4 py-3 text-sm font-semibold text-[color:var(--ink)] shadow-sm hover:brightness-95"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Editar
        </button>
      )}

      {onCook && (
        <button
          type="button"
          onClick={onCook}
          className="rounded-l-2xl rounded-r-xl border planner-divider bg-amber-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-800"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Cocinar
        </button>
      )}
    </div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-[color:var(--muted)]">Recetario familiar</div>
          <h1 className="title-font mt-1 text-3xl md:text-4xl font-bold tracking-wide">
            {title}
          </h1>
        </div>

        {/* mini “tabs” (decorativo) */}
        <div className="hidden md:flex flex-col items-end gap-2 text-[10px] text-[color:var(--muted)]">
          <div className="rounded-full border px-3 py-1 planner-divider">RECIPES</div>
          <div className="rounded-full border px-3 py-1 planner-divider">FAMILY</div>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs md:text-sm text-[color:var(--muted)]">
        <div className="rounded-2xl border px-3 py-2 planner-divider">
          <div className="font-semibold text-[color:var(--ink)]">Prep</div>
          <div>{metaLeft ?? '—'}</div>
        </div>
        <div className="rounded-2xl border px-3 py-2 planner-divider">
          <div className="font-semibold text-[color:var(--ink)]">Cook</div>
          <div>{metaMid ?? '—'}</div>
        </div>
        <div className="rounded-2xl border px-3 py-2 planner-divider">
          <div className="font-semibold text-[color:var(--ink)]">Serves</div>
          <div>{metaRight ?? '—'}</div>
        </div>
      </div>

      <div className="mt-6 border-t planner-divider" />

      {/* Main grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-12">
        {/* LEFT: photo + ingredients */}
        <div className="md:col-span-5">
          {photoUrl ? (
            <div className="overflow-hidden rounded-3xl border bg-white planner-divider">
              <Image
                src={photoUrl}
                alt={`Foto de ${title}`}
                width={1200}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          ) : (
            <div className="h-[220px] rounded-3xl border planner-divider bg-white/40" />
          )}

          <div className="mt-5">
            <div className="text-xs font-bold tracking-widest text-[color:var(--muted)]">
              INGREDIENTES
            </div>

            <div className="planner-lines mt-3 rounded-2xl border planner-divider p-4">
              <ul className="space-y-2 text-sm">
                {ing.map((line, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-4 w-4 rounded border planner-divider bg-white" />
                    <span className="leading-6">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* RIGHT: directions */}
        <div className="md:col-span-7">
          <div className="text-xs font-bold tracking-widest text-[color:var(--muted)]">
            DIRECCIONES
          </div>

          <div className="planner-lines mt-3 rounded-2xl border planner-divider p-5">
            <ol className="space-y-3 text-sm leading-7">
              {st.map((line, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="w-6 text-right font-semibold text-[color:var(--muted)]">
                    {idx + 1}.
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 border-t planner-divider" />
      <div className="mt-5">
        <div className="text-xs font-bold tracking-widest text-[color:var(--muted)]">
          NOTAS
        </div>
        <div className="planner-lines mt-3 rounded-2xl border planner-divider p-4 text-sm leading-7">
          {notes?.trim() ? notes : '—'}
        </div>
      </div>
    </div>
  )
}
