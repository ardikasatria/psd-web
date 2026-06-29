// Antarmuka kernel runtime-agnostik. Editor memanggil INI; implementasi nyata
// disuntikkan sesuai runtime terpilih (browser Pyodide ATAU server WS).
//
// Kernel harus menyediakan:
//   status: 'idle' | 'busy' | 'starting' | 'dead'
//   async execute(code) -> { outputs: NbOutput[], execution_count: number }
//   async interrupt()
//   async restart()
//   onStatus(cb)   // langganan perubahan status (opsional)
//
// NbOutput mengikuti nbformat (output_type: 'stream'|'execute_result'|'display_data'|'error').
//
// Lihat pyodideKernel.js (browser) & serverKernel.js (server) untuk implementasi.

export const KernelStatus = {
  STARTING: "starting",
  IDLE: "idle",
  BUSY: "busy",
  DEAD: "dead",
};

// Kernel tiruan untuk pengembangan UI tanpa runtime nyata.
export function createMockKernel() {
  let status = KernelStatus.IDLE;
  let count = 0;
  return {
    get status() {
      return status;
    },
    async execute(code) {
      status = KernelStatus.BUSY;
      await new Promise((r) => setTimeout(r, 120));
      count += 1;
      status = KernelStatus.IDLE;
      return {
        execution_count: count,
        outputs: [
          { output_type: "stream", name: "stdout", text: `(mock) menjalankan ${code.length} karakter\n` },
        ],
      };
    },
    async interrupt() {
      status = KernelStatus.IDLE;
    },
    async restart() {
      count = 0;
      status = KernelStatus.IDLE;
    },
    onStatus() {},
  };
}
