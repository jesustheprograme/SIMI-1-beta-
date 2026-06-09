export function PlanoPageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Plano operativo</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Editor simple de plano</h1>
      </div>
      <p className="max-w-xl text-sm leading-6 text-zinc-600">
        Sube una imagen, recortala y ajusta su tamano directamente en el plano con las aristas del marco.
      </p>
    </div>
  )
}
