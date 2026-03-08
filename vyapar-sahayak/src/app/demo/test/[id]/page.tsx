import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const count = await prisma.campaign.count();
  return <div>Test page works! ID: {id}, campaigns: {count}</div>;
}
