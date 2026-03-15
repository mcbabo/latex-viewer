import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
    FileText,
    FileCode,
    Folder,
    FolderOpen,
    FolderPlus,
    ChevronRight,
    Image,
    BookOpen,
    File,
    Loader2,
    List,
    Package,
    Hash,
    Minus,
    BookText,
    AlignLeft,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface FsEntry {
    name: string;
    path: string;
    isDir: boolean;
}

interface OutlineItem {
    title: string;
    level: number; // 0=chapter 1=section 2=subsection 3=subsubsection 4=paragraph
    line: number;
}

export interface EditorSidebarProps {
    activeFilePath: string | null;
    onFileOpen: (content: string, path: string) => void;
    content: string;
    onScrollToLine: (line: number) => void;
    className?: string;
}

// ── Parsers ────────────────────────────────────────────────────────────────

const HEADING_LEVELS: Record<string, number> = {
    chapter: 0,
    section: 1,
    subsection: 2,
    subsubsection: 3,
    paragraph: 4,
};

function parseOutline(content: string): OutlineItem[] {
    const items: OutlineItem[] = [];
    const lines = content.split("\n");
    // matches \section*{Title} or \section{Title with {nested} braces}
    const re = /^[^%]*\\(chapter|section|subsection|subsubsection|paragraph)\*?\s*\{([^}]*)\}/;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(re);
        if (m) {
            items.push({ title: m[2].trim(), level: HEADING_LEVELS[m[1]], line: i + 1 });
        }
    }
    return items;
}

function parsePackages(content: string): string[] {
    const packages: string[] = [];
    const lines = content.split("\n");
    const re = /^[^%]*\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/;
    for (const line of lines) {
        const m = line.match(re);
        if (m) {
            for (const pkg of m[1].split(",")) {
                const name = pkg.trim();
                if (name) packages.push(name);
            }
        }
    }
    return [...new Set(packages)];
}

// ── Outline level styles ───────────────────────────────────────────────────

function OutlineIcon({ level }: { level: number }) {
    if (level === 0) return <BookText className="h-3 w-3 shrink-0 text-primary" />;
    if (level === 1) return <Hash className="h-3 w-3 shrink-0 text-primary/80" />;
    if (level === 2) return <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />;
    if (level === 3) return <Minus className="h-3 w-3 shrink-0 text-muted-foreground/70" />;
    return <AlignLeft className="h-3 w-3 shrink-0 text-muted-foreground/50" />;
}

// ── File tree ──────────────────────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set(["tex", "bib", "txt", "sty", "cls", "cfg", "def", "md"]);

function fileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "tex") return <FileCode className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />;
    if (ext === "bib") return <BookOpen className="h-3.5 w-3.5 mr-1.5 text-yellow-400 shrink-0" />;
    if (ext === "pdf") return <FileText className="h-3.5 w-3.5 mr-1.5 text-red-400 shrink-0" />;
    if (["png", "jpg", "jpeg", "svg", "gif"].includes(ext))
        return <Image className="h-3.5 w-3.5 mr-1.5 text-green-400 shrink-0" />;
    return <File className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />;
}

