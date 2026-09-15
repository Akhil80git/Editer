import React from 'react';
import {
  FileCode,
  FileJson,
  FileType,
  FileText,
  Folder,
  FolderOpen,
  File as GenericFile,
  FileSpreadsheet,
} from 'lucide-react';

export function getFileIcon(filename: string, isDirectory: boolean, isOpen = false) {
  if (isDirectory) {
    return isOpen ? (
      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
    );
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    case 'ts':
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'jsx':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-500 shrink-0" />;
    case 'html':
      return <FileType className="w-4 h-4 text-orange-500 shrink-0" />;
    case 'css':
      return <FileType className="w-4 h-4 text-blue-400 shrink-0" />;
    case 'md':
      return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
    case 'svg':
    case 'png':
    case 'jpg':
      return <FileSpreadsheet className="w-4 h-4 text-purple-400 shrink-0" />;
    default:
      return <GenericFile className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'jsx':
      return 'javascript';
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'plaintext';
  }
}
