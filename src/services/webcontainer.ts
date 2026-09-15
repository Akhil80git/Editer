import { WebContainer, type FileSystemTree } from '@webcontainer/api';
import type { WorkspaceFile } from '../types';
import { isIgnoredPath } from './storage';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export interface WebContainerSupportCheck {
  supported: boolean;
  reason?: string;
  isIframe: boolean;
  hasSharedArrayBuffer: boolean;
  isCrossOriginIsolated: boolean;
}

export function checkWebContainerSupport(): WebContainerSupportCheck {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      reason: 'Window is not defined (SSR environment)',
      isIframe: false,
      hasSharedArrayBuffer: false,
      isCrossOriginIsolated: false,
    };
  }

  const isIframe = window.self !== window.top;
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = Boolean(window.crossOriginIsolated);

  if (!hasSharedArrayBuffer) {
    return {
      supported: false,
      reason: 'SharedArrayBuffer is not available. WebContainer requires SharedArrayBuffer support in modern Chromium, Firefox, or Safari.',
      isIframe,
      hasSharedArrayBuffer,
      isCrossOriginIsolated,
    };
  }

  if (!isCrossOriginIsolated) {
    return {
      supported: false,
      reason: isIframe
        ? 'Cross-Origin Isolation is disabled because this app is embedded inside an iframe. Click "Open in New Window" to run WebContainer with full hardware-accelerated process isolation.'
        : 'Cross-Origin Isolation is not active. Headers Cross-Origin-Embedder-Policy (require-corp) and Cross-Origin-Opener-Policy (same-origin) are required.',
      isIframe,
      hasSharedArrayBuffer,
      isCrossOriginIsolated,
    };
  }

  return {
    supported: true,
    isIframe,
    hasSharedArrayBuffer,
    isCrossOriginIsolated,
  };
}

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (bootPromise) {
    return bootPromise;
  }

  const check = checkWebContainerSupport();
  if (!check.supported) {
    throw new Error(check.reason || 'WebContainer is not supported in this browser environment.');
  }

  bootPromise = (async () => {
    try {
      const instance = await WebContainer.boot();
      webcontainerInstance = instance;
      return instance;
    } catch (err: any) {
      bootPromise = null;
      throw new Error(`Failed to boot WebContainer: ${err?.message || err}`);
    }
  })();

  return bootPromise;
}

/**
 * Converts flat WorkspaceFile array into a WebContainer FileSystemTree
 */
export function buildFileSystemTree(files: WorkspaceFile[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const file of files) {
    if (isIgnoredPath(file.path)) continue;

    const parts = file.path.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        if (file.isDirectory) {
          if (!current[part]) {
            current[part] = { directory: {} };
          }
        } else {
          current[part] = {
            file: {
              contents: file.content || '',
            },
          };
        }
      } else {
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        const dirNode = current[part];
        if ('directory' in dirNode) {
          current = dirNode.directory;
        }
      }
    }
  }

  return tree;
}

export async function mountWorkspaceToContainer(
  container: WebContainer,
  files: WorkspaceFile[]
): Promise<void> {
  const tree = buildFileSystemTree(files);
  await container.mount(tree);
}

export async function writeContainerFile(
  container: WebContainer,
  filePath: string,
  content: string
): Promise<void> {
  if (isIgnoredPath(filePath)) return;

  const parts = filePath.split('/').filter(Boolean);
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join('/');
    try {
      await container.fs.mkdir(dir, { recursive: true });
    } catch {
      // ignore directory existing error
    }
  }

  await container.fs.writeFile(filePath, content);
}

export async function deleteContainerFile(
  container: WebContainer,
  filePath: string
): Promise<void> {
  try {
    await container.fs.rm(filePath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Could not remove ${filePath} from container:`, err);
  }
}

export async function createContainerDirectory(
  container: WebContainer,
  dirPath: string
): Promise<void> {
  try {
    await container.fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    console.warn(`Could not create directory ${dirPath} in container:`, err);
  }
}
