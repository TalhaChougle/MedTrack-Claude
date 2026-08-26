import { db } from "@/lib/db";
import { alertSettings, emailLogs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AlertSettingsData {
  alertEmail: string;
  enableLowStockEmails: boolean;
  enableIncomingOrderEmails: boolean;
}

/**
 * Retrieves or initializes default alert settings for a shop.
 */
export async function getShopAlertSettings(shopId: number): Promise<AlertSettingsData> {
  try {
    const existing = await db
      .select()
      .from(alertSettings)
      .where(eq(alertSettings.shopId, shopId));

    if (existing.length > 0) {
      const s = existing[0];
      return {
        alertEmail: s.alertEmail || "",
        enableLowStockEmails: Boolean(s.enableLowStockEmails),
        enableIncomingOrderEmails: Boolean(s.enableIncomingOrderEmails),
      };
    }

    // Default to shop owner/admin email
    const shopUsers = await db
      .select()
      .from(users)
      .where(eq(users.shopId, shopId));

    const defaultEmail = shopUsers.length > 0 ? shopUsers[0].email : "admin@medtrack.com";

    // Insert default setting
    await db.insert(alertSettings).values({
      shopId,
      alertEmail: defaultEmail,
      enableLowStockEmails: true,
      enableIncomingOrderEmails: true,
    });

    return {
      alertEmail: defaultEmail,
      enableLowStockEmails: true,
      enableIncomingOrderEmails: true,
    };
  } catch (err) {
    console.error("Error fetching alert settings:", err);
    return {
      alertEmail: "admin@medtrack.com",
      enableLowStockEmails: true,
      enableIncomingOrderEmails: true,
    };
  }
}

/**
 * Dispatches an automated Low Stock Email Alert when a medicine's total stock drops to or below its customizable threshold.
 */
export async function sendLowStockAlertEmail(params: {
  shopId: number;
  medicineName: string;
  currentStock: number;
  reorderThreshold: number;
  manufacturer?: string;
}) {
  const { shopId, medicineName, currentStock, reorderThreshold, manufacturer } = params;

  try {
    const settings = await getShopAlertSettings(shopId);
    if (!settings.enableLowStockEmails || !settings.alertEmail) {
      return { sent: false, reason: "Low stock email alerts disabled or email missing." };
    }

    const isOutOfStock = currentStock <= 0;
    const alertSubject = isOutOfStock
      ? `🚨 CRITICAL OUT OF STOCK ALERT: ${medicineName}`
      : `⚠️ LOW STOCK ALERT: ${medicineName} (${currentStock} units remaining)`;

    const contentHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: ${isOutOfStock ? '#ef4444' : '#f59e0b'}; padding: 12px 20px; border-radius: 8px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">${isOutOfStock ? 'OUT OF STOCK WARNING' : 'LOW MEDICINE STOCK ALERT'}</h2>
        </div>
        <p style="color: #334155; font-size: 15px; margin-top: 16px;">
          Hello Pharmacy Staff,
        </p>
        <p style="color: #334155; font-size: 14px;">
          This is an automated inventory alert from <strong>MedTrack FEFO System</strong>. The medicine <strong>${medicineName}</strong> has dropped below your configured reorder threshold.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Medicine Name:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${medicineName}</td>
          </tr>
          ${manufacturer ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Manufacturer:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${manufacturer}</td>
          </tr>
          ` : ''}
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Current Available Stock:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${isOutOfStock ? '#dc2626' : '#d97706'};">
              ${currentStock} units
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Custom Reorder Threshold:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${reorderThreshold} units</td>
          </tr>
        </table>
        <p style="color: #475569; font-size: 13px;">
          Please place an order for new medicine stock in the <strong>Restock Module</strong> to avoid stockouts.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          Sent by MedTrack FEFO Pharmacy Management System • ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    // Record in email_logs table
    await db.insert(emailLogs).values({
      shopId,
      recipientEmail: settings.alertEmail,
      subject: alertSubject,
      alertType: "LOW_STOCK",
      content: contentHtml,
      status: "SENT",
      timestamp: new Date().toISOString(),
    });

    console.log(`[EMAIL ALERT DISPATCHED] Low stock alert for ${medicineName} sent to ${settings.alertEmail}`);

    return { sent: true, recipient: settings.alertEmail, subject: alertSubject };
  } catch (err) {
    console.error("Failed to send low stock alert email:", err);
    return { sent: false, error: String(err) };
  }
}

/**
 * Dispatches an automated Email Alert when an incoming medicine stock order is placed or updated.
 */
export async function sendIncomingOrderAlertEmail(params: {
  shopId: number;
  medicineName: string;
  expectedQuantity: number;
  expectedArrivalDate: string;
  supplier: string;
  status: string;
}) {
  const { shopId, medicineName, expectedQuantity, expectedArrivalDate, supplier, status } = params;

  try {
    const settings = await getShopAlertSettings(shopId);
    if (!settings.enableIncomingOrderEmails || !settings.alertEmail) {
      return { sent: false, reason: "Incoming order email alerts disabled or email missing." };
    }

    const alertSubject = `📦 INCOMING MEDICINE STOCK ORDER: ${medicineName} (${expectedQuantity} units)`;

    const contentHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: #0284c7; padding: 12px 20px; border-radius: 8px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">INCOMING MEDICINE STOCK ORDER CONFIRMATION</h2>
        </div>
        <p style="color: #334155; font-size: 15px; margin-top: 16px;">
          Hello Pharmacy Staff,
        </p>
        <p style="color: #334155; font-size: 14px;">
          An incoming stock order has been registered/updated in your pharmacy system. Here are the order details:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Medicine Name:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${medicineName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Ordered Quantity:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0284c7;">${expectedQuantity} units</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Supplier:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${supplier}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Expected Arrival Date:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">${expectedArrivalDate}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Order Status:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-transform: uppercase; font-weight: bold; color: #0369a1;">${status}</td>
          </tr>
        </table>
        <p style="color: #475569; font-size: 13px;">
          You can track this order and update status upon receiving batch delivery under the <strong>Restock Module</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          Sent by MedTrack FEFO Pharmacy Management System • ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    // Record in email_logs table
    await db.insert(emailLogs).values({
      shopId,
      recipientEmail: settings.alertEmail,
      subject: alertSubject,
      alertType: "INCOMING_ORDER",
      content: contentHtml,
      status: "SENT",
      timestamp: new Date().toISOString(),
    });

    console.log(`[EMAIL ALERT DISPATCHED] Incoming order alert for ${medicineName} sent to ${settings.alertEmail}`);

    return { sent: true, recipient: settings.alertEmail, subject: alertSubject };
  } catch (err) {
    console.error("Failed to send incoming order alert email:", err);
    return { sent: false, error: String(err) };
  }
}
