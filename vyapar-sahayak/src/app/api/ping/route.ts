import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    const count = await prisma.distributor.count();
    return NextResponse.json({ pong: true, distributors: count, time: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ pong: true, error: String(error), time: new Date().toISOString() }, { status: 500 });
  }
}
