import React from 'react';
import { AlertTriangle, ExternalLink, ShieldAlert, Check, X, Terminal, Code2 } from 'lucide-react';
import type { WebContainerSupportCheck } from '../services/webcontainer';

interface UnsupportedModalProps {
  supportInfo: WebContainerSupportCheck;
  onDismiss: () => void;
  onRetry: () => void;
}

export const UnsupportedModal: React.FC<UnsupportedModalProps> = ({
  supportInfo,
  onDismiss,
  onRetry,
}) => {
  const openNewWindow = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#252526] border border-[#3e3e3e] rounded-xl max-w-lg w-full p-6 shadow-2xl text-zinc-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              WebContainer Process Isolation Required
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {supportInfo.isIframe
                ? 'WebContainer requires Cross-Origin Isolation (COOP/COEP) with SharedArrayBuffer to execute Node.js inside the browser. This is restricted when running inside an embedded iframe preview.'
                : supportInfo.reason || 'WebContainer requires a browser with Cross-Origin Isolation and SharedArrayBuffer enabled.'}
            </p>
          </div>
        </div>

        {/* Diagnostics Checklist */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-3 text-xs mb-5 space-y-2 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">SharedArrayBuffer API:</span>
            {supportInfo.hasSharedArrayBuffer ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Supported
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Unavailable
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Cross-Origin Isolated:</span>
            {supportInfo.isCrossOriginIsolated ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Inactive (Iframe constraint)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Environment:</span>
            <span className="text-zinc-300">
              {supportInfo.isIframe ? 'Embedded Iframe Preview' : 'Top-level Window'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            onClick={onDismiss}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-[#333333] hover:bg-[#3c3c3c] text-zinc-300 text-xs font-medium transition-colors"
          >
            Continue in Editor Mode (IDB Active)
          </button>

          {supportInfo.isIframe && (
            <button
              onClick={openNewWindow}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Window</span>
            </button>
          )}

          {!supportInfo.isIframe && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
            >
              Retry Booting
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
