import React, { useState } from "react";
import Outputs from "./Outputs.jsx";

// Satu sel notebook. Editor textarea sederhana (agen boleh ganti CodeMirror/Monaco).
export default function Cell({
  cell,
  isRunning,
  onChangeSource,
  onRun,
  onDelete,
  onMove,
  onToggleType,
}) {
  const [previewMd, setPreviewMd] = useState(cell.type === "markdown");
  const isMd = cell.type === "markdown";

  return (
    <div className={`nb-cell nb-cell--${cell.type}`}>
      <div className="nb-cell__gutter">
        <button className="nb-run" title="Jalankan sel" onClick={onRun} disabled={isRunning}>
          {isRunning ? "…" : "▶"}
        </button>
        <span className="nb-count">{cell.type === "code" ? `[${cell.execution_count ?? " "}]` : ""}</span>
      </div>

      <div className="nb-cell__body">
        {isMd && previewMd ? (
          <div className="nb-md" onDoubleClick={() => setPreviewMd(false)}>
            {cell.source || "_Sel markdown kosong — klik dua kali untuk menyunting._"}
          </div>
        ) : (
          <textarea
            className="nb-src"
            value={cell.source}
            spellCheck={false}
            onChange={(e) => onChangeSource(e.target.value)}
            onBlur={() => isMd && setPreviewMd(true)}
            placeholder={isMd ? "Tulis markdown…" : "Tulis kode Python…"}
            rows={Math.max(2, cell.source.split("\n").length)}
          />
        )}
        {cell.type === "code" && <Outputs outputs={cell.outputs} />}
      </div>

      <div className="nb-cell__actions">
        <button onClick={() => onMove("up")} title="Naikkan">↑</button>
        <button onClick={() => onMove("down")} title="Turunkan">↓</button>
        <button onClick={onToggleType} title="Ganti tipe">{isMd ? "Kode" : "Teks"}</button>
        <button onClick={onDelete} title="Hapus sel" className="nb-danger">✕</button>
      </div>
    </div>
  );
}
