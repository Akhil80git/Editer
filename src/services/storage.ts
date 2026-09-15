import { openDB, type IDBPDatabase } from 'idb';
import type { WorkspaceFile } from '../types';

const DB_NAME = 'cloud_ide_workspace_db';
const DB_VERSION = 1;
const FILES_STORE = 'workspace_files';
const STATE_STORE = 'workspace_state';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function isIgnoredPath(path: string): boolean {
  if (!path) return true;
  const normalized = path.replace(/\\/g, '/');
  return (
    normalized.startsWith('node_modules/') ||
    normalized.includes('/node_modules/') ||
    normalized === 'node_modules' ||
    normalized.startsWith('.git/') ||
    normalized === '.git'
  );
}

export async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const fileStore = db.createObjectStore(FILES_STORE, { keyPath: 'path' });
          fileStore.createIndex('parentPath', 'parentPath', { unique: false });
        }
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadWorkspaceFiles(): Promise<WorkspaceFile[]> {
  try {
    const db = await getDB();
    const all = await db.getAll(FILES_STORE);
    return (all as WorkspaceFile[]).filter((f) => !isIgnoredPath(f.path));
  } catch (err) {
    console.error('Failed to load workspace files from IndexedDB:', err);
    return [];
  }
}

export async function saveWorkspaceFile(file: WorkspaceFile): Promise<void> {
  if (isIgnoredPath(file.path)) return;
  try {
    const db = await getDB();
    await db.put(FILES_STORE, {
      ...file,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error(`Failed to save file "${file.path}" to IndexedDB:`, err);
  }
}

export async function deleteWorkspaceFile(path: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const store = tx.objectStore(FILES_STORE);
    
    // Delete file or folder and any sub-paths
    const all = await store.getAll();
    for (const item of all) {
      if (item.path === path || item.path.startsWith(`${path}/`)) {
        await store.delete(item.path);
      }
    }
    await tx.done;
  } catch (err) {
    console.error(`Failed to delete file "${path}" from IndexedDB:`, err);
  }
}

export async function renameWorkspaceFile(oldPath: string, newPath: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const store = tx.objectStore(FILES_STORE);

    const all = await store.getAll();
    for (const item of all) {
      if (item.path === oldPath) {
        await store.delete(oldPath);
        const name = newPath.split('/').pop() || newPath;
        const parentPath = newPath.includes('/') ? newPath.slice(0, newPath.lastIndexOf('/')) : '';
        await store.put({
          ...item,
          path: newPath,
          name,
          parentPath,
          updatedAt: Date.now(),
        });
      } else if (item.path.startsWith(`${oldPath}/`)) {
        const subRelative = item.path.slice(oldPath.length);
        const targetPath = `${newPath}${subRelative}`;
        const name = targetPath.split('/').pop() || targetPath;
        const parentPath = targetPath.includes('/') ? targetPath.slice(0, targetPath.lastIndexOf('/')) : '';
        await store.delete(item.path);
        await store.put({
          ...item,
          path: targetPath,
          name,
          parentPath,
          updatedAt: Date.now(),
        });
      }
    }
    await tx.done;
  } catch (err) {
    console.error(`Failed to rename file "${oldPath}" to "${newPath}":`, err);
  }
}

export async function saveAllWorkspaceFiles(files: WorkspaceFile[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const store = tx.objectStore(FILES_STORE);
    await store.clear();
    for (const file of files) {
      if (!isIgnoredPath(file.path)) {
        await store.put({
          ...file,
          updatedAt: Date.now(),
        });
      }
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to save all files to IndexedDB:', err);
  }
}

export interface WorkspaceStateRecord {
  activeFilePath: string | null;
  openTabs: string[];
  lastSavedAt: number;
}

export async function loadWorkspaceState(): Promise<WorkspaceStateRecord | null> {
  try {
    const db = await getDB();
    const record = await db.get(STATE_STORE, 'editor_state');
    return record?.data || null;
  } catch (err) {
    console.error('Failed to load workspace state from IndexedDB:', err);
    return null;
  }
}

export async function saveWorkspaceState(data: {
  activeFilePath: string | null;
  openTabs: string[];
}): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STATE_STORE, {
      key: 'editor_state',
      data: {
        ...data,
        lastSavedAt: Date.now(),
      },
    });
  } catch (err) {
    console.error('Failed to save workspace state:', err);
  }
}

export async function resetWorkspaceDB(): Promise<void> {
  try {
    const db = await getDB();
    const tx1 = db.transaction(FILES_STORE, 'readwrite');
    await tx1.objectStore(FILES_STORE).clear();
    await tx1.done;

    const tx2 = db.transaction(STATE_STORE, 'readwrite');
    await tx2.objectStore(STATE_STORE).clear();
    await tx2.done;
  } catch (err) {
    console.error('Failed to reset workspace DB:', err);
  }
}
