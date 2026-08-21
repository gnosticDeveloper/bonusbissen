import { BrandLockup } from "@/components/brand";
import SignInForm from "@/components/signin-form";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh justify-center flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" subtitle="Panel administrativo" />
          <p className="text-sm text-muted-foreground text-pretty">Ingresá con tus credenciales o usá uno de los accesos de demostración.</p>
        </div>

        <Card className="p-6">
          <SignInForm />
        </Card>
      </div>
    </main>
  );
}
