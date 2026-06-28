// Komponen embed dashboard Superset (Langkah 53, sub-langkah 3).
// npm i @superset-ui/embedded-sdk
//
// fetchGuestToken memanggil endpoint PSD /api/bi/guest-token, yang mencetak token
// dengan RLS per tim. Pengguna tidak pernah login ke Superset langsung.

import { useEffect, useRef } from "react";
import { embedDashboard } from "@superset-ui/embedded-sdk";

export function EmbeddedDashboard({ dashboardKey }: { dashboardKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let mounted = true;

    (async () => {
      // Ambil UUID + domain + token dari backend PSD (sekali, untuk init).
      const res = await fetch("/api/bi/guest-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // sertakan cookie sesi PSD
        body: JSON.stringify({ dashboard_key: dashboardKey }),
      });
      if (!res.ok) throw new Error("Gagal mengambil guest token");
      const { uuid, supersetDomain } = await res.json();
      if (!mounted || !ref.current) return;

      await embedDashboard({
        id: uuid,
        supersetDomain,
        mountPoint: ref.current,
        // SDK memanggil ini saat token perlu disegarkan.
        fetchGuestToken: async () => {
          const r = await fetch("/api/bi/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ dashboard_key: dashboardKey }),
          });
          const { token } = await r.json();
          return token;
        },
        dashboardUiConfig: { hideTitle: false, filters: { expanded: true } },
      });
    })();

    return () => { mounted = false; };
  }, [dashboardKey]);

  return <div ref={ref} style={{ width: "100%", height: "80vh" }} />;
}
