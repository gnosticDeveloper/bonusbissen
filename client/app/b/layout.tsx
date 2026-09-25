import { BottomNav } from "@/components/bottom-nav";
import { SideMenu } from "@/components/side-menu";
import { getMe } from "./actions";
import { UserProvider } from "@/providers/user-provider";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const res = await getMe();

  return (
    <UserProvider user={res.ok ? res.data : null}>
      <div className="min-h-[calc(100svh-4.375rem)] bg-background pb-26">
        {children}
        <SideMenu />
        <BottomNav />
      </div>
    </UserProvider>
  );
}
