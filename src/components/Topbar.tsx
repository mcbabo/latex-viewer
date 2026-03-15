import { Window } from "@tauri-apps/api/window";

const appWindow = new Window('theUniqueLabel');

function TopBar({ compileLatex, saveTex, loadTex, status }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 10px",
        height: 32,
        background: "#222",
        color: "#fff",
        WebkitAppRegion: "drag",
        userSelect: "none"
      }}
    >
      {/* Controls */}
      <button style={{ WebkitAppRegion: "no-drag" }} onClick={compileLatex}>Compile</button>
      <button style={{ WebkitAppRegion: "no-drag" }} onClick={saveTex}>Save</button>
      <button style={{ WebkitAppRegion: "no-drag" }} onClick={loadTex}>Load</button>

      <span style={{ marginLeft: 10 }}>{status}</span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Window buttons */}
      <div style={{ display: "flex", gap: 5 }}>
        <button
          style={{
            width: 40,
            height: 24,
            WebkitAppRegion: "no-drag",
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer"
          }}
          onClick={() => appWindow.minimize()}
        >
          &#8211;
        </button>
        <button
          style={{
            width: 40,
            height: 24,
            WebkitAppRegion: "no-drag",
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer"
          }}
          onClick={() => appWindow.toggleMaximize()}
        >
          &#9744;
        </button>
        <button
          style={{
            width: 40,
            height: 24,
            WebkitAppRegion: "no-drag",
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer"
          }}
          onClick={() => appWindow.close()}
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}

export default TopBar;