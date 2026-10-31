"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useRouter } from "next/navigation";
import {
  availableStep as currentStep,
  clampOnboardingStep,
  onboardingProgressContext,
  restoreOnboardingNavigation,
  createOnboardingProgressStore,
  completeOnboardingNavigation,
  type OnboardingProgressStore,
} from "@/lib/onboarding-progress";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { AddressSelector } from "@/components/address-selector";
import { Autocomplete } from "@/components/autocomplete-input";
import { getAllOrganizations, type OrganizationOption } from "@/app/d/sign-in/actions";
import type { ActionResult } from "@/lib/api";
import type { OnboardingState } from "./state";
import {
  authenticateAdmin,
  authenticateCustomer,
  createOrganization,
  createPointProgram,
  createStorefront,
  finishOnboarding,
  leaveOnboarding,
  refreshOnboarding,
} from "./actions";

import { PlanSelectionScreen } from "./pago/plan-selection-screen";
import { PaymentScreen } from "./pago/payment-button";
import styles from "./onboarding.module.css";

const steps = ["Organización", "Plan", "Mercado Pago", "Sucursal", "Programa de puntos"];

function TextField({
  name,
  label,
  type = "text",
  autoComplete,
  maxLength = 255,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  defaultValue?: string;
}) {
  return (
    <Field label={label} htmlFor={`onboarding-${name}`} required>
      <Input
        id={`onboarding-${name}`}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        defaultValue={defaultValue}
      />
    </Field>
  );
}

