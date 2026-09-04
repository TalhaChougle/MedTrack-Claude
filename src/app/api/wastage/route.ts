import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { wastageLogs, batches, medicines, users, auditLogs } from "@/lib/db/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import {
  sendLowStockAlertEmail,
  recordStockRecovery,
  getShopAlertSettings,
} from "@/lib/emailService";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.shopId;

  try {
    const list = await db
      .select({
        id: wastageLogs.id,
        shopId: wastageLogs.shopId,
        medicineId: wastageLogs.medicineId,
        medicineName: medicines.name,
        batchId: wastageLogs.batchId,
        batchNumber: wastageLogs.batchNumber,
        quantity: wastageLogs.quantity,
        reason: wastageLogs.reason,
        performedBy: wastageLogs.performedBy,
        performedByName: users.name,
        date: wastageLogs.date,
      })
      .from(wastageLogs)
      .innerJoin(medicines, eq(wastageLogs.medicineId, medicines.id))
      .leftJoin(users, eq(wastageLogs.performedBy, users.id))
      .where(eq(wastageLogs.shopId, shopId))
      .orderBy(desc(wastageLogs.date));

    return NextResponse.json(list);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch wastage logs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.shopId;
  const userId = parseInt(session.user.id);

  try {
    const body = await req.json();
    const { batchId, quantity, reason } = body;

    const bId = parseInt(batchId);
    const qty = parseInt(quantity);

    if (isNaN(bId) || isNaN(qty) || qty <= 0 || !reason) {
      return NextResponse.json(
        { error: "Valid batchId, positive quantity, and reason are required." },
        { status: 400 }
      );
    }

    // Verify batch belongs to shop
    const [batchItem] = await db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.id, bId),
          eq(batches.shopId, shopId)
        )
      );

    if (!batchItem) {
      return NextResponse.json(
        { error: "Batch not found in your shop." },
        { status: 404 }
      );
    }

    if (qty > batchItem.quantity) {
      return NextResponse.json(
        { error: `Cannot write off ${qty} units. Batch only has ${batchItem.quantity} units.` },
        { status: 400 }
      );
    }

    // 1. Deduct from batch
    const newQty = batchItem.quantity - qty;
    await db
      .update(batches)
      .set({ quantity: newQty })
      .where(eq(batches.id, batchItem.id));

    // 2. Insert into wastage_logs with batch_number as text
    const [wastageEntry] = await db
      .insert(wastageLogs)
      .values({
        shopId,
        medicineId: batchItem.medicineId,
        batchId: batchItem.id,
        batchNumber: batchItem.batchNumber,
        quantity: qty,
        reason: reason.trim(),
        performedBy: userId,
      })
      .returning();

    // 3. Write audit log entry
    const [med] = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, batchItem.medicineId));

    await db.insert(auditLogs).values({
      shopId,
      userId,
      action: "WASTAGE",
      entityType: "batch",
      entityId: batchItem.id,
      detail: JSON.stringify({
        medicineName: med?.name || "Unknown",
        batchNumber: batchItem.batchNumber,
        quantityWrittenOff: qty,
        reason: wastageEntry.reason,
        remainingInBatch: newQty,
      }),
    });

    // 4. Check low-stock threshold after deduction and trigger email if needed.
    //    We only check if we have a medicine record and it has a threshold set.
    if (med && med.reorderThreshold > 0) {
      const todayStr = new Date().toISOString().split("T")[0];

      // Sum all unexpired batch quantities for this medicine
      const allBatches = await db
        .select()
        .from(batches)
        .where(
          and(
            eq(batches.shopId, shopId),
            eq(batches.medicineId, med.id),
            gt(batches.quantity, 0)
          )
        );

      const remainingStock = allBatches
        .filter((b) => b.expiryDate >= todayStr)
        .reduce((sum, b) => sum + b.quantity, 0);

      if (remainingStock <= med.reorderThreshold) {
        await sendLowStockAlertEmail({
          shopId,
          medicineName: med.name,
          currentStock: remainingStock,
          reorderThreshold: med.reorderThreshold,
          manufacturer: med.manufacturer,
        });
      }
      // No recovery marker needed here — wastage only reduces stock, never increases it.
    }

    return NextResponse.json(wastageEntry, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Wastage log creation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
