import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Trash2,
  Package,
  CheckCircle,
  Copy,
  Code2,
} from 'lucide-react';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';

export interface TerminalViewHandle {
  sendCommand: (cmd: string) => void;
  clear: () => void;
}

interface TerminalViewProps {
  container: WebContainer | null;
  isReady: boolean;
  onServerReadyHint?: () => void;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  ({ container, isReady }, ref) => {
    const terminalContainerRef = useRef<HTMLDivElement | null>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const processRef = useRef<WebContainerProcess | null>(null);
    const inputWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);

    const [isSessionActive, setIsSessionActive] = useState(false);
    const [copied, setCopied] = useState(false);

    // Expose sendCommand to parent
    const sendCommand = useCallback((command: string) => {
      if (inputWriterRef.current) {
        inputWriterRef.current.write(command.endsWith('\n') ? command : `${command}\n`);
      } else {
        console.warn('Terminal session not yet connected to send command:', command);
      }
    }, []);

    const clear = useCallback(() => {
      if (xtermRef.current) {
        xtermRef.current.clear();
      }
    }, []);

    useImperativeHandle(ref, () => ({
      sendCommand,
      clear,
    }));

    // Start / Restart jsh process
    const startJshProcess = useCallback(async () => {
      if (!container || !xtermRef.current || !fitAddonRef.current) return;

      // Kill previous process if any
      if (processRef.current) {
        try {
          processRef.current.kill();
        } catch {
          // ignore
        }
        processRef.current = null;
      }
      if (inputWriterRef.current) {
        try {
          inputWriterRef.current.releaseLock();
        } catch {
          // ignore
        }
        inputWriterRef.current = null;
      }

      const term = xtermRef.current;
      const fitAddon = fitAddonRef.current;

      try {
        fitAddon.fit();
        term.writeln('\x1b[36m⚡ Spawning WebContainer jsh terminal...\x1b[0m');

        const proc = await container.spawn('jsh', {
          terminal: {
            cols: term.cols || 80,
            rows: term.rows || 24,
          },
        });

        processRef.current = proc;
        setIsSessionActive(true);

        // Pipe output
        proc.output.pipeTo(
          new WritableStream({
            write(data) {
              term.write(data);
            },
          })
        );

        // Pipe input
        const writer = proc.input.getWriter();
        inputWriterRef.current = writer;

        proc.exit.then((code) => {
          term.writeln(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m`);
          setIsSessionActive(false);
        });
      } catch (err: any) {
        term.writeln(`\r\n\x1b[31m[Failed to spawn jsh: ${err?.message || err}]\x1b[0m`);
        setIsSessionActive(false);
      }
    }, [container]);

    // Initialize Xterm
    useEffect(() => {
      if (!terminalContainerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 12.5,
        fontFamily: "'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
        theme: {
          background: '#181818',
          foreground: '#cccccc',
          cursor: '#ffffff',
          cursorAccent: '#181818',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(terminalContainerRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Send terminal user keystrokes into input writer
      const onDataDispose = term.onData((data) => {
        if (inputWriterRef.current) {
          inputWriterRef.current.write(data);
        }
      });

      // Handle resize with ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
          if (processRef.current && term.cols && term.rows) {
            processRef.current.resize({
              cols: term.cols,
              rows: term.rows,
            });
          }
        } catch {
          // ignore transient resize errors
        }
      });

      if (terminalContainerRef.current) {
        resizeObserver.observe(terminalContainerRef.current);
      }

      term.writeln('\x1b[1;34m╭──────────────────────────────────────────────╮\x1b[0m');
      term.writeln('\x1b[1;34m│\x1b[0m  \x1b[1;32mWebContainer Virtual In-Browser Node.js\x1b[0m     \x1b[1;34m│\x1b[0m');
      term.writeln('\x1b[1;34m│\x1b[0m  Type commands or click quick action buttons \x1b[1;34m│\x1b[0m');
      term.writeln('\x1b[1;34m╰──────────────────────────────────────────────╯\x1b[0m');

      return () => {
        onDataDispose.dispose();
        resizeObserver.disconnect();
        if (processRef.current) {
          try {
            processRef.current.kill();
          } catch {
            // ignore
          }
        }
        term.dispose();
      };
    }, []);

    // When container becomes ready, spawn jsh
    useEffect(() => {
      if (isReady && container && !isSessionActive) {
        startJshProcess();
      }
    }, [isReady, container, isSessionActive, startJshProcess]);

    const handleCopyAll = () => {
      if (!xtermRef.current) return;
      // Get terminal buffer content
      let text = '';
      const buffer = xtermRef.current.buffer.active;
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) text += line.translateToString(true) + '\n';
      }
      navigator.clipboard.writeText(text.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="flex-1 flex flex-col h-full bg-[#181818] border-b border-[#2d2d2d] overflow-hidden min-h-0">
        {/* Terminal Header */}
        <div className="h-8 bg-[#1f1f20] px-3 border-b border-[#2d2d2d] flex items-center justify-between text-xs select-none shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <TerminalIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>TERMINAL</span>
            </div>

            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                isSessionActive
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              jsh {isSessionActive ? '● active' : '○ offline'}
            </span>
          </div>

          {/* Quick preset commands & tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => sendCommand('node server.js\n')}
              title="Run: node server.js"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 text-[10px] transition-colors"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>node server.js</span>
            </button>

            <button
              onClick={() => sendCommand('npm run dev\n')}
              title="Run: npm run dev"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-700/40 text-[10px] transition-colors"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>npm run dev</span>
            </button>

            <button
              onClick={() => sendCommand('npm install\n')}
              title="Run: npm install"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 text-[10px] transition-colors"
            >
              <Package className="w-2.5 h-2.5 text-amber-400" />
              <span>npm i</span>
            </button>

            <button
              onClick={clear}
              title="Clear terminal screen"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2d2d2d] transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            <button
              onClick={handleCopyAll}
              title="Copy terminal buffer"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2d2d2d] transition-colors"
            >
              {copied ? (
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={startJshProcess}
              title="Restart jsh shell session"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2d2d2d] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Terminal Canvas Container */}
        <div
          ref={terminalContainerRef}
          className="flex-1 w-full h-full bg-[#181818] overflow-hidden"
          style={{ minHeight: '120px' }}
        />
      </div>
    );
  }
);
TerminalView.displayName = 'TerminalView';
