import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DbTestPage() {
  const count = await prisma.distributor.count();
  return <div>DB Test: distributor count = {count}</div>;
}
