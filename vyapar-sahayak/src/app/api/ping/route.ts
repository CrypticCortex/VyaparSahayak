import { NextResponse } from "next/server";

export async function GET() {
  // Log all env var keys to diagnose what's available
  const allKeys = Object.keys(process.env).filter(k =>
    !k.startsWith('npm_') && !k.startsWith('NEXT_') && k !== 'PATH' && k !== 'HOME'
  ).sort();

  const dbUrl = process.env.DATABASE_URL;

  try {
    const { prisma } = await import("@/lib/db");
    const count = await prisma.distributor.count();
    return NextResponse.json({
      pong: true,
      distributors: count,
      dbUrlSet: !!dbUrl,
      dbUrlPrefix: dbUrl ? dbUrl.substring(0, 20) : "undefined",
      availableKeys: allKeys,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      pong: true,
      error: String(error).substring(0, 200),
      dbUrlSet: !!dbUrl,
      availableKeys: allKeys,
      time: new Date().toISOString(),
    }, { status: 500 });
  }
}
