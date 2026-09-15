import React from 'react';
import {
  GitBranch,
  AlertTriangle,
  XCircle,
  Database,
  Radio,
  Cpu,
  Check,
} from 'lucide-react';
import type { ServerInfo, WebContainerStatus, WorkspaceFile } from '../types';
import { getLanguageFromPath } from '../utils/fileIcons';

interface StatusBarProps {
  status: WebContainerStatus;
  serverInfo: ServerInfo | null;
  activeFile: WorkspaceFile | null;
  dirtyCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  serverInfo,
  activeFile,
  dirtyCount,
}) => {
  const language = activeFile ? getLanguageFromPath(activeFile.path) : 'plaintext';

  const formatLanguage = (lang: string) => {
    switch (lang) {
      case 'javascript':
        return 'JavaScript';
      case 'typescript':
        return 'TypeScript';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'json':
        return 'JSON';
      case 'markdown':
        return 'Markdown';
      default:
        return 'Plain Text';
    }
  };

  return (
    <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] font-normal select-none z-30 shrink-0">
      {/* Left items */}
      <div className="flex items-center gap-3">
        {/* Branch */}
        <div className="flex items-center gap-1 hover:bg-[#1f8ad2] px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>

        {/* Errors & Warnings */}
        <div className="flex items-center gap-2 hover:bg-[#1f8ad2] px-1.5 py-0.5 rounded cursor-pointer transition-colors">
          <span className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>0</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>0</span>
          </span>
        </div>

        {/* WebContainer Status */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0062a3]">
          <Cpu className="w-3 h-3" />
          <span className="capitalize">
            {status === 'ready' ? 'WebContainer Active' : `Container: ${status}`}
          </span>
        </div>

        {/* Port Status */}
        {serverInfo ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#005288] text-white font-mono font-medium">
            <Radio className="w-3 h-3 animate-pulse text-emerald-300" />
            <span>Port {serverInfo.port}</span>
          </div>
        ) : (
          <span className="text-sky-200 hidden md:inline">No Port Open</span>
        )}
      </div>

      {/* Right items */}
      <div className="flex items-center gap-3">
        {/* Persistence Indicator */}
        <div className="flex items-center gap-1 text-sky-100">
          <Database className="w-3 h-3 text-sky-200" />
          <span>IndexedDB</span>
          {dirtyCount > 0 ? (
            <span className="px-1 rounded bg-amber-500 text-black font-semibold text-[9px]">
              {dirtyCount} unsaved
            </span>
          ) : (
            <Check className="w-3 h-3 text-emerald-300" />
          )}
        </div>

        {/* Ln / Col */}
        <span className="hidden sm:inline">Ln 1, Col 1</span>

        {/* Spaces */}
        <span className="hidden sm:inline">Spaces: 2</span>

        {/* Encoding */}
        <span className="hidden md:inline">UTF-8</span>

        {/* Language Mode */}
        <div className="hover:bg-[#1f8ad2] px-1.5 py-0.5 rounded cursor-pointer transition-colors font-medium">
          {formatLanguage(language)}
        </div>
      </div>
    </footer>
  );
};
