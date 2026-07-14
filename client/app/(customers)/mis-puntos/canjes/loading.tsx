export default function Loading() {
  return (
    <div className="min-h-screen px-5 pt-24 pb-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="h-8 w-32 rounded-lg bg-ink/10 animate-pulse" />

        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-ink/10 bg-cream-dark/30 px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-2">
                <div className="h-5 w-40 rounded bg-ink/10 animate-pulse" />
                <div className="h-4 w-28 rounded bg-ink/10 animate-pulse" />
              </div>
              <div className="h-7 w-28 rounded-full bg-ink/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
