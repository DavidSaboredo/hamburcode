"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vuelve a pedir la página cada tanto para que el cliente vea el estado nuevo sin recargar.
export default function AutoRefresh({ everyMs = 15000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, everyMs]);

  return null;
}
