// Kernel BROWSER (Pyodide) — implementasi antarmuka kernel untuk runtime JupyterLite.
// Hanya berjalan di browser (memuat Pyodide dari CDN/aset PSD). Referensi untuk agen.
//
// Menangkap stdout/stderr & nilai hasil sel, lalu mengembalikannya sebagai NbOutput[].
// Menyediakan `psd` (SDK psd-lite) di namespace agar `await psd.load(...)` bekerja.

import { KernelStatus } from "./kernelInterface.js";

export async function createPyodideKernel({ pyodideUrl, apiBase, authToken, packages = [] }) {
  let status = KernelStatus.STARTING;
  const listeners = new Set();
  const setStatus = (s) => {
    status = s;
    listeners.forEach((cb) => cb(s));
  };

  // eslint-disable-next-line no-undef
  const pyodide = await loadPyodide({ indexURL: pyodideUrl });
  if (packages.length) await pyodide.loadPackage(packages);

  // Inject konfigurasi psd-lite untuk SDK browser.
  pyodide.globals.set("__PSD_API_BASE__", apiBase || "");
  pyodide.globals.set("__PSD_TOKEN__", authToken || "");
  // (Agen: bootstrap modul `psd` browser di sini, mis. via micropip atau aset.)

  let count = 0;
  setStatus(KernelStatus.IDLE);

  return {
    get status() {
      return status;
    },
    onStatus(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async execute(code) {
      setStatus(KernelStatus.BUSY);
      const outputs = [];
      pyodide.setStdout({ batched: (t) => outputs.push({ output_type: "stream", name: "stdout", text: t }) });
      pyodide.setStderr({ batched: (t) => outputs.push({ output_type: "stream", name: "stderr", text: t }) });
      try {
        const result = await pyodide.runPythonAsync(code);
        if (result !== undefined) {
          outputs.push({
            output_type: "execute_result",
            data: { "text/plain": String(result) },
            metadata: {},
            execution_count: count + 1,
          });
        }
      } catch (err) {
        outputs.push({
          output_type: "error",
          ename: err?.name || "Error",
          evalue: String(err?.message || err),
          traceback: [String(err)],
        });
      } finally {
        count += 1;
        setStatus(KernelStatus.IDLE);
      }
      return { outputs, execution_count: count };
    },
    async interrupt() {
      setStatus(KernelStatus.IDLE);
    },
    async restart() {
      count = 0;
      setStatus(KernelStatus.IDLE);
    },
  };
}
