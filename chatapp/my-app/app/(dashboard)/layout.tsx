// ============================================================================
// Dashboard Layout - Sidebar + Main Content
// ============================================================================

import Sidebar from "@/src/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#e9f4ed] p-0 lg:p-3">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#eef7f3] shadow-xl shadow-black/5 lg:rounded-r-[2rem]">
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
