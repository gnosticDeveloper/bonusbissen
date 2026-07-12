import Sidebar from "@/components/sidebar";

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-341.5">
      <Sidebar />
      <main className="flex-1 ml-72 p-10">{children}</main>
    </div>
  );
}
