export default function PendingsSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <div className="h-7 w-72 rounded-lg bg-ink/10 animate-pulse" />
      <div className="rounded-2xl border border-rust/20 bg-rust/5 px-5 py-4 flex flex-col gap-3">
        <div className="h-5 w-40 rounded bg-ink/10 animate-pulse" />
        <div className="h-4 w-28 rounded bg-ink/10 animate-pulse" />
      </div>
    </section>
  );
}
