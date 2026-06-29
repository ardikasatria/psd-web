import React from "react";

// Render daftar output sel sesuai nbformat.
export default function Outputs({ outputs }) {
  if (!outputs || outputs.length === 0) return null;
  return (
    <div className="nb-outputs">
      {outputs.map((o, i) => (
        <Output key={i} o={o} />
      ))}
    </div>
  );
}

function Output({ o }) {
  switch (o.output_type) {
    case "stream":
      return <pre className={`nb-out nb-stream ${o.name === "stderr" ? "is-err" : ""}`}>{join(o.text)}</pre>;
    case "error":
      return (
        <pre className="nb-out nb-error">
          {o.ename}: {o.evalue}
          {"\n"}
          {stripAnsi(join(o.traceback))}
        </pre>
      );
    case "execute_result":
    case "display_data": {
      const data = o.data || {};
      if (data["image/png"]) return <img className="nb-out" alt="output" src={`data:image/png;base64,${data["image/png"]}`} />;
      if (data["text/html"]) return <div className="nb-out nb-html" dangerouslySetInnerHTML={{ __html: join(data["text/html"]) }} />;
      if (data["text/plain"]) return <pre className="nb-out">{join(data["text/plain"])}</pre>;
      return null;
    }
    default:
      return null;
  }
}

function join(v) {
  return Array.isArray(v) ? v.join("") : v ?? "";
}
function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return String(s).replace(/\u001b\[[0-9;]*m/g, "");
}
