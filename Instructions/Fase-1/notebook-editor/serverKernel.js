// Kernel SERVER — implementasi antarmuka kernel via WebSocket Jupyter messaging.
// Untuk runtime server (tier lebih tinggi). Referensi untuk agen; sesuaikan auth/proxy PSD.
//
// Eksekusi sel: kirim pesan 'execute_request' lewat WS /api/kernels/{id}/channels,
// kumpulkan 'stream'/'execute_result'/'display_data'/'error' hingga 'status: idle'.
// Disarankan memakai @jupyterlab/services untuk produksi; ini versi ringkas.

import { KernelStatus } from "./kernelInterface.js";

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
}

export function createServerKernel({ wsBase, kernelId, token }) {
  let status = KernelStatus.STARTING;
  const listeners = new Set();
  const setStatus = (s) => {
    status = s;
    listeners.forEach((cb) => cb(s));
  };

  const url = `${wsBase}/api/kernels/${kernelId}/channels?token=${encodeURIComponent(token || "")}`;
  const ws = new WebSocket(url);
  const pending = new Map(); // msg_id -> {resolve, outputs, count}

  ws.onopen = () => setStatus(KernelStatus.IDLE);
  ws.onclose = () => setStatus(KernelStatus.DEAD);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const parentId = msg.parent_header?.msg_id;
    const job = parentId && pending.get(parentId);
    if (!job) return;
    const t = msg.header.msg_type;
    if (t === "stream") job.outputs.push({ output_type: "stream", name: msg.content.name, text: msg.content.text });
    else if (t === "execute_result")
      job.outputs.push({ output_type: "execute_result", data: msg.content.data, metadata: msg.content.metadata, execution_count: msg.content.execution_count });
    else if (t === "display_data")
      job.outputs.push({ output_type: "display_data", data: msg.content.data, metadata: msg.content.metadata });
    else if (t === "error")
      job.outputs.push({ output_type: "error", ename: msg.content.ename, evalue: msg.content.evalue, traceback: msg.content.traceback });
    else if (t === "execute_reply") job.count = msg.content.execution_count;
    else if (t === "status" && msg.content.execution_state === "idle") {
      job.resolve({ outputs: job.outputs, execution_count: job.count ?? null });
      pending.delete(parentId);
      setStatus(KernelStatus.IDLE);
    }
  };

  return {
    get status() {
      return status;
    },
    onStatus(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    execute(code) {
      setStatus(KernelStatus.BUSY);
      const msgId = uuid();
      const header = { msg_id: msgId, msg_type: "execute_request", version: "5.3", username: "psd", session: uuid() };
      const content = { code, silent: false, store_history: true, user_expressions: {}, allow_stdin: false };
      return new Promise((resolve) => {
        pending.set(msgId, { resolve, outputs: [], count: null });
        ws.send(JSON.stringify({ header, parent_header: {}, metadata: {}, content, channel: "shell" }));
      });
    },
    async interrupt() {
      /* panggil REST /api/kernels/{id}/interrupt via KernelClient (lihat kernels.py) */
    },
    async restart() {
      /* panggil REST /api/kernels/{id}/restart */
    },
  };
}
