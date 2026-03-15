import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useTheme } from "next-themes";
import { invoke } from "@tauri-apps/api/core";
import snippetData from "@/data/latex-snippets.json";

interface LatexEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  className?: string;
}

export interface LatexEditorHandle {
  scrollToLine: (line: number) => void;
  insertAtCursor: (text: string) => void;
}

// Guard: Monaco globals (language, completions, formatter) are registered once per app lifetime
let monacoInitialized = false;

export const LatexEditor = forwardRef<LatexEditorHandle, LatexEditorProps>(
  function LatexEditor({ value, onChange, onSave, className }, ref) {
    const { resolvedTheme } = useTheme();
    const monacoTheme = resolvedTheme === "light" ? "latex-light" : "latex-dark";
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    // Tracks the last known selection so toolbar inserts work after focus loss
    const selectionRef = useRef<editor.Selection | null>(null);
    // Ref keeps the save callback fresh inside the Monaco command handler
    const onSaveRef = useRef<(() => void) | undefined>(onSave);
    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const ed = editorRef.current;
        if (!ed) return;
        ed.revealLineInCenter(line);
        ed.setPosition({ lineNumber: line, column: 1 });
        ed.focus();
      },
      insertAtCursor(text: string) {
        const ed = editorRef.current;
        if (!ed) return;
        // Use the saved selection — getSelection() is unreliable after focus loss
        const selection = selectionRef.current ?? ed.getSelection();
        if (!selection) return;
        const insertLine = selection.startLineNumber;
        ed.executeEdits("toolbar-insert", [{ range: selection, text, forceMoveMarkers: true }]);
        const lines = text.split("\n");
        if (lines.length >= 3) {
          // For multi-line snippets (environments), position cursor on the
          // first inner empty line, or the first inner line if none are empty.
          let idx = 1;
          for (let i = 1; i < lines.length - 1; i++) {
            if (lines[i].trim() === "") { idx = i; break; }
          }
          const targetLine = insertLine + idx;
          ed.setPosition({ lineNumber: targetLine, column: lines[idx].length + 1 });
          ed.revealLineInCenter(targetLine);
        } else if (text.endsWith("{}")) {
          // Single-line with trailing {}: move cursor inside the braces
          const pos = ed.getPosition();
          if (pos) ed.setPosition({ lineNumber: pos.lineNumber, column: pos.column - 1 });
        }
        ed.focus();
      },
    }));

    const handleEditorDidMount: OnMount = useCallback((editor, monacoInstance) => {
      editorRef.current = editor;
      // Save selection on every cursor move so insertAtCursor works after focus loss
      editor.onDidChangeCursorSelection((e) => {
        selectionRef.current = e.selection;
      });
      // Ctrl/Cmd+S → save
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
        onSaveRef.current?.();
      });
    }, []);

    const handleEditorChange = useCallback(
      (value: string | undefined) => { onChange(value ?? ""); },
      [onChange]
    );

    return (
      <div className={className}>
        <Editor
          height="100%"
          defaultLanguage="latex"
          theme={monacoTheme}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={(monaco) => {
            if (!monacoInitialized) {
              monacoInitialized = true;

              monaco.languages.register({ id: "latex" });

              monaco.languages.setMonarchTokensProvider("latex", {
                tokenizer: {
                  root: [
                    [/%.*$/, "comment"],
                    [/\\[a-zA-Z@]+\*?/, "keyword"],
                    [/\$\$/, "delimiter.math"],
                    [/\$/, "delimiter.math"],
                    [/\\\[/, "delimiter.math"],
                    [/\\\]/, "delimiter.math"],
                    [/[{}]/, "delimiter.bracket"],
                    [/[\[\]]/, "delimiter.square"],
                    [/\d+/, "number"],
                    [/[&~^_]/, "operator"],
                  ],
                },
              });

              // Snippet completions triggered by backslash
              monaco.languages.registerCompletionItemProvider("latex", {
                triggerCharacters: ["\\"],
                provideCompletionItems(model, position) {
                  const textUntilPosition = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  });
                  const match = textUntilPosition.match(/\\([a-zA-Z@]*)$/);
                  if (!match) return { suggestions: [] };
                  const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column - match[0].length,
                    endColumn: position.column,
                  };
                  // Snippets loaded from src/data/latex-snippets.json
                  return {
                    suggestions: snippetData.map(({ label, insert, detail }) => ({
                      label,
                      kind: monaco.languages.CompletionItemKind.Function,
                      insertText: insert,
                      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                      detail,
                      range,
                    })),
                  };
                },
              });

              monaco.languages.registerDocumentFormattingEditProvider("latex", {
                async provideDocumentFormattingEdits(model) {
                  try {
                    const formatted = await invoke<string>("format_latex", {
                      content: model.getValue(),
                    });
                    return [{ range: model.getFullModelRange(), text: formatted }];
                  } catch {
                    return [];
                  }
                },
              });
            }

            // Themes are always (re-)defined — they are editor-instance scoped
            monaco.editor.defineTheme("latex-dark", {
              base: "vs-dark",
              inherit: true,
              rules: [
                { token: "comment", foreground: "6A9955", fontStyle: "italic" },
                { token: "keyword", foreground: "4FC1FF" },
                { token: "delimiter.math", foreground: "CE9178" },
                { token: "delimiter.bracket", foreground: "FFD700" },
                { token: "delimiter.square", foreground: "DA70D6" },
                { token: "number", foreground: "B5CEA8" },
                { token: "operator", foreground: "D4D4D4" },
              ],
              colors: {
                "editor.background": "#0f0f0f",
                "editor.foreground": "#D4D4D4",
                "editor.lineHighlightBackground": "#1a1a1a",
                "editorLineNumber.foreground": "#505050",
                "editorLineNumber.activeForeground": "#858585",
                "editor.selectionBackground": "#264F78",
                "editor.inactiveSelectionBackground": "#3A3D41",
                "editorCursor.foreground": "#4FC1FF",
                "editorIndentGuide.background1": "#2a2a2a",
                "editorIndentGuide.activeBackground1": "#3a3a3a",
              },
            });

            monaco.editor.defineTheme("latex-light", {
              base: "vs",
              inherit: true,
              rules: [
                { token: "comment", foreground: "4CAF50", fontStyle: "italic" },
                { token: "keyword", foreground: "0070C1" },
                { token: "delimiter.math", foreground: "D4380D" },
                { token: "delimiter.bracket", foreground: "0431FA" },
                { token: "delimiter.square", foreground: "7B21B5" },
                { token: "number", foreground: "098658" },
                { token: "operator", foreground: "333333" },
              ],
              colors: {
                // Matches cream theme: oklch(0.972 0.013 75)
                "editor.background": "#F8F5EE",
                "editor.foreground": "#1E1E1E",
                "editor.lineHighlightBackground": "#F2EFE9",
                "editorLineNumber.foreground": "#B8B4AC",
                "editorLineNumber.activeForeground": "#666260",
                "editor.selectionBackground": "#C8D8E8",
                "editor.inactiveSelectionBackground": "#DDD9D2",
                "editorCursor.foreground": "#0070C1",
                "editorIndentGuide.background1": "#E4E0D8",
                "editorIndentGuide.activeBackground1": "#D0CBC2",
              },
            });
          }}
          options={{
            fontSize: 14,
            fontFamily: "'Geist Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
            lineHeight: 22,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "mouseover",
            renderLineHighlight: "line",
            guides: { indentation: true, bracketPairs: true },
            formatOnPaste: true,
            suggest: { showSnippets: true, showKeywords: true },
          }}
        />
      </div>
    );
  }
);
