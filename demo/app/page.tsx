import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Gift, LayoutDashboard, ScanLine, Smartphone, Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { LandingParticles } from "@/components/landing-particles";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_CREDENTIALS } from "@/lib/demo/seed";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Demo · Bonus Bissen · Dale a tus clientes una razón para volver",
  description: "Probá Bonus Bissen con datos de ejemplo: la app de tus clientes y el panel de tu negocio, tal como funcionan en la versión real.",
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

const CONTACT_EMAIL = "info@glauxlabs.studio";
const contactMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Quiero ser cliente piloto de Bonus Bissen")}&body=${encodeURIComponent(
  "Hola equipo de Bonus Bissen,\n\nProbé la demo y me gustaría sumar mi negocio a la etapa piloto.\n\nNombre del negocio:\nTipo de negocio:\nZona:\n\n¡Gracias!",
)}`;

const primaryCta = buttonVariants({
  className: "h-12 gap-2 rounded-2xl px-6 text-base font-semibold",
});

export default function HomePage() {
  return (
    // The landing is designed on the dark "abismo" palette, whatever theme the visitor picked.
    <div data-theme="abismo" className={styles.landing}>
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
          <BrandLockup size="sm" subtitle="Demo interactiva" />
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-5 sm:gap-8">
          <a href="#que-es" className="hidden text-sm text-foreground/70 transition-colors hover:text-foreground sm:inline">
            Qué es
          </a>
          <a href="#como-funciona" className="hidden text-sm text-foreground/70 transition-colors hover:text-foreground sm:inline">
            Cómo funciona
          </a>
          <a href="#probar" className={buttonVariants({ variant: "outline", className: "h-10 rounded-full px-4" })}>
            Probar la demo
          </a>
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
              Probá Bonus Bissen como si fuera tu negocio: sumá puntos, canjeá recompensas y administrá tu programa con datos de ejemplo.
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 min-[400px]:flex-row min-[400px]:items-center">
              <a href="#probar" className={primaryCta}>
                Probar la demo <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <a href="#que-es" className={buttonVariants({ variant: "outline", className: "h-12 rounded-2xl px-6 text-base" })}>
                Qué es Bonus Bissen
              </a>
            </div>
            <p className="mt-5 text-sm text-foreground/55">Sin registrarte. Los datos viven solo en esta pestaña.</p>
          </div>
        </section>

        <section id="que-es" aria-labelledby="about-title" className="scroll-mt-8 border-b border-white/10">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Qué es Bonus Bissen</p>
              <h2 id="about-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                Un programa de fidelización con tu marca.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-foreground/70">
              <p>
                Bonus Bissen es un sistema de puntos y recompensas para comercios locales: bares, cafeterías, panaderías, librerías y cualquier negocio que
                quiera reconocer a quienes vuelven. Tus clientes se afilian desde el celular, suman puntos en cada compra y los canjean por los premios que
                vos elegís.
              </p>
              <p>
                Nuestro objetivo es que fidelizar deje de ser cosa de grandes cadenas: sin tarjetas de papel ni sistemas complicados, con un panel simple
                para tu equipo y una experiencia cuidada para tus clientes. Cada visita cuenta, y cada recompensa es una razón más para volver.
              </p>
            </div>
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

        <section id="probar" aria-labelledby="try-title" className="scroll-mt-8 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Probá la demo</p>
              <h2 id="try-title" className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                Elegí desde dónde querés empezar.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-foreground/65">
                Son las mismas pantallas de Bonus Bissen, con un negocio de ejemplo y dos sucursales. Lo que hagas de un lado se refleja del otro: cargá
                puntos desde el panel y miralos llegar a la app del cliente.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              <article className="flex flex-col rounded-[28px] border border-white/10 bg-white/2.5 p-7 sm:p-8">
                <span className="mb-9 grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Smartphone aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight">La app de tus clientes</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground/65">
                  Mirá tus puntos en cada negocio, descubrí recompensas, canjealas y seguí el estado de tus canjes, como lo haría un cliente desde su
                  celular.
                </p>
                <p className="mt-5 text-sm text-foreground/55">
                  Entrás como <strong className="font-semibold text-foreground/80">{DEMO_CREDENTIALS.customer.name}</strong>, una clienta frecuente.
                </p>
                <Link href="/sign-in" className={`${primaryCta} mt-7 w-full sm:w-fit`}>
                  Entrar como cliente <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>

              <article className="flex flex-col rounded-[28px] border border-white/10 bg-white/2.5 p-7 sm:p-8">
                <span className="mb-9 grid size-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <LayoutDashboard aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-xl font-semibold tracking-tight">El panel de tu negocio</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground/65">
                  Sumá puntos, validá canjes, gestioná recompensas, sucursales, programas de puntos y tu equipo. Subí tu logo y tu portada para verlo con
                  tu marca.
                </p>
                <p className="mt-5 text-sm text-foreground/55">
                  Entrás como <strong className="font-semibold text-foreground/80">{DEMO_CREDENTIALS.admin.name}</strong>, administradora de las dos
                  sucursales.
                </p>
                <Link href="/d/sign-in" className={`${buttonVariants({ variant: "outline", className: "h-12 gap-2 rounded-2xl px-6 text-base font-semibold" })} mt-7 w-full sm:w-fit`}>
                  Entrar al panel <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="closing-title" className={styles.closing}>
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Estamos construyendo</p>
            <h2 id="closing-title" className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Buscamos negocios piloto para darle forma a Bonus Bissen.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-foreground/65">
              La etapa piloto es una prueba gratuita junto a comercios reales: tus comentarios nos ayudan a mejorar el sistema antes de su primera versión
              estable.
            </p>
            <a href={contactMailto} className={`${primaryCta} mt-8`}>
              Quiero ser cliente piloto <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-8 sm:flex-row sm:px-10">
          <BrandLockup size="sm" />
          <p className="text-sm text-foreground/50">Que cada visita cuente.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>
      </footer>
    </div>
  );
}
