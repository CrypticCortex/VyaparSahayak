import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

// Test 1: no force-dynamic, with cache wrapper (like /demo page)
const getCachedCount = unstable_cache(
  () => prisma.distributor.count(),
  ["dbtest-count"],
  { revalidate: 10 }
);

export default async function DbTestPage() {
  const count = await getCachedCount();
  return <div>DB Test (cached): distributor count = {count}</div>;
}
