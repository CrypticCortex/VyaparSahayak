"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrderInfo {
  productName: string;
  productBrand: string;
  posterUrl: string | null;
  offerHeadline: string | null;
  price: number;
  discountPct: number;
  discountedPrice: number;
  distributorName: string;
  campaignId: string;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [info, setInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`/api/order/${token}/info`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setInfo)
      .catch(() => setError("This order link is no longer valid."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          retailerPhone: phone || undefined,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to place order");
        setSubmitting(false);
        return;
      }

      router.push(
        `/order/${token}/confirmation?orderId=${data.orderId}&orderNumber=${data.orderNumber}&product=${encodeURIComponent(data.productName)}&qty=${data.quantity}&total=${data.total}`
      );
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">!</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Link Invalid</h2>
        <p className="text-gray-500">{error || "This order link is no longer valid."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {info.posterUrl && (
        <img
          src={info.posterUrl}
          alt={info.productName}
          className="w-full rounded-lg"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}

      {info.offerHeadline && (
        <h2 className="text-xl font-bold text-gray-900">{info.offerHeadline}</h2>
      )}

      <div>
        <p className="text-lg font-medium text-gray-800">{info.productName}</p>
        <p className="text-sm text-gray-500">{info.productBrand} | {info.distributorName}</p>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-sm text-gray-400 line-through">Rs.{info.price}</span>
        <span className="text-2xl font-bold text-green-600">Rs.{info.discountedPrice}</span>
        <span className="text-sm font-medium text-orange-500">{info.discountPct}% OFF</span>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-11 h-11 rounded-lg border border-gray-300 text-lg font-bold flex items-center justify-center hover:bg-gray-50"
          >
            -
          </button>
          <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="w-11 h-11 rounded-lg border border-gray-300 text-lg font-bold flex items-center justify-center hover:bg-gray-50"
          >
            +
          </button>
          <span className="text-sm text-gray-500 ml-2">
            Total: Rs.{info.discountedPrice * quantity}
          </span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Your WhatsApp number (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 9876543210"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {submitError && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-green-500 text-white font-bold text-base rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Placing Order..." : "Place Order"}
      </button>
    </div>
  );
}
