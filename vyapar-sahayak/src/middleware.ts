import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Public routes that don't need auth
const PUBLIC_PATHS = [
  "/api/auth",      // NextAuth routes
  "/api/ping",      // Health check
  "/api/order/",    // Public campaign order pages
  "/api/health",    // Health check
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip auth for public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip auth for non-API routes (pages handle their own auth)
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Require auth for all other API routes
  if (!req.auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Seed and RAG ingest only for distributors
  if ((pathname.startsWith("/api/seed") || pathname.startsWith("/api/rag/ingest"))
      && (req.auth.user as { role?: string }).role !== "distributor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/:path*"],
};
