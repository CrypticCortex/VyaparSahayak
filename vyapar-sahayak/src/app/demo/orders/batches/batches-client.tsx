"use client";

import { useState } from "react";
import Link from "next/link";
import { BatchCard } from "@/components/dashboard/batch-card";

interface BatchData {
  id: string;
  zoneCode: string;
  zoneName: string;
  status: string;
  vehicleInfo: string | null;
  plannedDate: string | null;
  dispatchedAt: string | null;
  orderCount: number;
  totalValue: number;
  orders: { id: string; retailerName: string; totalAmount: number; status: string }[];
}

export function BatchesClient({ batches: initialBatches }: { batches: BatchData[] }) {
  const [batches, setBatches] = useState(initialBatches);

  function handleStatusChange(batchId: string, newStatus: string) {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: newStatus } : b))
    );
  }

  const planned = batches.filter((b) => b.status === "planned");
  const dispatched = batches.filter((b) => b.status === "dispatched");
  const delivered = batches.filter((b) => b.status === "delivered");

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="px-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Dispatch Batches</h1>
        <Link href="/demo/orders" className="text-sm text-[#FF9933] hover:underline">
          Back to Orders
        </Link>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-12 text-[#8892A8]">
          <p className="text-sm">No dispatch batches yet</p>
          <p className="text-xs mt-1">Confirm orders and create batches from the Orders page</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {planned.length > 0 && (
            <Section title="Planned" count={planned.length}>
              {planned.map((b) => (
                <BatchCard key={b.id} batch={b} onStatusChange={handleStatusChange} />
              ))}
            </Section>
          )}
          {dispatched.length > 0 && (
            <Section title="Dispatched" count={dispatched.length}>
              {dispatched.map((b) => (
                <BatchCard key={b.id} batch={b} onStatusChange={handleStatusChange} />
              ))}
            </Section>
          )}
          {delivered.length > 0 && (
            <Section title="Delivered" count={delivered.length}>
              {delivered.map((b) => (
                <BatchCard key={b.id} batch={b} onStatusChange={handleStatusChange} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[#8892A8] uppercase tracking-wide mb-2">
        {title} ({count})
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
