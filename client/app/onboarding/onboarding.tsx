"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { AddressSelector } from "@/components/address-selector";
import { Autocomplete } from "@/components/autocomplete-input";
import { getAllOrganizations, type OrganizationOption } from "@/app/d/sign-in/actions";
import type { ActionResult } from "@/lib/api";
import type { OnboardingState } from "./state";
import { authenticateAdmin, authenticateCustomer, createOrganization, createPointProgram, createStorefront, finishOnboarding, refreshOnboarding } from "./actions";

import styles from "./onboarding.module.css";

const steps = ["Organización", "Sucursal", "Programa de puntos"];
function currentStep(state: OnboardingState) {
  return !state.organization ? 0 : !state.storefronts.length ? 1 : 2;
}

function TextField({ name, label, type = "text", autoComplete, maxLength = 255, defaultValue }: {
  name: string; label: string; type?: string; autoComplete?: string; maxLength?: number; defaultValue?: string;
}) {
  return <Field label={label} htmlFor={`onboarding-${name}`} required>
    <Input id={`onboarding-${name}`} name={name} type={type} autoComplete={autoComplete} required maxLength={maxLength} defaultValue={defaultValue} />
  </Field>;
}

function FinishForm({ disabled, onRefresh }: { disabled: boolean; onRefresh: () => void }) {
  const [result, action, pending] = useActionState(finishOnboarding, { error: null });
  return <form action={action} className="space-y-3">
    {result.error && <div className="space-y-3">
      <p role="alert">{result.error}</p>
      <Button type="button" variant="outline" disabled={disabled || pending} onClick={onRefresh}>Actualizar recorrido o reingresar</Button>
    </div>}
    <Button type="submit" disabled={disabled || pending}>{pending ? "Abriendo Mi negocio…" : "Ir a Mi negocio"}</Button>
  </form>;
}

