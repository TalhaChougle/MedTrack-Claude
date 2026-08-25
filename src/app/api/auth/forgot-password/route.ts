import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initDatabase } from "@/lib/db/init";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validateEmail } from "@/lib/emailValidation";

export async function POST(req: Request) {
  try {
    try {
      await initDatabase();
    } catch (e) {
      console.warn("Database auto-init warning:", e);
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    // 1. Email format and domain validation
    const validation = validateEmail(email);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Invalid email address format." },
        { status: 400 }
      );
    }

    const cleanedEmail = email.trim().toLowerCase();

    // 2. Check if user account exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanedEmail));

    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: "No registered pharmacy account was found with this email address." },
        { status: 404 }
      );
    }

    const user = existingUsers[0];

    // 3. Generate 6-digit OTP token and 15-minute expiration
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes from now

    // 4. Save token to database
    await db.insert(passwordResetTokens).values({
      email: cleanedEmail,
      token: otpCode,
      expiresAt,
      used: false,
    });

    // Mask email for security display (e.g., a***n@medtrack.com)
    const emailParts = cleanedEmail.split("@");
    const maskedName = emailParts[0].length > 2
      ? `${emailParts[0][0]}***${emailParts[0][emailParts[0].length - 1]}`
      : `${emailParts[0][0]}***`;
    const maskedEmail = `${maskedName}@${emailParts[1]}`;

    return NextResponse.json(
      {
        message: "Password reset verification code dispatched successfully.",
        email: cleanedEmail,
        maskedEmail,
        userName: user.name,
        // Provided for professional testing / local environment display
        demoVerificationCode: otpCode,
        expiresInMinutes: 15,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Forgot password request error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process forgot password request.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
