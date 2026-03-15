import { useState, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appLocalDataDir, join, dirname } from "@tauri-apps/api/path";
import { cn, getFilename, formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { LatexEditor, type LatexEditorHandle } from "@/components/latex-editor";
import { PdfPreview } from "@/components/pdf-preview";
import { EditorToolbar } from "@/components/editor-toolbar";
import { EditorSidebar } from "@/components/editor-sidebar";
import { LogPanel, type LogEntry } from "@/components/log-panel";
import { useTheme } from "next-themes";
import {
  PanelLeftClose, PanelLeftOpen, FileText, Save,
  Columns, FileCode, Eye, Play, Loader2, Sun, Moon, X,
} from "lucide-react";

type ViewMode = "editor" | "split" | "preview";

interface FileState {
  content: string;
  saved: string;
}

function EmptyEditorState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground/50 select-none">
      <FileCode className="h-12 w-12" />
      <p className="text-sm">Open a file from the sidebar to start editing</p>
    </div>
  );
}

export default function App() {
  const { resolvedTheme, setTheme } = useTheme();
  const [content, setContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const prevPdfUrl = useRef<string | null>(null);
  const editorRef = useRef<LatexEditorHandle>(null);
  const logId = useRef(0);
  const lastSavedContent = useRef<string>("");
  const fileStateRef = useRef<Map<string, FileState>>(new Map());
  // Tracks latest editor content synchronously — avoids stale closures in callbacks
  const contentRef = useRef("");
  // Cached output dir — resolved once, never changes at runtime
  const outputDirRef = useRef<string | null>(null);

  // Keep contentRef in sync on every editor change
  const handleContentChange = useCallback((val: string) => {
    contentRef.current = val;
    setContent(val);
  }, []);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev, { id: ++logId.current, type, message, timestamp: ts }]);
  }, []);

  // Resolves and caches the app's output directory (IPC call runs at most once)
  const getOutputDir = useCallback(async (): Promise<string> => {
    if (!outputDirRef.current) {
      outputDirRef.current = await join(await appLocalDataDir(), "latex-viewer");
    }
    return outputDirRef.current;
  }, []);

  // Deduplicates the Blob-URL creation + revocation + state update pattern
  const setPdfFromBytes = useCallback((bytes: number[]) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
    prevPdfUrl.current = url;
    setPdfUrl(url);
    setCompileError(null);
  }, []);

  // Flushes the current in-memory editor content into fileStateRef before a tab switch
  const flushContent = useCallback(() => {
    if (!activeFilePath) return;
    const cur = fileStateRef.current.get(activeFilePath);
    if (cur) cur.content = contentRef.current;
  }, [activeFilePath]);

  const handleScrollToLine = useCallback((line: number) => {
    editorRef.current?.scrollToLine(line);
  }, []);

  const handleInsert = useCallback((text: string) => {
    editorRef.current?.insertAtCursor(text);
  }, []);

  const loadCachedPdf = useCallback(async (path: string) => {
    try {
      const outputDir = await getOutputDir();
      const cached = await invoke<number[] | null>("get_cached_pdf", { sourcePath: path, outputDir });
      if (cached) {
        setPdfFromBytes(cached);
        return true;
      }
      setPdfUrl(null);
      return false;
    } catch {
      setPdfUrl(null);
      return false;
    }
  }, [getOutputDir, setPdfFromBytes]);

  const handleFileOpen = useCallback(async (fileContent: string, path: string) => {
    flushContent();

    const isNew = !fileStateRef.current.has(path);
    if (isNew) {
      fileStateRef.current.set(path, { content: fileContent, saved: fileContent });
    }

    const state = fileStateRef.current.get(path)!;
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
    contentRef.current = state.content;
    setContent(state.content);
    setActiveFilePath(path);
    setCompileError(null);
    lastSavedContent.current = state.saved;

    if (isNew) {
      addLog("info", `Opened ${getFilename(path)}`);
      const hadCache = await loadCachedPdf(path);
      if (hadCache) addLog("info", "Loaded cached PDF");
    } else {
      await loadCachedPdf(path);
    }
  }, [flushContent, addLog, loadCachedPdf]);

  const handleTabSwitch = useCallback(async (path: string) => {
    if (path === activeFilePath) return;
    const fileState = fileStateRef.current.get(path);
    if (!fileState) return;

    flushContent();
    contentRef.current = fileState.content;
    setContent(fileState.content);
    setActiveFilePath(path);
    setCompileError(null);
    lastSavedContent.current = fileState.saved;
    await loadCachedPdf(path);
  }, [activeFilePath, flushContent, loadCachedPdf]);

  const handleTabClose = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fileStateRef.current.delete(path);
    const next = openFiles.filter(p => p !== path);
    setOpenFiles(next);

    if (path === activeFilePath) {
      if (next.length === 0) {
        setActiveFilePath(null);
        contentRef.current = "";
        setContent("");
        setPdfUrl(null);
        setCompileError(null);
        lastSavedContent.current = "";
      } else {
        const idx = openFiles.indexOf(path);
        const newPath = next[Math.min(idx, next.length - 1)];
        const newState = fileStateRef.current.get(newPath)!;
        contentRef.current = newState.content;
        setContent(newState.content);
        setActiveFilePath(newPath);
        lastSavedContent.current = newState.saved;
        loadCachedPdf(newPath);
      }
    }
  }, [activeFilePath, openFiles, loadCachedPdf]);

  const handleSave = useCallback(async () => {
    if (!activeFilePath) return;
    try {
      await invoke("write_file_content", { path: activeFilePath, content: contentRef.current });
      lastSavedContent.current = contentRef.current;
      const state = fileStateRef.current.get(activeFilePath);
      if (state) state.saved = contentRef.current;
      addLog("success", `Saved ${getFilename(activeFilePath)}`);
    } catch (err) {
      addLog("error", formatError(err, "Failed to save file"));
    }
  }, [activeFilePath, addLog]);

  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    setCompileError(null);
    addLog("info", `Compiling ${getFilename(activeFilePath ?? "file")}...`);
    try {
      const [outputDir, sourceDir] = await Promise.all([
        getOutputDir(),
        dirname(activeFilePath!),
      ]);
      const pdfPath = await invoke<string>("compile_latex", {
        texContent: contentRef.current,
        outputDir,
        sourceDir,
        sourcePath: activeFilePath!,
      });
      const pdfBytes = await invoke<number[]>("get_pdf_bytes", { pdfPath });
      setPdfFromBytes(pdfBytes);
      addLog("success", "Compilation successful — PDF ready");
    } catch (err) {
      const msg = formatError(err, "Failed to compile LaTeX");
      setCompileError(msg);
      addLog("error", msg);
    } finally {
      setIsCompiling(false);
    }
  }, [activeFilePath, addLog, getOutputDir, setPdfFromBytes]);

  const isDirty = activeFilePath !== null && content !== lastSavedContent.current;
  const { lines, chars } = useMemo(
    () => ({ lines: content.split("\n").length, chars: content.length }),
    [content]
  );

  // Single editor node shared between "editor" and "split" view modes
  const editorNode = activeFilePath
    ? <LatexEditor ref={editorRef} key={activeFilePath} value={content} onChange={handleContentChange} onSave={handleSave} className="h-full" />
    : <EmptyEditorState />;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header data-tauri-drag-region className="flex items-center justify-between h-12 pl-3 pr-34.5 border-b border-border bg-card select-none">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <Separator orientation="vertical" />
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            {activeFilePath ? getFilename(activeFilePath) : "document.tex"}
            {isDirty && <span className="text-primary ml-1 leading-none">●</span>}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="default"
            size="sm"
            className="h-8 px-3 gap-1.5"
            onClick={handleCompile}
            disabled={isCompiling || !activeFilePath}
          >
            {isCompiling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span className="text-xs font-medium">Compile</span>
          </Button>

          <Separator orientation="vertical" className="mx-1" />

          <div className="flex items-center rounded-md bg-muted p-0.5">
            <Button variant={viewMode === "editor" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode("editor")}>
              <FileCode className="h-3.5 w-3.5 mr-1" />Editor
            </Button>
            <Button variant={viewMode === "split" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode("split")}>
              <Columns className="h-3.5 w-3.5 mr-1" />Split
            </Button>
            <Button variant={viewMode === "preview" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode("preview")}>
              <Eye className="h-3.5 w-3.5 mr-1" />Preview
            </Button>
          </div>

          <Separator orientation="vertical" className="mx-1" />

          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5" onClick={handleSave} disabled={!activeFilePath}>
            <Save className="h-3.5 w-3.5" />
            <span className="text-xs">Save</span>
          </Button>

          <Separator orientation="vertical" className="mx-1" />

          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} title="Toggle theme">
            {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className={`w-56 border-r border-border shrink-0${sidebarOpen ? "" : " hidden"}`}>
          <EditorSidebar
            activeFilePath={activeFilePath}
            onFileOpen={handleFileOpen}
            content={content}
            onScrollToLine={handleScrollToLine}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {openFiles.length > 0 && (
            <div className="flex border-b border-border bg-card overflow-x-auto shrink-0 min-h-9">
              {openFiles.map(path => {
                const name = getFilename(path);
                const isActive = path === activeFilePath;
                const state = fileStateRef.current.get(path);
                const tabDirty = isActive
                  ? isDirty
                  : state ? state.content !== state.saved : false;
                return (
                  <div
                    key={path}
                    onClick={() => handleTabSwitch(path)}
                    className={cn(
                      "group flex items-center gap-1.5 h-9 px-3 text-xs border-r border-border cursor-pointer shrink-0 select-none transition-colors",
                      isActive
                        ? "bg-background text-foreground border-t-2 border-t-primary"
                        : "bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <span className="max-w-30 truncate">{name}</span>
                    {tabDirty && <span className="text-primary leading-none">●</span>}
                    <button
                      onClick={(e) => handleTabClose(path, e)}
                      className={cn(
                        "h-4 w-4 flex items-center justify-center rounded transition-opacity",
                        "hover:bg-destructive/20 hover:text-destructive",
                        isActive ? "opacity-50 hover:opacity-100" : "opacity-0 group-hover:opacity-50 hover:opacity-100!"
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode !== "preview" && <EditorToolbar onInsert={handleInsert} />}

          <div className="flex-1 overflow-hidden">
            {viewMode === "editor" && editorNode}
            {viewMode === "preview" && (
              <PdfPreview pdfUrl={pdfUrl} isCompiling={isCompiling} error={compileError} className="h-full" />
            )}
            {viewMode === "split" && (
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize={50} minSize={30}>
                  {editorNode}
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={30}>
                  <PdfPreview pdfUrl={pdfUrl} isCompiling={isCompiling} error={compileError} className="h-full" />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>

          <LogPanel
            logs={logs}
            onClear={() => setLogs([])}
          />

          <div className="flex items-center justify-between h-6 px-3 bg-muted/50 border-t border-border text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>LaTeX</span>
              <span>UTF-8</span>
              {isCompiling && <span className="text-primary">Compiling...</span>}
            </div>
            <span>{lines} lines, {chars} characters</span>
          </div>
        </div>
      </div>
    </div>
  );
}
