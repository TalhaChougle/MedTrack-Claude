/**
 * /sell is now merged into /inventory?tab=dispense
 * This component immediately redirects any visitor so no old links break.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/inventory?tab=dispense");
  }, [router]);
  return null;
}
