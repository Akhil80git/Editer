import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebContainer } from '@webcontainer/api';
import type { ServerInfo, WebContainerStatus, WorkspaceFile } from '../types';
import {
  checkWebContainerSupport,
  getWebContainer,
  mountWorkspaceToContainer,
  writeContainerFile,
  deleteContainerFile,
  createContainerDirectory,
  type WebContainerSupportCheck,
} from '../services/webcontainer';

export interface UseWebContainerReturn {
  container: WebContainer | null;
  status: WebContainerStatus;
  error: string | null;
  supportInfo: WebContainerSupportCheck;
  serverInfo: ServerInfo | null;
  activeServers: ServerInfo[];
  boot: () => Promise<WebContainer | null>;
  mountFiles: (files: WorkspaceFile[]) => Promise<void>;
  syncFile: (path: string, content: string) => Promise<void>;
  removeFile: (path: string) => Promise<void>;
  makeDirectory: (path: string) => Promise<void>;
}

export function useWebContainer(): UseWebContainerReturn {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [status, setStatus] = useState<WebContainerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [activeServers, setActiveServers] = useState<ServerInfo[]>([]);
  const [supportInfo, setSupportInfo] = useState<WebContainerSupportCheck>(() =>
    checkWebContainerSupport()
  );

  const containerRef = useRef<WebContainer | null>(null);

  const boot = useCallback(async (): Promise<WebContainer | null> => {
    const check = checkWebContainerSupport();
    setSupportInfo(check);

    if (!check.supported) {
      setStatus('unsupported');
      setError(check.reason || 'WebContainer is not supported');
      return null;
    }

    try {
      setStatus('booting');
      setError(null);
      const instance = await getWebContainer();
      containerRef.current = instance;
      setContainer(instance);
      setStatus('ready');

      // Listen to server-ready events
      instance.on('server-ready', (port, url) => {
        console.log(`[WebContainer] server-ready on port ${port}: ${url}`);
        const info: ServerInfo = { port, url, readyAt: Date.now() };
        setServerInfo(info);
        setActiveServers((prev) => {
          const filtered = prev.filter((s) => s.port !== port);
          return [...filtered, info];
        });
      });

      // Listen to port close events if supported
      try {
        instance.on('port' as any, (port: number, type: 'open' | 'close', url: string) => {
          if (type === 'close') {
            setActiveServers((prev) => prev.filter((s) => s.port !== port));
            setServerInfo((curr) => (curr && curr.port === port ? null : curr));
          } else if (type === 'open' && url) {
            const info: ServerInfo = { port, url, readyAt: Date.now() };
            setServerInfo(info);
            setActiveServers((prev) => {
              const filtered = prev.filter((s) => s.port !== port);
              return [...filtered, info];
            });
          }
        });
      } catch {
        // Port events fallback
      }

      instance.on('error', (err) => {
        console.error('[WebContainer error]', err);
      });

      return instance;
    } catch (err: any) {
      console.error('[WebContainer Boot Error]:', err);
      setStatus('error');
      setError(err?.message || 'Failed to initialize WebContainer.');
      return null;
    }
  }, []);

  useEffect(() => {
    // Auto boot on mount
    boot();
  }, [boot]);

  const mountFiles = useCallback(async (files: WorkspaceFile[]) => {
    if (!containerRef.current) return;
    try {
      await mountWorkspaceToContainer(containerRef.current, files);
    } catch (err) {
      console.error('Error mounting workspace to container:', err);
    }
  }, []);

  const syncFile = useCallback(async (filePath: string, content: string) => {
    if (!containerRef.current) return;
    try {
      await writeContainerFile(containerRef.current, filePath, content);
    } catch (err) {
      console.error(`Error writing ${filePath} to container:`, err);
    }
  }, []);

  const removeFile = useCallback(async (filePath: string) => {
    if (!containerRef.current) return;
    try {
      await deleteContainerFile(containerRef.current, filePath);
    } catch (err) {
      console.error(`Error removing ${filePath} from container:`, err);
    }
  }, []);

  const makeDirectory = useCallback(async (dirPath: string) => {
    if (!containerRef.current) return;
    try {
      await createContainerDirectory(containerRef.current, dirPath);
    } catch (err) {
      console.error(`Error creating directory ${dirPath} in container:`, err);
    }
  }, []);

  return {
    container,
    status,
    error,
    supportInfo,
    serverInfo,
    activeServers,
    boot,
    mountFiles,
    syncFile,
    removeFile,
    makeDirectory,
  };
}
