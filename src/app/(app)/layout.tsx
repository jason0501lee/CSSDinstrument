import { redirect } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar user={toSafeUser(user)} />
      <main className="flex-1 overflow-x-hidden bg-slate-50 px-4 py-4 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
