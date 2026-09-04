import { BrandLockup } from "@/components/brand";
import SignInForm from "@/components/signin-form";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh justify-center flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" subtitle="Sistema de fidelización" />
          <p className="text-sm text-muted-foreground text-pretty">Ingresá con tu usuario o correo y contraseña.</p>
        </div>

        <Card className="p-6">
          <CardContent>
            <SignInForm />
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground text-pretty">
              {" ¿Nuevo en BonusBissen? "}
              <Link href="/sign-up" className="underline text-primary">
                Create una cuenta
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
