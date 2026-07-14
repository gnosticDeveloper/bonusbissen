import AppTitle from "@/components/app-title";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <AppTitle />
          <p className="text-xl text-ink-soft">Iniciar sesión</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
