import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db, client } from "@/lib/db";
import { sales, auditLogs, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.shopId;

  try {
    // Ensure sales table exists
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
          medicine_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          subtotal REAL NOT NULL DEFAULT 0,
          discount_percent REAL NOT NULL DEFAULT 0,
          discount_amount REAL NOT NULL DEFAULT 0,
          total_price REAL NOT NULL,
          batch_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {
      console.warn("Table init warning:", e);
    }

    // Fetch sales records for shop
    const salesRecords = await db
      .select({
        id: sales.id,
        shopId: sales.shopId,
        userId: sales.userId,
        medicineId: sales.medicineId,
        medicineName: sales.medicineName,
        quantity: sales.quantity,
        unitPrice: sales.unitPrice,
        subtotal: sales.subtotal,
        discountPercent: sales.discountPercent,
        discountAmount: sales.discountAmount,
        totalPrice: sales.totalPrice,
        batchDetails: sales.batchDetails,
        createdAt: sales.createdAt,
        userName: users.name,
      })
      .from(sales)
      .leftJoin(users, eq(sales.userId, users.id))
      .where(eq(sales.shopId, shopId))
      .orderBy(desc(sales.createdAt));

    // Also fetch auditLogs SELL records in case older sales were logged prior to sales table
    const sellAuditLogs = await db
      .select({
        id: auditLogs.id,
        shopId: auditLogs.shopId,
        userId: auditLogs.userId,
        detail: auditLogs.detail,
        timestamp: auditLogs.timestamp,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.shopId, shopId), eq(auditLogs.action, "SELL")))
      .orderBy(desc(auditLogs.timestamp));

    // Consolidate sales records (combining sales table + auditLogs fallback if not duplicate)
    const processedTransactions: any[] = [];
    const seenMap = new Set();

    for (const r of salesRecords) {
      processedTransactions.push({
        id: `sale-${r.id}`,
        medicineName: r.medicineName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        subtotal: r.subtotal || r.quantity * r.unitPrice,
        discountPercent: r.discountPercent || 0,
        discountAmount: r.discountAmount || 0,
        totalPrice: r.totalPrice,
        batchDetails: r.batchDetails ? JSON.parse(r.batchDetails) : [],
        createdAt: r.createdAt,
        userName: r.userName || "Pharmacy Staff",
      });
      seenMap.add(`${r.medicineName}-${r.quantity}-${r.totalPrice}-${r.createdAt?.slice(0, 16)}`);
    }

    // Include historical audit logs if they are not already in processedTransactions
    for (const log of sellAuditLogs) {
      try {
        const detail = JSON.parse(log.detail || "{}");
        const ts = detail.timestamp || log.timestamp;
        const key = `${detail.medicineName}-${detail.requestedQuantity}-${detail.totalSaleAmount}-${ts?.slice(0, 16)}`;
        
        if (!seenMap.has(key)) {
          seenMap.add(key);
          const reqQty = Number(detail.requestedQuantity) || 1;
          const uPrice = Number(detail.unitPrice) || 0;
          const sub = detail.subtotal || reqQty * uPrice;
          const discPct = detail.discountPercent || 0;
          const discAmt = detail.discountAmount || 0;
          const tot = Number(detail.totalSaleAmount) || sub - discAmt;

          processedTransactions.push({
            id: `audit-${log.id}`,
            medicineName: detail.medicineName || "Medicine",
            quantity: reqQty,
            unitPrice: uPrice,
            subtotal: sub,
            discountPercent: discPct,
            discountAmount: discAmt,
            totalPrice: tot,
            batchDetails: detail.deductions || [],
            createdAt: ts,
            userName: log.userName || "Pharmacy Staff",
          });
        }
      } catch (e) {}
    }

    // Sort all transactions newest first
    processedTransactions.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    // Date Bounds Calculation
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay(); // 0 is Sun, 1 is Mon
    const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Aggregate metrics
    let todayRevenue = 0;
    let todayUnits = 0;
    let todayDiscounts = 0;

    let weekRevenue = 0;
    let weekUnits = 0;

    let monthRevenue = 0;
    let monthUnits = 0;

    let totalRevenue = 0;
    let totalUnits = 0;
    let totalDiscounts = 0;

    for (const t of processedTransactions) {
      const txTime = new Date(t.createdAt).getTime();
      const price = Number(t.totalPrice) || 0;
      const units = Number(t.quantity) || 0;
      const discount = Number(t.discountAmount) || 0;

      totalRevenue += price;
      totalUnits += units;
      totalDiscounts += discount;

      if (txTime >= startOfToday.getTime()) {
        todayRevenue += price;
        todayUnits += units;
        todayDiscounts += discount;
      }

      if (txTime >= startOfWeek.getTime()) {
        weekRevenue += price;
        weekUnits += units;
      }

      if (txTime >= startOfMonth.getTime()) {
        monthRevenue += price;
        monthUnits += units;
      }
    }

    return NextResponse.json({
      summary: {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayUnits,
        todayDiscounts: Math.round(todayDiscounts * 100) / 100,
        weekRevenue: Math.round(weekRevenue * 100) / 100,
        weekUnits,
        monthRevenue: Math.round(monthRevenue * 100) / 100,
        monthUnits,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalUnits,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        transactionCount: processedTransactions.length,
      },
      transactions: processedTransactions,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch financial report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