export function Onboarding({ initial }: { initial: OnboardingState }) {
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
  const complete = state.programs.some(p => p.storefronts.some(s => state.storefronts.some(sf => sf.id === s.id)));

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  function run(operation: () => Promise<ActionResult<OnboardingState>>) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await operation();
        if (result.ok) {
          setState(result.data);
          setStep(currentStep(result.data));
          setAccountLogin(false);
          setError(result.data.error ?? null);
        } else {
          setError(result.error);
          const refreshed = await refreshOnboarding();
          if (refreshed.ok) {
            setState(refreshed.data);
            if (!refreshed.data.organization) setStep(0);
          }
        }
      } catch {
        setError("No pudimos completar la solicitud. Actualizá el estado antes de reintentar; tus datos guardados siguen en el negocio.");
      } finally { busy.current = false; }
    });
  }

  function submit(action: (form: FormData) => Promise<ActionResult<OnboardingState>>) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      // Passwords exist only for this request; never keep them in state or browser storage.
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => { input.value = ""; });
      run(() => action(data));
    };
  }

  function form(action: (data: FormData) => Promise<ActionResult<OnboardingState>>, children: ReactNode, label: string) {
    return <form onSubmit={submit(action)} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">{children}<Button type="submit" disabled={pending}>{pending ? "Guardando…" : label}</Button></fieldset>
    </form>;
  }

  const adminForm = <>
    <p className="text-sm">Ingresá de nuevo con tu usuario y contraseña para abrir la sesión de administración. No guardamos tu contraseña.</p>
    {form(authenticateAdmin, <>
      {!state.organizationId && <Field label="Negocio que querés retomar" htmlFor="recover-org" required>
        <Autocomplete inputId="recover-org" selected={selectedOrg} onSelect={setSelectedOrg} onClear={() => setSelectedOrg(null)} fetchFn={getAllOrganizations} getId={o => o.id} displayKeys={["name"]} showPicture={false} placeholder="Buscá tu negocio" />
        <input type="hidden" name="organizationId" value={selectedOrg?.id ?? ""} />
      </Field>}
      <TextField name="identifier" label="Nombre de usuario" autoComplete="username" />
      <TextField name="password" label="Contraseña" type="password" autoComplete="current-password" maxLength={256} />
    </>, "Ingresar como administrador")}
  </>;

  return <div className="space-y-6" aria-busy={pending}>
    <div><p className="text-sm font-semibold text-primary">Configuración inicial · Pago simulado</p><h1 className="mt-2 text-3xl font-bold">Dale la bienvenida a tus clientes</h1><p className="mt-3 text-foreground/80">Tres pasos para empezar. Lo que guardes se recupera al volver; los campos sin enviar no se guardan.</p></div>
    <nav aria-label="Pasos de la configuración"><ol className="grid grid-cols-3 gap-2">{steps.map((label, index) => <li key={label}>
      <button type="button" aria-current={step === index ? "step" : undefined} disabled={pending || index > currentStep(state)} onClick={() => { setStep(index); setError(null); }} className={`h-full w-full rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${step === index ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}><span className="block text-xs">Paso {index + 1}</span>{label}</button>
    </li>)}</ol></nav>
    {error && <div ref={errorBox} tabIndex={-1} role="alert" className="space-y-3 rounded-xl border border-destructive p-4"><p>{error}</p><Button type="button" variant="outline" disabled={pending} onClick={() => run(refreshOnboarding)}>Actualizar estado</Button></div>}
    <section aria-roledescription="carrusel" aria-label="Configuración del negocio" className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8">
      <div key={step} role="group" aria-roledescription="diapositiva" aria-label={`${step + 1} de 3: ${steps[step]}`} className={`space-y-5 ${styles.slide}`}>
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">{steps[step]}</h2>
        {step === 0 && <>
          {state.organization ? <><p>Ya estás administrando <strong>{state.organization.name}</strong>.</p><Button onClick={() => setStep(1)}>Continuar a sucursal</Button></> : state.organizationId || recover ? <>
            <p>{state.organizationId ? "Tu organización ya está creada. No hace falta crearla otra vez." : "¿Ya creaste tu negocio? Retomalo sin duplicar el alta."}</p>
            {adminForm}
            {!state.organizationId && <Button variant="ghost" onClick={() => setRecover(false)} disabled={pending}>Volver a crear mi negocio</Button>}
          </> : <>
            {(!state.customer || accountLogin) ? <>
              <h3 className="font-semibold">{mode === "sign-up" ? "Primero, creá tu cuenta" : "Ingresá con tu cuenta"}</h3>
              {form(data => authenticateCustomer(mode, data), <>
                {mode === "sign-up" ? <><TextField name="name" label="Tu nombre" autoComplete="name" /><TextField name="username" label="Nombre de usuario" autoComplete="username" maxLength={100} /><TextField name="email" label="Email" type="email" autoComplete="email" /></> : <TextField name="identifier" label="Usuario o email" autoComplete="username" />}
                <TextField name="password" label="Contraseña" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} maxLength={mode === "sign-up" ? 72 : 256} />
                {mode === "sign-up" && <p className="text-xs">Usá entre 8 y 72 caracteres, con mayúscula, minúscula, número y símbolo.</p>}
              </>, mode === "sign-up" ? "Crear mi cuenta" : "Ingresar")}
              <Button variant="ghost" disabled={pending} onClick={() => { setMode(mode === "sign-up" ? "sign-in" : "sign-up"); setError(null); }}>{mode === "sign-up" ? "Ya tengo una cuenta" : "Quiero crear una cuenta"}</Button>
            </> : <>
              <p>Tu cuenta está lista. Ahora elegí el nombre de tu negocio.</p>
              {form(createOrganization, <TextField name="name" label="Nombre del negocio" />, "Crear organización")}
              <Button variant="ghost" disabled={pending} onClick={() => { setAccountLogin(true); setMode("sign-in"); }}>Volver a ingresar con mi cuenta</Button>
            </>}
            <Button variant="outline" disabled={pending} onClick={() => setRecover(true)}>Ya creé una organización: retomar</Button>
          </>}
        </>}
        {step === 1 && <>
          <p>Creá tu primera sucursal física u online. Después podés sumar más desde Mi negocio.</p>
          {state.storefronts.length ? <><p>Recuperamos del negocio: <strong>{state.storefronts.map(s => s.name).join(", ")}</strong>. No vamos a crear otra sucursal al reintentar.</p><Button onClick={() => setStep(2)}>Continuar al programa</Button></> : form(createStorefront, <>
            <TextField name="name" label="Nombre de la sucursal" />
            <Field label="Tipo de sucursal" htmlFor="online"><select id="online" name="online" value={String(online)} onChange={e => setOnline(e.target.value === "true")} className="h-10 w-full rounded-lg border border-border bg-background px-3"><option value="false">Física</option><option value="true">Online</option></select></Field>
            {!online ? <AddressSelector /> : <><input type="hidden" name="address" value="" /><input type="hidden" name="city" value="" /><input type="hidden" name="province" value="" /></>}
            <Field label="Color de marca" htmlFor="color"><Input type="color" name="color" id="color" defaultValue="#d4822b" /></Field>
            <Field label="Rubro (opcional)" htmlFor="category"><Input id="category" name="category" maxLength={80} placeholder="Cafetería" /></Field>
            <Field label="Horario (opcional)" htmlFor="hours"><Input id="hours" name="hours" maxLength={255} placeholder="Lun a sáb de 9 a 18" /></Field>
            <Field label="Descripción (opcional)" htmlFor="description"><Textarea id="description" name="description" maxLength={2000} /></Field>
          </>, "Crear sucursal")}
        </>}
        {step === 2 && <>
          {complete ? <div className="space-y-4"><h3 className="text-xl font-semibold">¡Tu negocio ya está listo!</h3><p>El programa de puntos está vinculado a tu sucursal. Desde Mi negocio podés ajustar la configuración y asignar las sucursales al equipo.</p><p className="text-sm">Vamos al panel de la organización, sin seleccionar una sucursal automáticamente.</p><FinishForm disabled={pending} onRefresh={() => run(refreshOnboarding)} /></div> : <>
            <p>Elegí cómo se van a llamar los puntos que acumulan tus clientes.</p>
            {form(createPointProgram, <>
              <TextField name="name" label="Nombre del programa" defaultValue="Beneficios" />
              <TextField name="unitLabel" label="Nombre de los puntos" defaultValue="puntos" maxLength={50} />
              <Field label="Sucursal del programa" htmlFor="storefrontId" required><select id="storefrontId" name="storefrontId" required className="h-10 w-full rounded-lg border border-border bg-background px-3">{state.storefronts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            </>, "Crear programa de puntos")}
          </>}
        </>}
        {step > 0 && <Button type="button" variant="ghost" disabled={pending} onClick={() => setStep(step - 1)}>Volver</Button>}
      </div>
    </section>
    <p role="status" aria-live="polite" className="text-sm text-foreground/70">{pending ? "Estamos procesando tu solicitud…" : `Paso ${step + 1} de 3: ${steps[step]}`}</p>
    {state.organization && <Link className="text-sm underline" href={`/d/${state.organization.id}/mi-negocio`}>Abrir Mi negocio para revisar la configuración</Link>}
  </div>;
}
