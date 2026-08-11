import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { lookupBarcodeWithFallback } from "@/lib/server/barcodeLookupServer";

export async function GET(req: Request) {
  const session = await getAuthSession();
  const shopId = session?.user?.shopId || 1;

  const { searchParams } = new URL(req.url);
  const barcode = searchParams.get("barcode")?.trim();

  if (!barcode) {
    return NextResponse.json(
      { error: "Barcode query parameter is required." },
      { status: 400 }
    );
  }

  try {
    const result = await lookupBarcodeWithFallback(barcode, shopId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json(
      {
        found: false,
        source: "none",
        medicine: null,
        error: msg,
      },
      { status: 200 }
    );
  }
}
