"use client";

import { useSearchParams } from "next/navigation";

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "---";
  const product = searchParams.get("product") || "";
  const qty = searchParams.get("qty") || "1";
  const total = searchParams.get("total") || "0";

  return (
    <div className="text-center py-8 space-y-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
        <span className="text-green-600 text-2xl font-bold">[OK]</span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Order Placed</h2>
        <p className="text-3xl font-bold text-gray-900 mt-3">{orderNumber}</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Product</span>
          <span className="font-medium text-gray-900">{product}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Quantity</span>
          <span className="font-medium text-gray-900">{qty}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span className="text-gray-600">Total</span>
          <span className="font-bold text-gray-900">Rs.{total}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-gray-700 font-medium">Your distributor will confirm shortly</p>
        <p className="text-gray-500 text-sm">You will receive confirmation on WhatsApp</p>
      </div>
    </div>
  );
}
