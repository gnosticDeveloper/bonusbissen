import { BrandLockup } from "@/components/brand";
import SignUpForm from "@/components/signup-form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh justify-center flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" subtitle="Sistema de fidelización" />
          <p className="text-sm text-muted-foreground text-pretty">Ingresá con tu usuario o correo y contraseña.</p>
        </div>

        <Card className="p-6">
          <CardContent>
            <SignUpForm />
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground text-pretty">
              {" ¿Ya tenés una cuenta? "}
              <Link href="/sign-in" className="underline text-primary">
                Iniciar sesión
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
