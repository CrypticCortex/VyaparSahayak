import { NextResponse } from "next/server";
import { getCachedDistributor } from "@/lib/cache";
import { generateSuggestions } from "@/lib/suggestions";

export async function POST() {
  try {
    const distributor = await getCachedDistributor();
    if (!distributor) {
      return NextResponse.json(
        { error: "No distributor found" },
        { status: 404 }
      );
    }

    const { suggestions, warnings } = await generateSuggestions(distributor.id);

    return NextResponse.json({ suggestions, warnings });
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
