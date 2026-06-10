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
    <div className="flex min-h-screen">
      <Sidebar user={toSafeUser(user)} />
      <main className="flex-1 overflow-x-hidden bg-slate-50 px-6 py-6">
        {children}
      </main>
    </div>
  );
}
