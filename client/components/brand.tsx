import { cn } from "@/lib/helpers/utils";
import { Sparkles } from "lucide-react";

export function BrandMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const box = size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  const icon = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm", box, className)}
      aria-hidden="true"
    >
      <Sparkles className={icon} />
    </span>
  );
}

export function BrandLockup({ size = "md", subtitle }: { size?: "sm" | "md" | "lg"; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={size} />
      <div className="flex flex-col leading-tight">
        <span className={cn("font-bold tracking-tight", size === "lg" ? "text-xl" : "text-base")}>Bonus Bissen</span>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </div>
    </div>
  );
}
