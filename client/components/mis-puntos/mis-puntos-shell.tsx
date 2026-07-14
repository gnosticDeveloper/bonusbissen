"use client";

import { useState } from "react";
import CustomerHeader from "./customer-header";
import CustomerDrawer from "./customer-drawer";

export default function MisPuntosShell({ name, points, children }: {
  name: string; points: number; children: React.ReactNode;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  return (
    <>
      <CustomerHeader onMenuClickAction={() => setMenuAbierto(true)} />
      <CustomerDrawer isOpen={menuAbierto} onCloseAction={() => setMenuAbierto(false)} name={name} points={points} />
      <div className="min-h-screen px-5 pt-24 pb-8 flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col gap-8">{children}</div>
      </div>
    </>
  );
}