function FileTree({
    entries,
    depth,
    activeFilePath,
    onFileOpen,
}: {
    entries: FsEntry[];
    depth: number;
    activeFilePath: string | null;
    onFileOpen: (content: string, path: string) => void;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [children, setChildren] = useState<Record<string, FsEntry[]>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const handleFolderToggle = async (entry: FsEntry) => {
        if (expanded[entry.path]) {
            setExpanded(prev => ({ ...prev, [entry.path]: false }));
            return;
        }
        setExpanded(prev => ({ ...prev, [entry.path]: true }));
        if (!children[entry.path]) {
            setLoading(prev => ({ ...prev, [entry.path]: true }));
            try {
                const result = await invoke<FsEntry[]>("read_directory", { path: entry.path });
                setChildren(prev => ({ ...prev, [entry.path]: result }));
            } catch (e) {
                console.error("read_directory failed:", e);
            } finally {
                setLoading(prev => ({ ...prev, [entry.path]: false }));
            }
        }
    };

    const handleFileClick = async (entry: FsEntry) => {
        const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
        if (!TEXT_EXTENSIONS.has(ext)) return;
        try {
            const content = await invoke<string>("read_file_content", { path: entry.path });
            onFileOpen(content, entry.path);
        } catch (e) {
            console.error("read_file_content failed:", e);
        }
    };

    return (
        <div>
            {entries.map(entry => (
                <div key={entry.path}>
                    {entry.isDir ? (
                        <>
                            <button
                                onClick={() => handleFolderToggle(entry)}
                                className="flex items-center w-full h-7 text-xs hover:bg-accent/50 rounded-sm text-foreground"
                                style={{ paddingLeft: `${depth * 12 + 4}px` }}
                            >
                                {loading[entry.path] ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin shrink-0" />
                                ) : (
                                    <ChevronRight
                                        className={cn(
                                            "h-3 w-3 mr-1 transition-transform shrink-0",
                                            expanded[entry.path] && "rotate-90"
                                        )}
                                    />
                                )}
                                {expanded[entry.path]
                                    ? <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                                    : <Folder className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                                }
                                <span className="truncate">{entry.name}</span>
                            </button>
                            {expanded[entry.path] && (
                                children[entry.path]?.length > 0 ? (
                                    <FileTree
                                        entries={children[entry.path]}
                                        depth={depth + 1}
                                        activeFilePath={activeFilePath}
                                        onFileOpen={onFileOpen}
                                    />
                                ) : !loading[entry.path] && (
                                    <div
                                        className="text-[10px] text-muted-foreground/40 h-6 flex items-center italic"
                                        style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}
                                    >
                                        empty
                                    </div>
                                )
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => handleFileClick(entry)}
                            className={cn(
                                "flex items-center w-full h-7 text-xs hover:bg-accent/50 rounded-sm",
                                activeFilePath === entry.path
                                    ? "bg-accent text-accent-foreground"
                                    : "text-foreground",
                                !TEXT_EXTENSIONS.has(entry.name.split(".").pop()?.toLowerCase() ?? "")
                                && "opacity-50 cursor-default"
                            )}
                            style={{ paddingLeft: `${depth * 12 + 20}px` }}
                        >
                            {fileIcon(entry.name)}
                            <span className="truncate">{entry.name}</span>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function EditorSidebar({
    activeFilePath,
    onFileOpen,
    content,
    onScrollToLine,
    className,
}: EditorSidebarProps) {
    const [activeSection, setActiveSection] = useState<"files" | "outline" | "packages">("files");
    const [rootEntries, setRootEntries] = useState<FsEntry[] | null>(null);
    const [rootName, setRootName] = useState<string | null>(null);
    const [loadingRoot, setLoadingRoot] = useState(false);

    const outline = useMemo(() => parseOutline(content), [content]);
    const packages = useMemo(() => parsePackages(content), [content]);

    const handleOpenFolder = async () => {
        try {
            const selected = await openDialog({ directory: true, multiple: false });
            if (!selected) return;
            const folderPath = selected as string;
            setLoadingRoot(true);
            const entries = await invoke<FsEntry[]>("read_directory", { path: folderPath });
            setRootName(folderPath.split(/[\\/]/).pop() ?? folderPath);
            setRootEntries(entries);
        } catch (e) {
            console.error("Failed to open folder:", e);
        } finally {
            setLoadingRoot(false);
        }
    };

    return (
        <div className={cn("flex flex-col h-full bg-sidebar", className)}>
        <div className="flex border-b border-sidebar-border">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("flex-1 h-9 rounded-none text-xs gap-1.5", activeSection === "files" && "bg-sidebar-accent")}
                    onClick={() => setActiveSection("files")}
                >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Files
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("flex-1 h-9 rounded-none text-xs gap-1.5", activeSection === "outline" && "bg-sidebar-accent")}
                    onClick={() => setActiveSection("outline")}
                >
                    <List className="h-3.5 w-3.5" />
                    Outline
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("flex-1 h-9 rounded-none text-xs gap-1.5", activeSection === "packages" && "bg-sidebar-accent")}
                    onClick={() => setActiveSection("packages")}
                >
                    <Package className="h-3.5 w-3.5" />
                    Pkgs
                </Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeSection === "files" && (
                    <>
                        <div className="flex items-center justify-between px-2 py-1 border-b border-sidebar-border shrink-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">
                                {rootName ?? "no folder open"}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={handleOpenFolder}
                                title="Open Folder"
                            >
                                {loadingRoot
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <FolderPlus className="h-3.5 w-3.5" />
                                }
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto p-1">
                            {!rootEntries ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
                                    <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
                                    <p className="text-[10px] text-muted-foreground/50 text-center">
                                        Click the folder icon to open a project
                                    </p>
                                </div>
                            ) : rootEntries.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground/50 px-2 py-3 italic">Folder is empty</p>
                            ) : (
                                <FileTree
                                    entries={rootEntries}
                                    depth={0}
                                    activeFilePath={activeFilePath}
                                    onFileOpen={onFileOpen}
                                />
                            )}
                        </div>
                    </>
                )}

                {activeSection === "outline" && (
                    <>
                        <div className="px-2 py-1 border-b border-sidebar-border shrink-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                {outline.length} item{outline.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto p-1">
                            {!activeFilePath ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
                                    <List className="h-8 w-8 text-muted-foreground/30" />
                                    <p className="text-[10px] text-muted-foreground/50 text-center">
                                        Open a .tex file to see its outline
                                    </p>
                                </div>
                            ) : outline.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground/50 px-2 py-3 italic">
                                    No sections found
                                </p>
                            ) : (
                                <div>
                                    {outline.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onScrollToLine(item.line)}
                                            className="flex items-center gap-1.5 w-full h-7 text-xs hover:bg-accent/50 rounded-sm text-foreground"
                                            style={{ paddingLeft: `${item.level * 12 + 6}px` }}
                                            title={`Line ${item.line}`}
                                        >
                                            <OutlineIcon level={item.level} />
                                            <span className="truncate flex-1 text-left">{item.title}</span>
                                            <span className="text-[10px] text-muted-foreground/40 shrink-0 pr-1">
                                                {item.line}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeSection === "packages" && (
                    <>
                        <div className="px-2 py-1 border-b border-sidebar-border shrink-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                {packages.length} package{packages.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto p-1">
                            {!activeFilePath ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
                                    <Package className="h-8 w-8 text-muted-foreground/30" />
                                    <p className="text-[10px] text-muted-foreground/50 text-center">
                                        Open a .tex file to detect packages
                                    </p>
                                </div>
                            ) : packages.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground/50 px-2 py-3 italic">
                                    No \\usepackage found
                                </p>
                            ) : (
                                <div className="space-y-0.5">
                                    {packages.map(pkg => (
                                        <div
                                            key={pkg}
                                            className="flex items-center gap-2 h-7 px-2 text-xs text-foreground rounded-sm hover:bg-accent/30"
                                        >
                                            <Package className="h-3 w-3 text-primary shrink-0" />
                                            <span className="font-mono">{pkg}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
