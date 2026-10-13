import { cn } from "@/lib/helpers/utils";

export function BrandMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const box = size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  return <img src="/bonusbissen-logo.webp" alt="" className={cn("object-contain", box, className)} aria-hidden="true" />;
}

export function BrandLockup({ size = "md", subtitle, color }: { size?: "sm" | "md" | "lg"; subtitle?: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5" style={{ "--brand-lockup-accent": color || "var(--primary)" } as React.CSSProperties}>
      <BrandMark size={size} />
      <div className="flex flex-col leading-tight">
        <span className={cn("font-bold tracking-tight text-foreground", size === "lg" ? "text-xl" : "text-base")}>Bonus Bissen</span>
        {subtitle ? <span className="text-xs text-foreground/80">{subtitle}</span> : null}
      </div>
    </div>
  );
}
