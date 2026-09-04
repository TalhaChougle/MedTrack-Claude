import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sales, users, patients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.shopId;

  try {
    const list = await db
      .select({
        id: sales.id,
        medicineName: sales.medicineName,
        quantity: sales.quantity,
        unitPrice: sales.unitPrice,
        subtotal: sales.subtotal,
        discountPercent: sales.discountPercent,
        discountAmount: sales.discountAmount,
        totalPrice: sales.totalPrice,
        patientName: sales.patientName,
        doctorName: sales.doctorName,
        batchDetails: sales.batchDetails,
        createdAt: sales.createdAt,
        staffName: users.name,
      })
      .from(sales)
      .leftJoin(users, eq(sales.userId, users.id))
      .where(eq(sales.shopId, shopId))
      .orderBy(desc(sales.createdAt))
      .limit(500);

    return NextResponse.json(list);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch sales log";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
