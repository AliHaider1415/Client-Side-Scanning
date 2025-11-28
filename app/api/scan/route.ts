import { NextResponse } from "next/server";
import { scanText } from "@/lib/scanner/textScanner";
import { scannerConfig } from "@/lib/config/config";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing 'text' field" },
        { status: 400 }
      );
    }

    const result = scanText(text, scannerConfig);

    return NextResponse.json({ status: result.severity, detail: result });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
