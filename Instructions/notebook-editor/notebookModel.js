// Model notebook murni untuk editor sel gaya Kaggle.
// Tanpa dependensi UI → bisa diuji (node) & dipakai ulang oleh React.
// Sel: { id, type:'code'|'markdown', source:string, outputs:[], execution_count }

let _seq = 0;
export function genId() {
  return "c" + Date.now().toString(36) + (_seq++).toString(36);
}

export function newCell(type = "code", source = "") {
  return { id: genId(), type, source, outputs: [], execution_count: null };
}

export function createNotebook() {
  return {
    cells: [newCell("code", "")],
    metadata: {
      kernelspec: { display_name: "Python (Pyodide)", language: "python", name: "python" },
      language_info: { name: "python" },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

export function addCell(nb, { type = "code", index = null, source = "" } = {}) {
  const cells = [...nb.cells];
  const at = index == null ? cells.length : Math.max(0, Math.min(index, cells.length));
  cells.splice(at, 0, newCell(type, source));
  return { ...nb, cells };
}

export function deleteCell(nb, id) {
  const cells = nb.cells.filter((c) => c.id !== id);
  // Jangan biarkan notebook kosong.
  return { ...nb, cells: cells.length ? cells : [newCell("code", "")] };
}

export function moveCell(nb, id, dir) {
  const i = nb.cells.findIndex((c) => c.id === id);
  if (i < 0) return nb;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= nb.cells.length) return nb;
  const cells = [...nb.cells];
  [cells[i], cells[j]] = [cells[j], cells[i]];
  return { ...nb, cells };
}

export function changeCellType(nb, id, type) {
  return {
    ...nb,
    cells: nb.cells.map((c) =>
      c.id === id
        ? { ...c, type, outputs: type === "markdown" ? [] : c.outputs }
        : c
    ),
  };
}

export function setCellSource(nb, id, source) {
  return { ...nb, cells: nb.cells.map((c) => (c.id === id ? { ...c, source } : c)) };
}

export function setCellResult(nb, id, { outputs = [], execution_count = null } = {}) {
  return {
    ...nb,
    cells: nb.cells.map((c) =>
      c.id === id ? { ...c, outputs, execution_count } : c
    ),
  };
}

// ---------- serialisasi ipynb (nbformat 4.5) ----------
// ipynb `source` = array baris (tiap baris diakhiri \n kecuali baris terakhir).
export function toSource(s) {
  return s && s.length ? s.match(/[^\n]*\n|[^\n]+$/g) ?? [] : [];
}
export function fromSource(src) {
  return Array.isArray(src) ? src.join("") : src || "";
}

export function toIpynb(nb) {
  return {
    cells: nb.cells.map((c) => {
      const base = { cell_type: c.type, id: c.id, metadata: {}, source: toSource(c.source) };
      if (c.type === "code") {
        base.execution_count = c.execution_count ?? null;
        base.outputs = c.outputs ?? [];
      }
      return base;
    }),
    metadata: nb.metadata ?? {},
    nbformat: 4,
    nbformat_minor: 5,
  };
}

export function fromIpynb(ip) {
  return {
    cells: (ip.cells || []).map((c) => ({
      id: c.id || genId(),
      type: c.cell_type === "markdown" ? "markdown" : "code",
      source: fromSource(c.source),
      outputs: c.outputs || [],
      execution_count: c.execution_count ?? null,
    })),
    metadata: ip.metadata || {},
    nbformat: ip.nbformat || 4,
    nbformat_minor: ip.nbformat_minor || 5,
  };
}
