import { ProfileForm } from "@/components/profile-form-admin";
import { getCurrentUser } from "../actions";

export default async function DashboardProfilePage() {
  const result = await getCurrentUser();

  if (!result.ok) {
    return (
      <div className="mx-auto flex w-full max-w-107.5 flex-col px-4 pt-6">
        <p className="text-sm text-muted">No pudimos cargar tu perfil. Probá de nuevo más tarde.</p>
      </div>
    );
  }

  return <ProfileForm user={result.data} />;
}
