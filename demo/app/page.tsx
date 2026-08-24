"use client";

import { useState } from "react";
import { BrandLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowUpRight, Check, Copy, Mail, ShieldCheck, Store, Users } from "lucide-react";
import Link from "next/link";

const CONTACT_EMAIL = "info@glauxlabs.studio";

const contactMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Quiero agendar una demo de Bonus Bissen"
)}&body=${encodeURIComponent(
  "Hola equipo de Bonus Bissen,\n\nMe gustaría coordinar una demo para conocer más sobre el sistema.\n\nNombre del negocio:\nTipo de negocio (bar / restaurante / otro):\nZona:\n\n¡Gracias!\n\n— Enviado desde la demo de Bonus Bissen (demo.bonusbissen.store)"
)}`;

export default function HomePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API no disponible (ej: contexto no seguro o navegador viejo)
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <BrandLockup />
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-4 text-center sm:gap-5">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Store className="size-3.5" />
            Fidelización para tu negocio
          </span>
          <h1 className="text-pretty text-3xl font-bold tracking-tight sm:text-5xl">Sumá puntos, canjeá recompensas y hacé volver a tus clientes</h1>
          <p className="mx-auto max-w-2xl text-pretty text-base text-muted-foreground leading-relaxed sm:text-lg">
            Bonus Bissen es un sistema de puntos y recompensas pensado para bares y comercios locales. Elegí cómo querés ingresar a la demostración.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-semibold">Panel administrativo</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para dueños y empleados. Cargá puntos, validá canjes, gestioná recompensas, clientes y los datos de tu negocio.
              </p>
            </div>
            <Link href="/admin/login" className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full gap-1.5")}>
              Ingresar al panel <ArrowRight className="size-4" />
            </Link>
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Users className="size-5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-semibold">Vista de clientes</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para tus clientes. Consultá tus puntos, descubrí recompensas disponibles, canjealas y seguí el estado de tus canjes.
              </p>
            </div>
            <Link href="/cliente/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-auto w-full gap-1.5")}>
              Entrar como cliente <ArrowRight className="size-4" />
            </Link>
          </Card>
        </section>

        <Card className="flex flex-col items-center gap-3 border-dashed p-5 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Mail className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold">¿Querés conocer más sobre Bonus Bissen?</h3>
              <p className="text-sm text-muted-foreground">Escribinos y coordinamos una demo para tu negocio.</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href={contactMailto}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 gap-1.5 sm:flex-none")}
            >
              <Mail className="size-4" />
              {CONTACT_EMAIL}
              <ArrowUpRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar dirección de correo"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 px-2.5"
              )}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Demo funcional · Los datos se guardan solo en tu navegador y se reinician al cerrar la pestaña.
        </p>

        {/*<p className="text-center text-xs text-muted-foreground">
          Un producto de{" "}
          <Link
            href="https://glauxlabs.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Glaux Labs
          </Link>
        </p>*/}
      </div>
    </main>
  );
}
