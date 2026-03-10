import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const count = await prisma.distributor.count();
    return NextResponse.json({ pong: true, distributors: count, time: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ pong: true, error: String(error), time: new Date().toISOString() }, { status: 500 });
  }
}
