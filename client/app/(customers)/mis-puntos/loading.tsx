import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen px-5 pt-24 pb-8 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="rounded-3xl bg-amber/10 border border-amber/20 px-8 py-8 flex flex-col items-center gap-2">
          <Sparkles className="h-7 w-7 text-amber-dark/40" />
          <div className="h-14 w-24 rounded-lg bg-ink/10 animate-pulse" />
          <div className="h-5 w-36 rounded bg-ink/10 animate-pulse" />
        </div>

        <div className="flex flex-col gap-3">
          <div className="h-7 w-72 rounded-lg bg-ink/10 animate-pulse" />
          <div className="rounded-2xl border border-rust/10 bg-rust/5 px-5 py-4 flex flex-col gap-3">
            <div className="h-5 w-40 rounded bg-ink/10 animate-pulse" />
            <div className="h-4 w-28 rounded bg-ink/10 animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="h-7 w-56 rounded-lg bg-ink/10 animate-pulse" />
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

        <div className="pt-4 border-t border-ink/10 flex justify-center">
          <div className="h-5 w-40 rounded bg-ink/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
