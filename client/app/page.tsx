import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, ScanLine, Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { LandingParticles } from "@/components/landing-particles";
import { buttonVariants } from "@/components/ui/button";
import styles from "./landing.module.css";
import { getBillingPlans } from "./onboarding/pago/actions";

export const metadata: Metadata = {
  title: "Bonus Bissen · Dale a tus clientes una razón para volver",
  description:
    "Creá tu programa de puntos y recompensas con Bonus Bissen. Tu marca, tus premios y una nueva razón para que tus clientes vuelvan. Conocé la demo.",
};

const steps = [
  {
    icon: Sparkles,
    title: "Tu negocio, tu programa",
    description: "Personalizá tu espacio y elegí cómo se suman los puntos. Vos ponés las reglas.",
  },
  {
    icon: ScanLine,
    title: "Cada visita suma",
    description: "Tus clientes se suman y acumulan puntos. Todo en un lugar, sin tarjetas de papel.",
  },
  {
    icon: Gift,
    title: "Un motivo para volver",
    description: "Ofrecé recompensas que les den ganas de regresar. Ellos eligen por cuál canjear.",
  },
];

const primaryCta = buttonVariants({
  className: "h-12 gap-2 rounded-2xl px-6 text-base font-semibold",
});

export default async function HomePage() {

  // const billingPlans = await getBillingPlans();

  return (
    <div className={styles.landing}>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-foreground p-3 text-background focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link
          href="/"
          aria-label="Bonus Bissen, inicio"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <BrandLockup size="sm" />
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-5 sm:gap-8">
          <a href="#como-funciona" className="hidden text-sm text-foreground/70 transition-colors hover:text-foreground sm:inline">
            Cómo funciona
          </a>
          <Link href="/d/sign-in" className={buttonVariants({ variant: "outline", className: "h-10 rounded-full px-4" })}>
            Ingresar
          </Link>
        </nav>
      </header>

      <main id="contenido">
        <section
          aria-labelledby="hero-title"
          className="relative isolate flex min-h-[min(760px,85dvh)] items-center overflow-hidden border-b border-white/10"
        >
          <LandingParticles />
          <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-24 text-center sm:px-10 sm:py-32">
            <p className="mb-7 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Grandes vínculos. Pequeñas recompensas.</p>
            <h1 id="hero-title" className="text-5xl leading-[1.04] font-semibold tracking-[-0.055em] text-balance sm:text-7xl lg:text-8xl">
              Que vuelvan por vos.
              <br />
              <span className="text-primary">Y por algo más.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-lg text-lg leading-relaxed text-pretty text-foreground/70 sm:text-xl">
              Convertí cada visita en puntos y cada recompensa en una razón para volver. Un programa de fidelización con tu marca.
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 min-[400px]:flex-row min-[400px]:items-center">
              <Link href="/onboarding" className={primaryCta}>
                Empezá con tu negocio <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <a
                href="https://demo.bonusbissen.store"
                className={buttonVariants({ variant: "outline", className: "h-12 rounded-2xl px-6 text-base" })}
              >
                Explorá la demo
              </a>
            </div>
            <p className="mt-5 text-sm text-foreground/55">Tu marca. Tus puntos. Tus recompensas.</p>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="steps-title" className={`${styles.lower} scroll-mt-8 border-b border-white/10`}>
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Simple, de principio a fin</p>
              <h2 id="steps-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                Cuidá a quienes te eligen.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-foreground/65">
                Vos te ocupás de darles una buena experiencia. Bonus Bissen te ayuda a reconocer cada visita.
              </p>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <li key={title} className="rounded-[28px] border border-white/10 bg-white/2.5 p-7 sm:p-8">
                  <div className="mb-9 flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-xs tracking-widest text-foreground/40">0{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-foreground/65">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="closing-title" className={styles.closing}>
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">La próxima visita empieza acá</p>
            <h2 id="closing-title" className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Hacé que ser cliente tenga su recompensa.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-foreground/65">
              Dale tu estilo. Elegí los premios. Empezá a construir una relación que dure más que una compra.
            </p>
            <Link href="/onboarding" className={`${primaryCta} mt-8`}>
              Creá tu programa <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-8 sm:flex-row sm:px-10">
          <BrandLockup size="sm" />
          <p className="text-sm text-foreground/50">Que cada visita cuente.</p>
          <a href="https://demo.bonusbissen.store" className="text-sm text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
            Conocé la demo ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
