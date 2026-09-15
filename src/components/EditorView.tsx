import React, { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { X, Code2, Save, Sparkles, Check, Clock } from 'lucide-react';
import type { EditorTab, WorkspaceFile } from '../types';
import { getFileIcon, getLanguageFromPath } from '../utils/fileIcons';

interface EditorViewProps {
  activeFile: WorkspaceFile | null;
  openTabs: EditorTab[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (path: string, newContent: string) => void;
  onSaveImmediate: (path: string) => void;
  onNewFile: () => void;
  onRunFile?: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  activeFile,
  openTabs,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onSaveImmediate,
  onNewFile,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom VS Code dark theme tweaks if desired
    monaco.editor.defineTheme('vscode-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#282828',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorGutter.background': '#1e1e1e',
      },
    });
    monaco.editor.setTheme('vscode-dark-custom');

    // Add Ctrl+S / Cmd+S save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFile) {
        onSaveImmediate(activeFile.path);
      }
    });
  };

  const activeTab = openTabs.find((t) => t.path === activeFile?.path);
  const language = activeFile ? getLanguageFromPath(activeFile.path) : 'plaintext';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden min-w-0">
      {/* Tabs Header Bar */}
      <div className="h-9 bg-[#252526] border-b border-[#1e1e1e] flex items-center justify-between overflow-x-auto select-none no-scrollbar shrink-0">
        <div className="flex items-center h-full overflow-x-auto">
          {openTabs.map((tab) => {
            const isActive = tab.path === activeFile?.path;
            return (
              <div
                key={tab.path}
                onClick={() => onSelectTab(tab.path)}
                className={`group h-full px-3 flex items-center gap-2 border-r border-[#1e1e1e] cursor-pointer text-xs transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-sky-500 font-medium'
                    : 'bg-[#2d2d2d] text-zinc-400 hover:bg-[#282828] hover:text-zinc-200'
                }`}
              >
                {getFileIcon(tab.title, false)}
                <span className="truncate max-w-[150px]">{tab.title}</span>

                {/* Dirty Indicator / Close Button */}
                <div
                  className="flex items-center justify-center w-4 h-4 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                >
                  {tab.isDirty ? (
                    <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:hidden" />
                  ) : null}
                  <button
                    className={`rounded p-0.5 hover:bg-[#3e3e3e] hover:text-white ${
                      tab.isDirty ? 'hidden group-hover:flex' : 'flex'
                    }`}
                    title="Close"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right side tab actions */}
        {activeFile && (
          <div className="flex items-center gap-2 px-3 shrink-0 text-zinc-400 text-xs">
            {activeTab?.isDirty ? (
              <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                <Clock className="w-3 h-3 animate-spin" />
                <span>Autosaving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <Check className="w-3 h-3" />
                <span>Saved to IDB</span>
              </span>
            )}
            <button
              onClick={() => onSaveImmediate(activeFile.path)}
              title="Save file immediately (Ctrl+S)"
              className="p-1 hover:text-white hover:bg-[#333333] rounded"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Editor Body or Empty State */}
      {activeFile ? (
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <Editor
            height="100%"
            path={activeFile.path}
            language={language}
            value={activeFile.content}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            onChange={(val) => {
              onChangeContent(activeFile.path, val || '');
            }}
            options={{
              fontSize: 13.5,
              fontFamily: "'Fira Code', Menlo, Monaco, 'Courier New', monospace",
              fontLigatures: true,
              tabSize: 2,
              wordWrap: 'on',
              minimap: { enabled: true, maxColumn: 80 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderWhitespace: 'selection',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              formatOnPaste: true,
              overviewRulerBorder: false,
              lineNumbersMinChars: 3,
            }}
            loading={
              <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-zinc-400 text-xs gap-2">
                <Code2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Loading Monaco Editor...</span>
              </div>
            }
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[#1e1e1e]">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-sky-400 mb-4 shadow-xl">
            <Code2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-medium text-zinc-200 mb-1">No File Open</h2>
          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            Select a file from the Explorer on the left, or create a new file to start writing code in Monaco Editor.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onNewFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create New File</span>
            </button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-xs text-[11px] text-zinc-400">
            <div className="flex items-center justify-between bg-[#252526] px-2.5 py-1.5 rounded border border-[#333]">
              <span>Save File</span>
              <kbd className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-zinc-300 font-mono">Ctrl+S</kbd>
            </div>
            <div className="flex items-center justify-between bg-[#252526] px-2.5 py-1.5 rounded border border-[#333]">
              <span>Find in File</span>
              <kbd className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-zinc-300 font-mono">Ctrl+F</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
