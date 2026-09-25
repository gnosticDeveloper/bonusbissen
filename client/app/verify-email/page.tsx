import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { publicRequest } from "@/lib/api";

async function verifyEmail(token: string): Promise<boolean> {
  try {
    const response = await publicRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch {
    // Error de red o backend caído: se trata igual que un fallo de verificación
    return false;
  }
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;

  // Sin token (o repetido en la URL) ni siquiera llamamos al backend
  const ok = typeof token === "string" && token.length > 0 && (await verifyEmail(token));

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        {ok ? <CheckCircle2 className="size-16 text-green-600" aria-hidden /> : <XCircle className="size-16 text-destructive" aria-hidden />}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{ok ? "Email verificado" : "No pudimos verificar tu email"}</h1>
          <p className="text-sm text-muted-foreground">
            {ok
              ? "Tu email fue confirmado correctamente. Ya podés usar tu cuenta."
              : "El enlace puede ser inválido, haber vencido o ya haberse usado. Probá de nuevo o pedí un enlace nuevo."}
          </p>
        </div>

        <Link
          href="/b"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
