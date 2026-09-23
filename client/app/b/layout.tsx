import { BottomNav } from "@/components/bottom-nav";
import { SideMenu } from "@/components/side-menu";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="min-h-[calc(100svh-4.375rem)] bg-background pb-26">
      {children}
      <SideMenu />
      <BottomNav />
    </div>
  );
}
