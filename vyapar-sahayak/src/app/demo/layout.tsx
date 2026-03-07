import { DemoShell } from "@/components/dashboard/demo-shell";

export const metadata = {
  title: "Vyapar Sahayak - Demo",
  description: "Live demo dashboard with sample data",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#060B18]">
      <DemoShell>{children}</DemoShell>
    </div>
  );
}
