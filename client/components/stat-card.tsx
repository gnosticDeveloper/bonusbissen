import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "amber" | "sage" | "rust";
  helperText?: string;
};

const accentStyles: Record<string, string> = {
  amber: "bg-amber/15 text-amber-dark",
  sage: "bg-sage/15 text-sage-dark",
  rust: "bg-rust/15 text-rust-dark",
};

export default function StatCard({ label, value, icon: Icon, accent = "amber", helperText }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-lg text-ink-soft">{label}</span>
        <div className={`rounded-full p-2 ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-4xl font-bold text-ink">{value}</div>
      {helperText && <span className="text-base text-ink-soft">{helperText}</span>}
    </div>
  );
}
