"use client";

import { ProfileForm } from "@/components/profile-form-admin";
import { useStaffSession } from "@/lib/demo/hooks";

export default function DashboardProfilePage() {
  const { staff } = useStaffSession();
  if (!staff) return null;
  const { member } = staff;

  return (
    <ProfileForm
      key={member.id}
      user={{ username: member.username, name: member.name, role: member.role, email: member.email, emailVerified: member.emailVerified }}
    />
  );
}
