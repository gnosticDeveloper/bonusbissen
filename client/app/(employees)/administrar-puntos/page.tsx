import GrantPointsForm from "@/components/administrar-puntos/grant-points-form";

export default function GrantPointsPage() {
  return (
    <div className="flex flex-col gap-8 container mx-auto">
      <header>
        <h2 className="text-4xl font-bold text-ink">Suma directa</h2>
        <p className="text-xl text-ink-soft mt-2">
          Sumá puntos a un cliente por la cantidad total que gastó.
        </p>
      </header>

      <GrantPointsForm />
    </div>
  );
}
