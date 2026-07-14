export default function RewardsSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <div className="h-7 w-56 rounded-lg bg-ink/10 animate-pulse" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink/10 bg-cream-dark/30 overflow-hidden flex items-center gap-4"
          >
            <div className="w-24 h-24 shrink-0 bg-ink/10 animate-pulse" />
            <div className="flex-1 flex items-center justify-between pr-4 py-3">
              <div className="h-5 w-32 rounded bg-ink/10 animate-pulse" />
              <div className="h-5 w-14 rounded bg-ink/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
