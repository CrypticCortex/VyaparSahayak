"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const ROLE_CARDS = [
  {
    username: "kalyan",
    password: "kalyan123",
    name: "Kalyan",
    role: "Distributor",
    description: "Full access -- dashboard, campaigns, orders, dispatch",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    color: "#FF9933",
    bgColor: "#FFF3E0",
  },
  {
    username: "ravi",
    password: "ravi123",
    name: "Ravi",
    role: "Salesman",
    description: "Zone-filtered view (TN-URB), no campaign send",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    color: "#2563EB",
    bgColor: "#EFF6FF",
  },
  {
    username: "murugan",
    password: "murugan123",
    name: "Murugan",
    role: "Kirana Shop",
    description: "Order view only -- campaigns and knowledge base",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    color: "#16A34A",
    bgColor: "#F0FDF4",
  },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(user: string, pass: string) {
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username: user,
        password: pass,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid credentials. Try one of the demo accounts below.");
        setLoading(false);
      } else {
        window.location.href = "/demo";
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }
    await handleLogin(username, password);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF9933]/10 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VyaparSahayak</h1>
          <p className="text-sm text-gray-500 mt-1">AI Inventory Intelligence for FMCG</p>
        </div>

        {/* Manual login form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Sign in</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-500 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933]/40 focus:border-[#FF9933]"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933]/40 focus:border-[#FF9933]"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#FF9933] text-white text-sm font-semibold hover:bg-[#E68A2E] transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        {/* Quick login cards */}
        <div>
          <p className="text-xs font-medium text-gray-400 text-center mb-3 uppercase tracking-wider">
            Or pick a demo role
          </p>
          <div className="space-y-3">
            {ROLE_CARDS.map((card) => (
              <button
                key={card.username}
                type="button"
                disabled={loading}
                onClick={() => handleLogin(card.username, card.password)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left disabled:opacity-50 group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: card.bgColor, color: card.color }}
                >
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{card.name}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ backgroundColor: card.bgColor, color: card.color }}
                    >
                      {card.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Demo environment -- data resets periodically
        </p>
      </div>
    </div>
  );
}
