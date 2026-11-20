import { cn } from "@/lib/helpers/utils";

/** A business logo, or its first initial while it has none. Size and radius come from `className`. */
export function LogoTile({ src, name, alt = "", className }: { src: string | null; name: string; alt?: string; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden bg-card font-bold text-foreground", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <span aria-hidden={alt ? undefined : true}>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
