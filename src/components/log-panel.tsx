import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    ChevronDown,
    ChevronUp,
    Trash2,
    Terminal,
    CircleCheck,
    CircleAlert,
    Info,
} from "lucide-react";

export interface LogEntry {
    id: number;
    type: "info" | "error" | "success" | "warning";
    message: string;
    timestamp: string;
}

interface LogPanelProps {
    logs: LogEntry[];
    onClear: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

function EntryIcon({ type }: { type: LogEntry["type"] }) {
    if (type === "success") return <CircleCheck className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />;
    if (type === "error") return <CircleAlert className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />;
    if (type === "warning") return <CircleAlert className="h-3 w-3 text-yellow-400 shrink-0 mt-0.5" />;
    return <Info className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />;
}

export function LogPanel({ logs, onClear, isOpen, onToggle }: LogPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isOpen]);

    const errorCount = logs.filter(l => l.type === "error").length;

    return (
        <div className="border-t border-border bg-card flex flex-col shrink-0">
            <button
                onClick={onToggle}
                className="flex items-center justify-between px-3 h-7 hover:bg-muted/50 w-full"
            >
                <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Output</span>
                    {errorCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                            {errorCount} error{errorCount > 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isOpen && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={e => { e.stopPropagation(); onClear(); }}
                            title="Clear output"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                    {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                </div>
            </button>

            {isOpen && (
                <div
                    ref={scrollRef}
                    className="h-40 overflow-auto px-3 py-1 space-y-0.5"
                >
                    {logs.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/40 italic py-2">No output yet.</p>
                    ) : (
                        logs.map(entry => (
                            <div key={entry.id} className="flex gap-2 items-start font-mono text-[11px]">
                                <EntryIcon type={entry.type} />
                                <span className="text-muted-foreground/40 shrink-0 tabular-nums">
                                    {entry.timestamp}
                                </span>
                                <pre className={cn(
                                    "whitespace-pre-wrap break-all flex-1 leading-relaxed",
                                    entry.type === "error" && "text-red-400",
                                    entry.type === "success" && "text-green-400",
                                    entry.type === "warning" && "text-yellow-400",
                                    entry.type === "info" && "text-muted-foreground",
                                )}>
                                    {entry.message}
                                </pre>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
