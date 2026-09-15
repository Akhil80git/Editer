import React, { useState, useMemo } from 'react';
import {
  FilePlus,
  FolderPlus,
  RotateCw,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Search,
  Play,
  Check,
  X,
  FileCode,
  Folder,
  Package,
  Code2,
} from 'lucide-react';
import type { WorkspaceFile, FileNode, ActivityView } from '../types';
import { getFileIcon } from '../utils/fileIcons';

interface FileExplorerProps {
  files: WorkspaceFile[];
  activeFilePath: string | null;
  currentView: ActivityView;
  onOpenFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onRenameItem: (oldPath: string, newPath: string) => void;
  onDeleteItem: (path: string) => void;
  onRunCommand: (command: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFilePath,
  currentView,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  onRunCommand,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Creation State
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creationTargetDir, setCreationTargetDir] = useState<string>('');
  const [newItemName, setNewItemName] = useState('');

  // Rename State
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Build hierarchical tree from flat files
  const fileTree = useMemo(() => {
    const rootNodes: FileNode[] = [];
    const nodeMap = new Map<string, FileNode>();

    // Sort files so folders come first, then alphabetical
    const sorted = [...files].sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.path.localeCompare(b.path);
      }
      return a.isDirectory ? -1 : 1;
    });

    // Populate nodeMap
    for (const f of sorted) {
      nodeMap.set(f.path, {
        path: f.path,
        name: f.name,
        isDirectory: f.isDirectory,
        children: f.isDirectory ? [] : undefined,
      });
    }

    // Attach children to parents
    for (const f of sorted) {
      const node = nodeMap.get(f.path)!;
      if (!f.parentPath) {
        rootNodes.push(node);
      } else {
        const parent = nodeMap.get(f.parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    }

    return rootNodes;
  }, [files]);

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const startCreate = (type: 'file' | 'folder', targetDir = '') => {
    setCreatingType(type);
    setCreationTargetDir(targetDir);
    setNewItemName('');
    if (targetDir) {
      // Ensure folder is expanded
      setCollapsedFolders((prev) => {
        const next = new Set(prev);
        next.delete(targetDir);
        return next;
      });
    }
  };

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) {
      setCreatingType(null);
      return;
    }

    const fullPath = creationTargetDir ? `${creationTargetDir}/${trimmed}` : trimmed;
    if (creatingType === 'file') {
      onCreateFile(fullPath);
    } else if (creatingType === 'folder') {
      onCreateFolder(fullPath);
    }

    setCreatingType(null);
    setNewItemName('');
  };

  const startRename = (path: string, currentName: string) => {
    setRenamingPath(path);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingPath) return;

    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renamingPath.split('/').pop()) {
      const parent = renamingPath.includes('/')
        ? renamingPath.slice(0, renamingPath.lastIndexOf('/'))
        : '';
      const newPath = parent ? `${parent}/${trimmed}` : trimmed;
      onRenameItem(renamingPath, newPath);
    }

    setRenamingPath(null);
    setRenameValue('');
  };

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return files
      .filter((f) => !f.isDirectory)
      .filter(
        (f) =>
          f.path.toLowerCase().includes(query) ||
          f.content.toLowerCase().includes(query)
      )
      .map((f) => {
        // Find matching line in content
        const lines = f.content.split('\n');
        const matchLineIdx = lines.findIndex((l) => l.toLowerCase().includes(query));
        const snippet =
          matchLineIdx >= 0
            ? lines[matchLineIdx].trim().slice(0, 80)
            : 'File name match';
        return { file: f, line: matchLineIdx + 1, snippet };
      });
  }, [files, searchQuery]);

  // Package.json Scripts
  const npmScripts = useMemo(() => {
    const pkg = files.find((f) => f.path === 'package.json');
    if (!pkg) return [];
    try {
      const parsed = JSON.parse(pkg.content || '{}');
      return Object.entries(parsed.scripts || {}).map(([name, cmd]) => ({
        name,
        cmd: String(cmd),
      }));
    } catch {
      return [];
    }
  }, [files]);

  // Render tree node recursively
  const renderNode = (node: FileNode, level = 0) => {
    const isCollapsed = collapsedFolders.has(node.path);
    const isRenaming = renamingPath === node.path;
    const isActive = activeFilePath === node.path;

    return (
      <div key={node.path} className="flex flex-col">
        <div
          style={{ paddingLeft: `${Math.max(level * 14 + 10, 10)}px` }}
          className={`group flex items-center justify-between pr-2 py-1 cursor-pointer text-xs transition-colors select-none ${
            isActive
              ? 'bg-[#37373d] text-white font-medium'
              : 'text-zinc-300 hover:bg-[#2a2d2e] hover:text-zinc-100'
          }`}
          onClick={() => {
            if (node.isDirectory) {
              toggleFolder(node.path);
            } else {
              onOpenFile(node.path);
            }
          }}
        >
          {/* Label / Input */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
            {node.isDirectory ? (
              <span className="text-zinc-400">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            ) : (
              <span className="w-3.5" />
            )}

            {getFileIcon(node.name, node.isDirectory, !isCollapsed)}

            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setRenamingPath(null);
                  }}
                  onBlur={() => handleRenameSubmit()}
                  className="bg-[#3c3c3c] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                />
              </form>
            ) : (
              <span className="truncate text-xs">{node.name}</span>
            )}
          </div>

          {/* Action Buttons (visible on hover) */}
          {!isRenaming && (
            <div className="hidden group-hover:flex items-center gap-1 text-zinc-400" onClick={(e) => e.stopPropagation()}>
              {node.isDirectory && (
                <>
                  <button
                    onClick={() => startCreate('file', node.path)}
                    title="New File in this folder"
                    className="p-1 hover:text-zinc-100 hover:bg-[#383b3d] rounded"
                  >
                    <FilePlus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => startCreate('folder', node.path)}
                    title="New Folder in this folder"
                    className="p-1 hover:text-zinc-100 hover:bg-[#383b3d] rounded"
                  >
                    <FolderPlus className="w-3 h-3" />
                  </button>
                </>
              )}
              <button
                onClick={() => startRename(node.path, node.name)}
                title="Rename"
                className="p-1 hover:text-zinc-100 hover:bg-[#383b3d] rounded"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${node.isDirectory ? 'folder' : 'file'} "${node.path}"?`)) {
                    onDeleteItem(node.path);
                  }
                }}
                title="Delete"
                className="p-1 hover:text-rose-400 hover:bg-[#383b3d] rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Inline creation input inside this directory */}
        {creatingType && creationTargetDir === node.path && (
          <div
            style={{ paddingLeft: `${(level + 1) * 14 + 10}px` }}
            className="flex items-center gap-1.5 pr-2 py-1 bg-[#222222]"
          >
            <span className="w-3.5" />
            {creatingType === 'file' ? (
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-400" />
            )}
            <form onSubmit={handleCreateSubmit} className="flex-1 flex items-center gap-1">
              <input
                type="text"
                autoFocus
                placeholder={creatingType === 'file' ? 'filename.ext' : 'folder-name'}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setCreatingType(null);
                }}
                onBlur={() => handleCreateSubmit()}
                className="bg-[#3c3c3c] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
              />
            </form>
          </div>
        )}

        {/* Render children if directory and expanded */}
        {node.isDirectory && !isCollapsed && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-[#252526] border-r border-[#1e1e1e] flex flex-col h-full select-none text-zinc-300 shrink-0 overflow-hidden">
      {/* View: EXPLORER */}
      {currentView === 'explorer' && (
        <>
          {/* Header */}
          <div className="h-9 px-3 flex items-center justify-between border-b border-[#1e1e1e] text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Explorer</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => startCreate('file', '')}
                title="New File in Root"
                className="p-1 hover:text-white hover:bg-[#333333] rounded"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => startCreate('folder', '')}
                title="New Folder in Root"
                className="p-1 hover:text-white hover:bg-[#333333] rounded"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCollapsedFolders(new Set())}
                title="Expand All Folders"
                className="p-1 hover:text-white hover:bg-[#333333] rounded"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Project Title Bar */}
          <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 flex items-center justify-between bg-[#1f1f20]">
            <span className="truncate">WORKSPACE</span>
            <span className="text-[10px] text-zinc-500">{files.length} items</span>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto py-1">
            {/* Inline creation at root */}
            {creatingType && creationTargetDir === '' && (
              <div className="px-3 py-1 bg-[#222222] flex items-center gap-2">
                {creatingType === 'file' ? (
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                )}
                <form onSubmit={handleCreateSubmit} className="flex-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder={creatingType === 'file' ? 'filename.ext' : 'folder-name'}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setCreatingType(null);
                    }}
                    onBlur={() => handleCreateSubmit()}
                    className="bg-[#3c3c3c] border border-sky-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                  />
                </form>
              </div>
            )}

            {fileTree.map((node) => renderNode(node, 0))}
          </div>
        </>
      )}

      {/* View: SEARCH */}
      {currentView === 'search' && (
        <div className="flex flex-col h-full">
          <div className="h-9 px-3 flex items-center border-b border-[#1e1e1e] text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Search in Workspace</span>
          </div>
          <div className="p-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search text or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#3c3c3c] border border-[#555] rounded px-7 py-1 text-xs text-white outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {searchQuery && (
              <div className="text-[11px] text-zinc-400 px-1 py-1">
                {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} found
              </div>
            )}
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => onOpenFile(result.file.path)}
                className="w-full text-left p-2 rounded hover:bg-[#2a2d2e] flex flex-col gap-1 border-b border-[#2d2d2d] mb-1"
              >
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-medium truncate">
                  {getFileIcon(result.file.name, false)}
                  <span>{result.file.path}</span>
                  {result.line > 0 && <span className="text-zinc-500 text-[10px]">:{result.line}</span>}
                </div>
                <div className="text-[11px] text-zinc-300 font-mono line-clamp-1 bg-[#1e1e1e] px-1.5 py-0.5 rounded">
                  {result.snippet}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View: SCRIPTS */}
      {currentView === 'scripts' && (
        <div className="flex flex-col h-full">
          <div className="h-9 px-3 flex items-center border-b border-[#1e1e1e] text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span>NPM Scripts & Tasks</span>
          </div>
          <div className="p-3 flex flex-col gap-2 flex-1 overflow-y-auto">
            <div className="text-xs text-zinc-400 mb-1">
              Click any script to execute it directly in the WebContainer jsh terminal:
            </div>

            {npmScripts.map((s) => (
              <div
                key={s.name}
                className="p-2 bg-[#1f1f20] border border-[#333] rounded hover:border-sky-500/50 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">{s.name}</span>
                  <button
                    onClick={() => onRunCommand(`npm run ${s.name}\n`)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px]"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Run
                  </button>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 truncate">
                  npm run {s.name} → <span className="text-sky-300">{s.cmd}</span>
                </div>
              </div>
            ))}

            <div className="border-t border-[#333] my-2 pt-2">
              <div className="text-[11px] font-semibold text-zinc-400 mb-2">QUICK PROCESSES</div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => onRunCommand('node server.js\n')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-xs text-zinc-200 flex items-center gap-2"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span>Start Server (node server.js)</span>
                </button>
                <button
                  onClick={() => onRunCommand('npm install\n')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-xs text-zinc-200 flex items-center gap-2"
                >
                  <Package className="w-3 h-3 text-amber-400" />
                  <span>Install Dependencies (npm i)</span>
                </button>
                <button
                  onClick={() => onRunCommand('node -v && npm -v\n')}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] text-xs text-zinc-200 flex items-center gap-2"
                >
                  <Code2 className="w-3 h-3 text-sky-400" />
                  <span>Inspect Node & NPM Versions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View: HELP / INFO */}
      {currentView === 'help' && (
        <div className="flex flex-col h-full overflow-y-auto p-3 text-xs text-zinc-300 leading-relaxed">
          <div className="h-7 border-b border-[#1e1e1e] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Architecture
          </div>
          <p className="mb-2">
            This Cloud IDE runs entirely inside your browser sandbox:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 mb-4">
            <li><strong className="text-zinc-200">WebContainer</strong> provides a virtual Node.js WebAssembly environment.</li>
            <li><strong className="text-zinc-200">Monaco Editor</strong> powers syntax highlighting & editing.</li>
            <li><strong className="text-zinc-200">Xterm.js</strong> streams real PTY terminal I/O to <code className="text-sky-300">jsh</code>.</li>
            <li><strong className="text-zinc-200">IndexedDB</strong> persists your files & tabs locally.</li>
          </ul>
          <div className="p-2 rounded bg-sky-950/60 border border-sky-800/60 text-sky-200 text-[11px] mb-4">
            No server or remote VM is executing your code. It all happens client-side!
          </div>
          <div className="p-2 rounded bg-amber-950/60 border border-amber-800/60 text-amber-200 text-[11px]">
            Tip: Dependencies are kept inside WebContainer memory. Source files & package.json persist in IndexedDB.
          </div>
        </div>
      )}
    </div>
  );
};
