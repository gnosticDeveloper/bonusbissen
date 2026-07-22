"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";

const STORAGE_KEY = "sidebar-collapsed";

export default function EmployeeShell({ hasPendings, children }: { hasPendings: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar hasPendings={hasPendings} collapsed={collapsed} onToggleCollapsedAction={toggleCollapsed} />
      <main
        className={`flex-1 min-w-0 p-4 sm:p-6 lg:p-10 pt-20 lg:pt-10 overflow-y-auto transition-[margin] duration-200 ${
          collapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