export function Onboarding({ initial, progressStore }: { initial: OnboardingState; progressStore?: OnboardingProgressStore }) {
  const router = useRouter();
  const [store] = useState(() => createOnboardingProgressStore(progressStore));
  const [restored, setRestored] = useState<string | null>(null);
  const navigationRevision = useRef(0);
  const [storageError, setStorageError] = useState<string | null>(null);
  const finishing = useRef(false);
  const [state, setState] = useState(initial);
  const [step, setStep] = useState(currentStep(initial));
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [recover, setRecover] = useState(false);
  const [accountLogin, setAccountLogin] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOption | null>(null);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(initial.error ?? null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const complete = state.programs.some((p) => p.storefronts.some((s) => state.storefronts.some((sf) => sf.id === s.id)));

  const { userId, organizationId } = state;
  const context = onboardingProgressContext(state);
  const readNavigation = useEffectEvent(() => ({ state, step, revision: navigationRevision.current }));

  function selectStep(next: number | ((previous: number) => number)) {
    navigationRevision.current += 1;
    setStep(next);
  }

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    const initialNavigation = readNavigation();
    void restoreOnboardingNavigation(store, initialNavigation, readNavigation).then((result) => {
      if (cancelled || !result) return;
      setStep(result.step);
      setRestored(onboardingProgressContext(initialNavigation.state));
      if (result.storageFailed) setStorageError("No pudimos recuperar el paso local. Podés continuar; tus recursos siguen guardados en el negocio.");
    });
    return () => {
      cancelled = true;
    };
  }, [userId, organizationId, store]);

  useEffect(() => {
    if (!state.userId || restored !== context || finishing.current) return;
    void store.save(state.userId, { version: 3, userId: state.userId, organizationId: state.organizationId, step }).catch(() => {
      setStorageError("No pudimos guardar el paso en este navegador. Tus recursos siguen guardados en el negocio.");
    });
  }, [state, context, restored, step, store]);

  function finish() {
    if (busy.current) return;
    busy.current = true;
    finishing.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await finishOnboarding();
        if (result.error !== null) {
          setError(result.error);
          const refreshed = await refreshOnboarding();
          if (refreshed.ok) {
            setState(refreshed.data);
            selectStep((previous) => clampOnboardingStep(refreshed.data, previous));
          }
        } else {
          await completeOnboardingNavigation(
            result,
            store,
            (destination) => router.push(destination),
            () => {
              setStorageError("El negocio está listo, pero no pudimos borrar el paso local de este navegador.");
            },
          );
        }
      } catch {
        setError("No pudimos finalizar o abrir Mi negocio. Reintentá; no se duplican recursos.");
      } finally {
        busy.current = false;
        finishing.current = false;
      }
    });
  }

  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (error) errorBox.current?.focus();
  }, [error]);

  function run(operation: () => Promise<ActionResult<OnboardingState>>, targetStep?: number) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await operation();
        if (result.ok) {
          setState(result.data);
          selectStep(targetStep === undefined ? currentStep(result.data) : clampOnboardingStep(result.data, targetStep));
          setAccountLogin(false);
          setError(result.data.error ?? null);
        } else {
          setError(result.error);
          const refreshed = await refreshOnboarding();
          if (refreshed.ok) {
            setState(refreshed.data);
            selectStep((previous) => clampOnboardingStep(refreshed.data, previous));
          }
        }
      } catch {
        setError("No pudimos completar la solicitud. Reintentá la consulta de este paso; tus datos guardados siguen en el negocio.");
      } finally {
        busy.current = false;
      }
    });
  }

  function submit(action: (form: FormData) => Promise<ActionResult<OnboardingState>>) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      // Passwords exist only for this request; never keep them in state or browser storage.
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => {
        input.value = "";
      });
      run(() => action(data));
    };
  }

  function form(action: (data: FormData) => Promise<ActionResult<OnboardingState>>, children: ReactNode, label: string) {
    return (
      <form onSubmit={submit(action)} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          {children}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : label}
          </Button>
        </fieldset>
      </form>
    );
  }

  const adminForm = (
    <>
      <p className="text-sm">Ingresá de nuevo con tu usuario y contraseña para abrir la sesión de administración. No guardamos tu contraseña.</p>
      {form(
        authenticateAdmin,
        <>
          {!state.organizationId && (
            <Field label="Negocio que querés retomar" htmlFor="recover-org" required>
              <Autocomplete
                inputId="recover-org"
                selected={selectedOrg}
                onSelect={setSelectedOrg}
                onClear={() => setSelectedOrg(null)}
                fetchFn={getAllOrganizations}
                getId={(o) => o.id}
                displayKeys={["name"]}
                showPicture={false}
                placeholder="Buscá tu negocio"
              />
              <input type="hidden" name="organizationId" value={selectedOrg?.id ?? ""} />
            </Field>
          )}
          <TextField name="identifier" label="Nombre de usuario" autoComplete="username" />
          <TextField name="password" label="Contraseña" type="password" autoComplete="current-password" maxLength={256} />
        </>,
        "Ingresar como administrador",
      )}
    </>
  );

  return (
    <div className={`space-y-6 ${styles.root}`} aria-busy={pending}>
      <div>
        <p className="text-sm font-semibold text-primary">Configuración inicial</p>
        <h1 className="mt-2 text-3xl font-bold">Dale la bienvenida a tus clientes</h1>
        <p className="mt-3 text-foreground/80">
          Cinco pasos para empezar: crear tu organización, elegir un plan, autorizar cobros en Mercado Pago y configurar sucursal y programa. Lo que guardes se
          recupera al volver; los campos sin enviar no se guardan.
        </p>
      </div>
      <nav aria-label="Pasos de la configuración">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                aria-current={step === index ? "step" : undefined}
                disabled={pending || (Boolean(state.userId) && restored !== context) || index > currentStep(state)}
                onClick={() => {
                  if (index > step) run(refreshOnboarding, index);
                  else {
                    selectStep(index);
                    setError(null);
                  }
                }}
                className={`h-full w-full rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${step === index ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}
              >
                <span className="block text-xs">Paso {index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {error && (
        <div ref={errorBox} tabIndex={-1} role="alert" className="space-y-3 rounded-xl border border-destructive p-4">
          <p>{error}</p>
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(refreshOnboarding)}>
            Reintentar consulta de {steps[step]}
          </Button>
        </div>
      )}
      <section
        aria-roledescription="carrusel"
        aria-label="Configuración del negocio"
        className={styles.viewport}
      >
        <div
          key={step}
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${step + 1} de 5: ${steps[step]}`}
          className={`space-y-5 ${styles.slide} ${step === 0 ? styles.organization : step === 1 ? styles.plans : step === 2 ? styles.payment : styles.form}`}
        >
          <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
            {steps[step]}
          </h2>
          {step === 0 && (
            <>
              {state.organization ? (
                <>
                  <p>
                    Ya estás administrando <strong>{state.organization.name}</strong>.
                  </p>
                  <Button disabled={pending} onClick={() => run(refreshOnboarding, 1)}>
                    Continuar a Plan
                  </Button>
                </>
              ) : state.organizationId || recover ? (
                <>
                  <p>
                    {state.organizationId
                      ? "Tu organización ya está creada. No hace falta crearla otra vez."
                      : "¿Ya creaste tu negocio? Retomalo sin duplicar el alta."}
                  </p>
                  {adminForm}
                  {!state.organizationId && (
                    <Button variant="ghost" onClick={() => setRecover(false)} disabled={pending}>
                      Volver a crear mi negocio
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {!state.customer || accountLogin ? (
                    <>
                      <h3 className="font-semibold">{mode === "sign-up" ? "Primero, creá tu cuenta" : "Ingresá con tu cuenta"}</h3>
                      {form(
                        (data) => authenticateCustomer(mode, data),
                        <>
                          {mode === "sign-up" ? (
                            <>
                              <TextField name="name" label="Tu nombre" autoComplete="name" />
                              <TextField name="username" label="Nombre de usuario" autoComplete="username" maxLength={100} />
                              <TextField name="email" label="Email" type="email" autoComplete="email" />
                            </>
                          ) : (
                            <TextField name="identifier" label="Usuario o email" autoComplete="username" />
                          )}
                          <TextField
                            name="password"
                            label="Contraseña"
                            type="password"
                            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                            maxLength={mode === "sign-up" ? 72 : 256}
                          />
                          {mode === "sign-up" && <p className="text-xs">Usá entre 8 y 72 caracteres, con mayúscula, minúscula, número y símbolo.</p>}
                        </>,
                        mode === "sign-up" ? "Crear mi cuenta" : "Ingresar",
                      )}
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          setMode(mode === "sign-up" ? "sign-in" : "sign-up");
                          setError(null);
                        }}
                      >
                        {mode === "sign-up" ? "Ya tengo una cuenta" : "Quiero crear una cuenta"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>Tu cuenta está lista. Ahora elegí el nombre de tu negocio.</p>
                      {form(createOrganization, <TextField name="name" label="Nombre del negocio" />, "Crear organización")}
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          setAccountLogin(true);
                          setMode("sign-in");
                        }}
                      >
                        Volver a ingresar con mi cuenta
                      </Button>
                    </>
                  )}
                  <Button variant="outline" disabled={pending} onClick={() => setRecover(true)}>
                    Ya creé una organización
                  </Button>
                </>
              )}
            </>
          )}
          {step === 1 && state.organization && (
            <PlanSelectionScreen
              key={state.organization.id}
              expectedOrganizationId={state.organization.id}
              disabled={pending}
              onContinue={() => run(refreshOnboarding)}
            />
          )}
          {step === 2 && state.organization?.billingPlanName && (
            <PaymentScreen
              key={state.organization.id}
              expectedOrganizationId={state.organization.id}
              disabled={pending}
              onContinue={() => run(refreshOnboarding)}
            />
          )}
          {step === 3 && (
            <>
              <p>Creá tu primera sucursal física u online. Después podés sumar más desde Mi negocio.</p>
              {state.storefronts.length ? (
                <>
                  <p>
                    Recuperamos del negocio: <strong>{state.storefronts.map((s) => s.name).join(", ")}</strong>. No vamos a crear otra sucursal al
                    reintentar.
                  </p>
                  <Button disabled={pending} onClick={() => run(refreshOnboarding, 4)}>
                    Continuar al programa
                  </Button>
                </>
              ) : (
                form(
                  createStorefront,
                  <>
                    <TextField name="name" label="Nombre de la sucursal" />
                    <Field label="Tipo de sucursal" htmlFor="online">
                      <select
                        id="online"
                        name="online"
                        value={String(online)}
                        onChange={(e) => setOnline(e.target.value === "true")}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3"
                      >
                        <option value="false">Física</option>
                        <option value="true">Online</option>
                      </select>
                    </Field>
                    {!online ? (
                      <AddressSelector />
                    ) : (
                      <>
                        <input type="hidden" name="address" value="" />
                        <input type="hidden" name="city" value="" />
                        <input type="hidden" name="province" value="" />
                      </>
                    )}
                    <Field label="Color de marca" htmlFor="color">
                      <Input type="color" name="color" id="color" defaultValue="#d4822b" />
                    </Field>
                    <Field label="Rubro (opcional)" htmlFor="category">
                      <Input id="category" name="category" maxLength={80} placeholder="Cafetería" />
                    </Field>
                    <Field label="Horario (opcional)" htmlFor="hours">
                      <Input id="hours" name="hours" maxLength={255} placeholder="Lun a sáb de 9 a 18" />
                    </Field>
                    <Field label="Descripción (opcional)" htmlFor="description">
                      <Textarea id="description" name="description" maxLength={2000} />
                    </Field>
                  </>,
                  "Crear sucursal",
                )
              )}
            </>
          )}
          {step === 4 && (
            <>
              {complete ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">¡Tu negocio ya está listo!</h3>
                  <p>
                    El programa de puntos está vinculado a tu sucursal. Desde Mi negocio podés ajustar la configuración y asignar las sucursales al
                    equipo.
                  </p>
                  <p className="text-sm">Vamos al panel de la organización, sin seleccionar una sucursal automáticamente.</p>
                  <Button type="button" disabled={pending || restored !== context} onClick={finish}>
                    {pending ? "Abriendo Mi negocio…" : "Ir a Mi negocio"}
                  </Button>
                </div>
              ) : (
                <>
                  <p>Elegí cómo se van a llamar los puntos que acumulan tus clientes.</p>
                  {form(
                    createPointProgram,
                    <>
                      <TextField name="name" label="Nombre del programa" defaultValue="Beneficios" />
                      <TextField name="unitLabel" label="Nombre de los puntos" defaultValue="puntos" maxLength={50} />
                      <Field label="Sucursal del programa" htmlFor="storefrontId" required>
                        <select
                          id="storefrontId"
                          name="storefrontId"
                          required
                          className="h-10 w-full rounded-lg border border-border bg-background px-3"
                        >
                          {state.storefronts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>,
                    "Crear programa de puntos",
                  )}
                </>
              )}
            </>
          )}
          {step > 0 && (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => selectStep(step - 1)}>
              Volver
            </Button>
          )}
        </div>
      </section>
      <p role="status" aria-live="polite" className="text-sm text-foreground/70">
        {pending ? "Estamos procesando tu solicitud…" : `Paso ${step + 1} de 5: ${steps[step]}`}
      </p>
      {storageError && (
        <p role="status" className="text-sm">
          {storageError}
        </p>
      )}
      {step !== 1 && step !== 2 && (
        <footer className="border-t border-border pt-5 text-center">
          <p className="text-sm text-foreground/70">¿Querés seguir con otra cuenta?</p>
          <Button type="button" variant="link" disabled={pending} onClick={() => {
            if (busy.current) return;
            busy.current = true;
            startTransition(async () => {
              try {
                await leaveOnboarding();
                window.location.assign("/onboarding");
              } catch {
                setError("No pudimos cerrar la sesión. Reintentá en un momento.");
              } finally {
                busy.current = false;
              }
            });
          }}>Cerrar sesión</Button>
        </footer>
      )}
    </div>
  );
}
