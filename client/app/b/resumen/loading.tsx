export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-24 pt-6">
      <div className="h-6 w-32 motion-safe:animate-pulse rounded-md bg-muted/20" />
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="h-16 w-16 shrink-0 motion-safe:animate-pulse rounded-xl bg-muted/20" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="h-3.5 w-3/4 motion-safe:animate-pulse rounded bg-muted/20" />
              <div className="h-3 w-1/2 motion-safe:animate-pulse rounded bg-muted/20" />
              <div className="h-3 w-full motion-safe:animate-pulse rounded bg-muted/20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
