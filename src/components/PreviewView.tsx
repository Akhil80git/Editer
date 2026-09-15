import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  RotateCw,
  ExternalLink,
  Play,
  CheckCircle2,
  ChevronDown,
  Monitor,
  AlertCircle,
} from 'lucide-react';
import type { ServerInfo } from '../types';

interface PreviewViewProps {
  serverInfo: ServerInfo | null;
  activeServers: ServerInfo[];
  onStartServer: (cmd: string) => void;
}

export const PreviewView: React.FC<PreviewViewProps> = ({
  serverInfo,
  activeServers,
  onStartServer,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [pathInput, setPathInput] = useState<string>('/');
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);

  // Auto load when server becomes ready
  useEffect(() => {
    if (serverInfo?.url) {
      setCurrentUrl(serverInfo.url);
      setSelectedPort(serverInfo.port);
      setIsLoading(true);
    }
  }, [serverInfo]);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUrl) return;

    try {
      const parsed = new URL(currentUrl);
      const cleanPath = pathInput.startsWith('/') ? pathInput : `/${pathInput}`;
      const newTarget = `${parsed.origin}${cleanPath}`;
      setCurrentUrl(newTarget);
      handleRefresh();
    } catch {
      handleRefresh();
    }
  };

  const switchServer = (server: ServerInfo) => {
    setSelectedPort(server.port);
    setCurrentUrl(server.url);
    setPathInput('/');
    handleRefresh();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden min-h-0">
      {/* Preview Navigation / Address Bar */}
      <div className="h-8 bg-[#252526] px-3 border-b border-[#2d2d2d] flex items-center justify-between text-xs select-none shrink-0 gap-2">
        <div className="flex items-center gap-1.5 text-zinc-300 font-medium shrink-0">
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">LIVE PREVIEW</span>
        </div>

        {/* Address Bar Form */}
        <form onSubmit={handleNavigate} className="flex-1 max-w-md flex items-center">
          <div className="w-full flex items-center bg-[#181818] border border-[#3e3e3e] focus-within:border-sky-500 rounded px-2 py-0.5 text-xs text-zinc-300">
            <span className="text-zinc-500 mr-1 select-none text-[11px] font-mono">
              {currentUrl ? new URL(currentUrl).origin : 'http://localhost:3000'}
            </span>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="/"
              disabled={!currentUrl}
              className="bg-transparent text-xs text-white outline-none w-full font-mono"
            />
          </div>
        </form>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Multi-port selector if more than 1 server */}
          {activeServers.length > 1 && (
            <div className="relative group">
              <button className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                <span>Port {selectedPort}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 mt-1 hidden group-hover:block bg-[#252526] border border-[#333] rounded shadow-xl py-1 z-30 min-w-[120px]">
                {activeServers.map((s) => (
                  <button
                    key={s.port}
                    onClick={() => switchServer(s)}
                    className="w-full text-left px-3 py-1 hover:bg-[#094771] text-xs text-zinc-200"
                  >
                    Port {s.port}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={!currentUrl}
            title="Reload Preview"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {currentUrl && (
            <button
              onClick={() => window.open(currentUrl, '_blank')}
              title="Open preview in new tab"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#333] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      {currentUrl ? (
        <div className="flex-1 w-full h-full relative bg-white overflow-hidden">
          <iframe
            key={iframeKey}
            src={currentUrl}
            title="WebContainer Live Preview"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            allow="cross-origin-isolated; camera; microphone; geolocation"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#181818] text-zinc-400">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
            <Monitor className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300 mb-1">Server Not Detected</h3>
          <p className="text-xs text-zinc-400 max-w-xs mb-5 leading-relaxed">
            Execute a server in the terminal above or click below. WebContainer will auto-detect the port and stream the preview here.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => onStartServer('node server.js\n')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Launch "node server.js"</span>
            </button>

            <button
              onClick={() => onStartServer('npm run dev\n')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#2a2a2a] hover:bg-[#333] border border-[#3e3e3e] text-zinc-200 text-xs font-medium transition-colors"
            >
              <Play className="w-3 h-3 text-sky-400 fill-current" />
              <span>npm run dev</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
