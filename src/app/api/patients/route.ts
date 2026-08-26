import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { patients, sales } from "@/lib/db/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.shopId;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    // Fetch patients for shop matching query if provided
    const patientList = await db
      .select()
      .from(patients)
      .where(
        q
          ? and(eq(patients.shopId, shopId), like(patients.name, `%${q}%`))
          : eq(patients.shopId, shopId)
      )
      .orderBy(desc(patients.createdAt));

    // For each patient, calculate total sales count, total amount spent, and last purchase date
    const enrichedPatients = await Promise.all(
      patientList.map(async (p) => {
        const patientSales = await db
          .select({
            id: sales.id,
            totalPrice: sales.totalPrice,
            createdAt: sales.createdAt,
          })
          .from(sales)
          .where(and(eq(sales.shopId, shopId), eq(sales.patientId, p.id)))
          .orderBy(desc(sales.createdAt));

        const totalOrders = patientSales.length;
        const totalSpent = patientSales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        const lastVisit = patientSales.length > 0 ? patientSales[0].createdAt : p.createdAt;

        return {
          ...p,
          totalOrders,
          totalSpent: Math.round(totalSpent * 100) / 100,
          lastVisit,
        };
      })
    );

    return NextResponse.json(enrichedPatients);
  } catch (error: unknown) {
    console.error("Fetch patients error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch patients";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
