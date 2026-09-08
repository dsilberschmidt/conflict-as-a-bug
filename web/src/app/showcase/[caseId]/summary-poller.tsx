"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 10;
const INTERVAL_MS = 3000;

export function SummaryPoller() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;

    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(id);
      }
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [router]);

  return null;
}
