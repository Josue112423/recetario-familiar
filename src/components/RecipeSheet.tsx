import Image from 'next/image'

export function RecipeSheet({
  title,
  photoUrl,
  meta,
  ingredients,
  steps,
}: {
  title: string
  photoUrl?: string | null
  meta?: string
  ingredients: string
  steps: string
}) {
  return (
    <div className="paper rounded-[28px] p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="title-font recipe-title text-3xl md:text-4xl font-bold">
            {title}
          </h1>
          {meta && <p className="mt-2 text-sm text-[color:var(--muted)]">{meta}</p>}
        </div>

        <div className="hidden md:block text-xs text-[color:var(--muted)]">
          Recetario familiar
        </div>
      </div>

      {photoUrl && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white">
          <Image
            src={photoUrl}
            alt={`Foto de ${title}`}
            width={1200}
            height={800}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      )}

      {/* layout tipo planner: ingredientes izq, pasos der */}
      <div className="mt-8 grid gap-6 md:grid-cols-12">
        <section className="paper-lines rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-5 md:col-span-5">
          <h2 className="title-font text-xl font-bold">Ingredientes</h2>
          <pre className="mt-3 whitespace-pre-wrap text-base leading-7">{ingredients}</pre>
        </section>

        <section className="paper-lines rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)] p-5 md:col-span-7">
          <h2 className="title-font text-xl font-bold">Pasos</h2>
          <pre className="mt-3 whitespace-pre-wrap text-base leading-7">{steps}</pre>
        </section>
      </div>
    </div>
  )
}
