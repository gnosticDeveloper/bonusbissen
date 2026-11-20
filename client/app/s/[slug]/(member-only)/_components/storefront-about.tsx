import { MapPin } from "lucide-react";

/** "Sobre el local". Rows render only for data the backend returns to customers. */
export function StorefrontAbout({ description, address }: { description: string | null; address: string | null }) {
  if (!description && !address) return null;

  return (
    <section aria-labelledby="storefront-about-title" className="flex flex-col gap-3.5">
      <h2 id="storefront-about-title" className="text-[22px] font-bold tracking-[-0.01em] text-foreground">
        Sobre el local
      </h2>

      {description && <p className="text-[15px] leading-[1.55] text-foreground/80">{description}</p>}

      {address && (
        <div className="flex items-center gap-3.5 rounded-[20px] border border-border bg-card p-4">
          <MapPin size={20} className="shrink-0 self-start text-foreground/75" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] text-foreground/75">Dirección</span>
            <span className="text-[15px] font-semibold wrap-break-word text-foreground">{address}</span>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center rounded-full bg-brand/20 px-3 text-[13px] font-bold text-brand-ink transition-colors hover:bg-brand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70"
          >
            Cómo llegar
            <span className="sr-only"> (se abre Google Maps en otra pestaña)</span>
          </a>
        </div>
      )}
    </section>
  );
}
