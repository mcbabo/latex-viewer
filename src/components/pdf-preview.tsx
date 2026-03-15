"use client";

import { cn } from "@/lib/utils";
import { FileWarning, FileText, Loader2 } from "lucide-react";

interface PdfPreviewProps {
    pdfUrl: string | null;
    isCompiling: boolean;
    error: string | null;
    className?: string;
}

export function PdfPreview({ pdfUrl, isCompiling, error, className }: PdfPreviewProps) {
    if (isCompiling) {
        return (
            <div className={cn("h-full flex flex-col items-center justify-center bg-muted/30", className)}>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Compiling LaTeX...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Running pdflatex</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("h-full flex flex-col items-center justify-center bg-muted/30 p-6", className)}>
                <FileWarning className="h-12 w-12 text-destructive mb-4" />
                <p className="text-sm font-medium text-destructive mb-2">Compilation Error</p>
                <div className="max-w-md w-full bg-card rounded-lg border border-border p-4 overflow-auto max-h-64">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {error}
                    </pre>
                </div>
            </div>
        );
    }

    if (!pdfUrl) {
        return (
            <div className={cn("h-full flex flex-col items-center justify-center bg-muted/30", className)}>
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground mb-1">No PDF generated yet</p>
                <p className="text-xs text-muted-foreground/70">Click the Compile button to generate a PDF</p>
            </div>
        );
    }

    return (
        <div className={cn("h-full bg-muted", className)}>
            <iframe
                src={`${pdfUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="PDF Preview"
            />
        </div>
    );
}
