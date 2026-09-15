import React, { useState } from 'react';
import {
  Play,
  PackageCheck,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Layout,
  Terminal,
  Globe,
  Code2,
  FolderSync,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { WebContainerStatus, ServerInfo, StarterTemplate } from '../types';
import { STARTER_TEMPLATES } from '../services/templates';

interface TitleBarProps {
  status: WebContainerStatus;
  serverInfo: ServerInfo | null;
  onRunCommand: (command: string) => void;
  onRestartContainer: () => void;
  onResetWorkspace: () => void;
  onSelectTemplate: (template: StarterTemplate) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  showTerminal: boolean;
  onToggleTerminal: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  status,
  serverInfo,
  onRunCommand,
  onRestartContainer,
  onResetWorkspace,
  onSelectTemplate,
  showSidebar,
  onToggleSidebar,
  showTerminal,
  onToggleTerminal,
  showPreview,
  onTogglePreview,
}) => {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/70 border border-emerald-700/50 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            WebContainer Ready
          </span>
        );
      case 'booting':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-950/70 border border-amber-700/50 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Booting Node.js...
          </span>
        );
      case 'unsupported':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-950/70 border border-rose-700/50 text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Process Isolation Disabled
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-rose-950/70 border border-rose-700/50 text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Error Booting
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">
            Initializing...
          </span>
        );
    }
  };

  return (
    <header className="h-10 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-3 text-xs select-none z-30 shrink-0">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-zinc-200 tracking-tight hidden sm:inline">
            Cloud IDE
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            WebContainer v1
          </span>
        </div>

        {/* Template Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2a2a2a] hover:bg-[#333333] border border-[#3e3e3e] text-zinc-300 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Templates</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {templateMenuOpen && (
            <div
              className="absolute left-0 mt-1 w-64 bg-[#252526] border border-[#3c3c3c] rounded-md shadow-2xl py-1 z-50 text-zinc-200"
              onMouseLeave={() => setTemplateMenuOpen(false)}
            >
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#333333] font-semibold">
                Starter Workspaces
              </div>
              {STARTER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    if (
                      confirm(
                        `Switch to "${tpl.name}" template? This will load the new workspace files.`
                      )
                    ) {
                      onSelectTemplate(tpl);
                      setTemplateMenuOpen(false);
                    }
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#094771] flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-white">{tpl.name}</span>
                    <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300">
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">{tpl.description}</p>
                </button>
              ))}
              <div className="border-t border-[#333333] mt-1 pt-1">
                <button
                  onClick={() => {
                    if (confirm('Reset workspace to initial files?')) {
                      onResetWorkspace();
                      setTemplateMenuOpen(false);
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-300 text-xs flex items-center gap-1.5"
                >
                  <FolderSync className="w-3 h-3 text-rose-400" />
                  Reset to Default Project
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Commands */}
        <div className="hidden md:flex items-center gap-1.5 border-l border-[#333333] pl-3">
          <button
            onClick={() => onRunCommand('node server.js\n')}
            title="Start Node HTTP server directly (zero dependency)"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 transition-colors font-medium"
          >
            <Play className="w-3 h-3 fill-current text-emerald-400" />
            <span>node server.js</span>
          </button>

          <button
            onClick={() => onRunCommand('npm run dev\n')}
            title="Execute npm run dev in WebContainer terminal"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-600/40 transition-colors"
          >
            <Play className="w-3 h-3 fill-current text-sky-400" />
            <span>npm run dev</span>
          </button>

          <button
            onClick={() => onRunCommand('npm install\n')}
            title="Run npm install to download workspace dependencies"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#2a2a2a] hover:bg-[#333333] text-zinc-300 border border-[#3e3e3e] transition-colors"
          >
            <PackageCheck className="w-3 h-3 text-amber-400" />
            <span>npm i</span>
          </button>
        </div>
      </div>

      {/* Center: Server & Port Notification */}
      <div className="flex items-center gap-2">
        {getStatusBadge()}

        {serverInfo && (
          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/60 text-sky-300 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Port {serverInfo.port}</span>
          </div>
        )}
      </div>

      {/* Right: Layout & Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleSidebar}
          title="Toggle File Explorer (Sidebar)"
          className={`p-1.5 rounded transition-colors ${
            showSidebar
              ? 'bg-[#333333] text-sky-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a2a]'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleTerminal}
          title="Toggle Terminal Panel"
          className={`p-1.5 rounded transition-colors ${
            showTerminal
              ? 'bg-[#333333] text-sky-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a2a]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTogglePreview}
          title="Toggle Live Browser Preview"
          className={`p-1.5 rounded transition-colors ${
            showPreview
              ? 'bg-[#333333] text-sky-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a2a]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-[#333333] mx-1" />

        <button
          onClick={onRestartContainer}
          title="Restart WebContainer process"
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a2a] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {window.self !== window.top && (
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            title="Open in new window for full cross-origin isolation"
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden xl:inline">New Window</span>
          </button>
        )}
      </div>
    </header>
  );
};
