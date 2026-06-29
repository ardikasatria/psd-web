// Jembatan persistensi notebook ke API PSD (BUKAN IndexedDB browser).
// PSD = sumber kebenaran. Muat saat buka; autosave (debounce) saat berubah.

export async function loadNotebook(apiBase, notebookId, token) {
  const res = await fetch(`${apiBase}/api/notebooks/${notebookId}/content`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Gagal memuat notebook (${res.status})`);
  return res.json(); // ipynb JSON
}

export async function saveNotebook(apiBase, notebookId, ipynb, token) {
  const res = await fetch(`${apiBase}/api/notebooks/${notebookId}/content`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ipynb),
  });
  if (!res.ok) throw new Error(`Gagal menyimpan notebook (${res.status})`);
  return res.json();
}

// Pembungkus autosave dengan debounce. Kembalikan { schedule, flush }.
export function createAutosave(saveFn, delayMs = 1200) {
  let timer = null;
  let lastPayload = null;
  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastPayload != null) {
      const p = lastPayload;
      lastPayload = null;
      await saveFn(p);
    }
  };
  const schedule = (payload) => {
    lastPayload = payload;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };
  return { schedule, flush };
}
