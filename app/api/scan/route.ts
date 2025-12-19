import { NextResponse } from "next/server";
import { scanText } from "@/lib/scanner/textScanner";
import { scannerConfig } from "@/lib/config/config";
import { addMAC } from "@/lib/security/messageAuth";

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

    // Add MAC for integrity protection
    const responseWithMAC = addMAC({
      status: result.severity,
      detail: result
    });

    return NextResponse.json(responseWithMAC);
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
