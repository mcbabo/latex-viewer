import "./App.css";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [tex, setTex] = useState(`\\documentclass{article}
\\begin{document}
Hello, LaTeX!
\\end{document}`);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("Idle");

  const tempDir = "/tmp/latex"; // replace with tauri tempDir() in production

  const compileLatex = async () => {
    setStatus("Compiling...");
    setError(null);
    try {
      const pdfPath = await invoke("compile_latex", { texContent: tex, outputDir: tempDir });
      const pdfBytes = await invoke("get_pdf_bytes", { pdfPath });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
      setStatus("Compiled successfully");
    } catch (err) {
      setError(err);
      setStatus("Compilation failed");
    }
  };

  const saveTex = async () => {
    const path = prompt("Enter path to save .tex file:");
    if (!path) return;
    try {
      await window.__TAURI__.fs.writeTextFile({ path, contents: tex });
      setStatus("File saved");
    } catch (e) {
      setError(e.toString());
      setStatus("Save failed");
    }
  };

  const loadTex = async () => {
    const path = prompt("Enter path to load .tex file:");
    if (!path) return;
    try {
      const content = await window.__TAURI__.fs.readTextFile(path);
      setTex(content);
      setStatus("File loaded");
    } catch (e) {
      setError(e.toString());
      setStatus("Load failed");
    }
  };

  return (
    <main className="flex h-full w-full flex-col">
      {/* Top bar */}
      <div className="flex items-center p-10 gap-10">
        <button onClick={compileLatex}>Compile</button>
        <button onClick={saveTex}>Save</button>
        <button onClick={loadTex}>Load</button>
        <span style={{ marginLeft: "auto" }}>{status}</span>
      </div>

      {/* Editor + PDF preview */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <textarea
          style={{
            flex: 1,
            padding: 10,
            fontFamily: "monospace",
            fontSize: 14,
            resize: "none",
            minHeight: 0,
            overflow: "auto"
          }}
          value={tex}
          onChange={(e) => setTex(e.target.value)}
        />
        <div style={{ flex: 1, borderLeft: "1px solid #ccc", minHeight: 0 }}>
          {pdfUrl ? (
            <iframe src={pdfUrl} style={{ width: "100%", height: "100%" }} />
          ) : (
            <div style={{ padding: 20 }}>PDF preview will appear here</div>
          )}
          {error && <pre style={{ color: "red", padding: 10 }}>{error}</pre>}
        </div>
      </div>
    </main>
  );
}

export default App;