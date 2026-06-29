import React from "react";

const STATUS_LABEL = {
  starting: "Menyalakan kernel…",
  idle: "Siap",
  busy: "Menjalankan…",
  dead: "Kernel mati",
};

// Toolbar atas editor. Label aktif & jelas (apa yang terjadi saat ditekan).
export default function Toolbar({ runtime, kernelStatus, saveState, onRunAll, onAddCell, onRestart, onInterrupt }) {
  return (
    <div className="nb-toolbar">
      <div className="nb-toolbar__left">
        <button className="nb-primary" onClick={onRunAll} disabled={kernelStatus === "busy"}>
          Jalankan semua
        </button>
        <button onClick={() => onAddCell("code")}>+ Kode</button>
        <button onClick={() => onAddCell("markdown")}>+ Teks</button>
        <button onClick={onInterrupt} disabled={kernelStatus !== "busy"}>Hentikan</button>
        <button onClick={onRestart}>Mulai ulang kernel</button>
      </div>

      <div className="nb-toolbar__right">
        <span className={`nb-runtime nb-runtime--${runtime}`}>
          {runtime === "browser" ? "Browser (gratis)" : "Server"}
        </span>
        <span className={`nb-status nb-status--${kernelStatus}`}>
          <i className="nb-dot" /> {STATUS_LABEL[kernelStatus] || kernelStatus}
        </span>
        <span className="nb-save">{saveState}</span>
      </div>
    </div>
  );
}
