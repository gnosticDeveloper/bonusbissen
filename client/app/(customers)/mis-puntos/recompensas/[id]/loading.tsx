export default function Loading() {
  return (
    <div className="min-h-screen px-5 py-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6 animate-pulse">
        {/* Volver */}
        <div className="flex items-center gap-2 self-start">
          <div className="h-5 w-5 rounded-full bg-ink/10" />
          <div className="h-5 w-16 rounded-md bg-ink/10" />
        </div>

        {/* Imagen */}
        <div className="rounded-3xl overflow-hidden bg-cream-dark/30 border border-ink/10">
          <div className="w-full h-56 bg-ink/10" />
        </div>

        {/* Título + puntos */}
        <div className="flex flex-col gap-2">
          <div className="h-8 w-3/4 rounded-md bg-ink/10" />
          <div className="h-6 w-24 rounded-md bg-ink/10" />
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-2">
          <div className="h-5 w-full rounded-md bg-ink/10" />
          <div className="h-5 w-full rounded-md bg-ink/10" />
          <div className="h-5 w-2/3 rounded-md bg-ink/10" />
        </div>

        {/* Botón canjear */}
        <div className="h-15 w-full rounded-2xl bg-ink/10" />
      </div>
    </div>
  );
}
