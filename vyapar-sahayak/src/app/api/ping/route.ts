import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;

  try {
    const { prisma } = await import("@/lib/db");
    const count = await prisma.distributor.count();
    return NextResponse.json({
      pong: true,
      distributors: count,
      dbUrlSet: !!dbUrl,
      dbUrlPrefix: dbUrl ? dbUrl.substring(0, 20) : "undefined",
      hasToken,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      pong: true,
      error: String(error),
      dbUrlSet: !!dbUrl,
      dbUrlPrefix: dbUrl ? dbUrl.substring(0, 20) : "undefined",
      hasToken,
      time: new Date().toISOString(),
    }, { status: 500 });
  }
}
