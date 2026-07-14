"use client";

import { SubmitEventHandler, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import AppTitle from "@/components/app-title";

export default function LoginClientePage() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("texto de prueba");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handler: SubmitEventHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/customers/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (res.ok) router.push("/");
    else setError("Usuario o contraseña incorrectos");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-amber/15 p-4">
            <Sparkles className="h-8 w-8 text-amber-dark" />
          </div>
          <AppTitle />
          <p className="text-xl text-ink-soft">Ingresá tu teléfono para ver tus puntos</p>
        </div>

        <form onSubmit={handler} className="w-full flex flex-col gap-4">
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 3462 455123"
            className="w-full rounded-2xl border border-ink/15 bg-cream-dark/30 px-5 py-4 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber text-center"
          />
          {error && <p className="text-red-500 text-sm font-mono">{error}</p>}
          <button
            disabled={loading}
            aria-disabled={loading}
            type="submit"
            className="w-full rounded-2xl bg-amber px-6 py-4 text-xl font-semibold text-cream hover:bg-amber-dark transition-colors disabled:cursor-not-allowed"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
