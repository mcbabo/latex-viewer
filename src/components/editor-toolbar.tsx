import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  ChevronDown,
  Pi,
  Sigma,
  Divide,
  Square,
} from "lucide-react";

interface EditorToolbarProps {
  onInsert: (text: string) => void;
}

export function EditorToolbar({ onInsert }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 border-b border-border overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onInsert("\\textbf{}")}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onInsert("\\textit{}")}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onInsert("\\underline{}")}
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onInsert("\\texttt{}")}
        title="Monospace"
      >
        <Code className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onInsert("\\begin{itemize}\n  \\item \n\\end{itemize}")}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => onInsert("\\begin{enumerate}\n  \\item \n\\end{enumerate}")}
        title="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
            <Pi className="h-3.5 w-3.5" />
            <span className="text-xs">Math</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs">Inline & Display</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onInsert("$  $")}>
            <span className="font-mono text-xs mr-2">$...$</span>
            Inline Math
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("$$\n\n$$")}>
            <span className="font-mono text-xs mr-2">$$...$$</span>
            Display Math
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\begin{equation}\n\n\\end{equation}")}>
            <span className="font-mono text-xs mr-2">equation</span>
            Equation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\begin{align}\n\n\\end{align}")}>
            <span className="font-mono text-xs mr-2">align</span>
            Align
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Common</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onInsert("\\frac{}{}")}>
            <Divide className="h-3.5 w-3.5 mr-2" />
            Fraction
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\sqrt{}")}>
            <Square className="h-3.5 w-3.5 mr-2" />
            Square Root
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\sum_{i=1}^{n}")}>
            <Sigma className="h-3.5 w-3.5 mr-2" />
            Sum
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\int_{a}^{b}")}>
            <span className="font-mono text-sm mr-2">S</span>
            Integral
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\lim_{x \\to \\infty}")}>
            <span className="font-mono text-xs mr-2">lim</span>
            Limit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
            <span className="font-serif text-sm">alpha</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel className="text-xs">Greek Letters</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 p-1">
            {[
              ["\\alpha", "alpha"],
              ["\\beta", "beta"],
              ["\\gamma", "gamma"],
              ["\\delta", "delta"],
              ["\\epsilon", "eps"],
              ["\\theta", "theta"],
              ["\\lambda", "lambda"],
              ["\\mu", "mu"],
              ["\\pi", "pi"],
              ["\\sigma", "sigma"],
              ["\\phi", "phi"],
              ["\\omega", "omega"],
            ].map(([cmd, label]) => (
              <Button
                key={cmd}
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={() => onInsert(cmd)}
              >
                {label}
              </Button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
            <span className="text-xs">Insert</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs">Document Structure</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onInsert("\\section{}")}>
            Section
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\subsection{}")}>
            Subsection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\subsubsection{}")}>
            Subsubsection
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs">Environments</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onInsert("\\begin{figure}[h]\n  \\centering\n  % \\includegraphics{}\n  \\caption{}\n  \\label{fig:}\n\\end{figure}")}>
            Figure
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|}\n    \\hline\n    & \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{}\n  \\label{tab:}\n\\end{table}")}>
            Table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\begin{verbatim}\n\n\\end{verbatim}")}>
            Code Block
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onInsert("\\begin{quote}\n\n\\end{quote}")}>
            Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
