/**
 * /sell is now part of Inventory & Dispensing.
 * Redirect any visitor so old links continue to work.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/inventory");
  }, [router]);
  return null;
}
