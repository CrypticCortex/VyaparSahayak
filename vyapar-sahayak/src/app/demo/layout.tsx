import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DemoShell } from "@/components/dashboard/demo-shell";
import { AuthProvider } from "@/components/auth-provider";

export const metadata = {
  title: "Vyapar Sahayak - Demo",
  description: "Live demo dashboard with sample data",
};

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <AuthProvider session={session}>
      <div className="min-h-screen bg-[#F9FAFB]">
        <DemoShell>{children}</DemoShell>
      </div>
    </AuthProvider>
  );
}
