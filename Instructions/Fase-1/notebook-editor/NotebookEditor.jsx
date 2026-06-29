import React, { useEffect, useMemo, useRef, useState } from "react";
import * as M from "./notebookModel.js";
import Cell from "./Cell.jsx";
import Toolbar from "./Toolbar.jsx";
import { createAutosave, saveNotebook } from "./persistence.js";

/**
 * Editor notebook gaya Kaggle.
 *
 * Props:
 *  - initialIpynb : ipynb awal (dari API PSD). Bila null → notebook baru.
 *  - kernel       : implementasi antarmuka kernel (browser/server). Lihat kernels/.
 *  - runtime      : 'browser' | 'server' (untuk label).
 *  - apiBase, notebookId, token : untuk autosave ke PSD.
 */
export default function NotebookEditor({ initialIpynb, kernel, runtime = "browser", apiBase, notebookId, token }) {
  const [nb, setNb] = useState(() => (initialIpynb ? M.fromIpynb(initialIpynb) : M.createNotebook()));
  const [kernelStatus, setKernelStatus] = useState(kernel?.status || "idle");
  const [runningId, setRunningId] = useState(null);
  const [saveState, setSaveState] = useState("Tersimpan");

  // Autosave ke PSD (debounce). PSD = sumber kebenaran, bukan IndexedDB.
  const autosave = useMemo(
    () =>
      createAutosave(async (ipynb) => {
        setSaveState("Menyimpan…");
        try {
          await saveNotebook(apiBase, notebookId, ipynb, token);
          setSaveState("Tersimpan");
        } catch {
          setSaveState("Gagal menyimpan — coba lagi");
        }
      }),
    [apiBase, notebookId, token]
  );

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaveState("Belum tersimpan");
    autosave.schedule(M.toIpynb(nb));
  }, [nb, autosave]);

  useEffect(() => kernel?.onStatus?.(setKernelStatus), [kernel]);

  async function runCell(id) {
    const cell = nb.cells.find((c) => c.id === id);
    if (!cell || cell.type !== "code") return;
    setRunningId(id);
    try {
      const { outputs, execution_count } = await kernel.execute(cell.source);
      setNb((cur) => M.setCellResult(cur, id, { outputs, execution_count }));
    } finally {
      setRunningId(null);
    }
  }

  async function runAll() {
    for (const c of nb.cells) {
      if (c.type === "code") await runCell(c.id); // eslint-disable-line no-await-in-loop
    }
  }

  return (
    <div className="nb-editor">
      <Toolbar
        runtime={runtime}
        kernelStatus={kernelStatus}
        saveState={saveState}
        onRunAll={runAll}
        onAddCell={(type) => setNb((cur) => M.addCell(cur, { type }))}
        onRestart={async () => {
          await kernel.restart?.();
          setNb((cur) => ({ ...cur, cells: cur.cells.map((c) => ({ ...c, outputs: [], execution_count: null })) }));
        }}
        onInterrupt={() => kernel.interrupt?.()}
      />

      <div className="nb-cells">
        {nb.cells.map((cell) => (
          <Cell
            key={cell.id}
            cell={cell}
            isRunning={runningId === cell.id}
            onChangeSource={(s) => setNb((cur) => M.setCellSource(cur, cell.id, s))}
            onRun={() => runCell(cell.id)}
            onDelete={() => setNb((cur) => M.deleteCell(cur, cell.id))}
            onMove={(dir) => setNb((cur) => M.moveCell(cur, cell.id, dir))}
            onToggleType={() => setNb((cur) => M.changeCellType(cur, cell.id, cell.type === "code" ? "markdown" : "code"))}
          />
        ))}
      </div>
    </div>
  );
}
