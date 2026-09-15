import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceFile, EditorTab, StarterTemplate } from '../types';
import {
  loadWorkspaceFiles,
  saveWorkspaceFile,
  deleteWorkspaceFile,
  renameWorkspaceFile,
  saveAllWorkspaceFiles,
  loadWorkspaceState,
  saveWorkspaceState,
  resetWorkspaceDB,
  isIgnoredPath,
} from '../services/storage';
import { STARTER_TEMPLATES, templateToWorkspaceFiles } from '../services/templates';

interface UseWorkspaceProps {
  onFileSync?: (path: string, content: string) => Promise<void>;
  onFileDelete?: (path: string) => Promise<void>;
  onDirCreate?: (path: string) => Promise<void>;
  onMountFiles?: (files: WorkspaceFile[]) => Promise<void>;
  isContainerReady: boolean;
}

export function useWorkspace({
  onFileSync,
  onFileDelete,
  onDirCreate,
  onMountFiles,
  isContainerReady,
}: UseWorkspaceProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());

  const autosaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const filesRef = useRef<WorkspaceFile[]>(files);
  filesRef.current = files;

  // Initialize from IndexedDB or default template
  useEffect(() => {
    let isMounted = true;

    async function initWorkspace() {
      try {
        let loadedFiles = await loadWorkspaceFiles();
        const savedState = await loadWorkspaceState();

        if (loadedFiles.length === 0) {
          // Initialize with default template
          const defaultTemplate = STARTER_TEMPLATES[0];
          loadedFiles = templateToWorkspaceFiles(defaultTemplate);
          await saveAllWorkspaceFiles(loadedFiles);
        }

        if (!isMounted) return;

        setFiles(loadedFiles);

        // Restore tabs
        const filePaths = new Set(loadedFiles.filter((f) => !f.isDirectory).map((f) => f.path));
        let initialTabs: string[] = [];

        if (savedState?.openTabs && savedState.openTabs.length > 0) {
          initialTabs = savedState.openTabs.filter((t) => filePaths.has(t));
        }

        if (initialTabs.length === 0) {
          // Default to index.html or server.js
          const fallback =
            filePaths.has('server.js')
              ? 'server.js'
              : filePaths.has('public/index.html')
              ? 'public/index.html'
              : Array.from(filePaths)[0] || '';
          if (fallback) initialTabs = [fallback];
        }

        const editorTabs: EditorTab[] = initialTabs.map((path) => ({
          path,
          title: path.split('/').pop() || path,
          isDirty: false,
        }));

        setOpenTabs(editorTabs);

        const initialActive =
          savedState?.activeFilePath && filePaths.has(savedState.activeFilePath)
            ? savedState.activeFilePath
            : initialTabs[0] || null;

        setActiveFilePath(initialActive);
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to init workspace:', err);
        setIsLoaded(true);
      }
    }

    initWorkspace();

    return () => {
      isMounted = false;
      // Clear any pending autosave timers on unmount
      autosaveTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Mount to WebContainer when ready
  const mountedRef = useRef(false);
  useEffect(() => {
    if (isContainerReady && isLoaded && files.length > 0 && onMountFiles) {
      onMountFiles(files).then(() => {
        mountedRef.current = true;
      });
    }
  }, [isContainerReady, isLoaded, files, onMountFiles]);

  // Persist editor state (tabs & active file)
  const persistState = useCallback((active: string | null, tabs: EditorTab[]) => {
    saveWorkspaceState({
      activeFilePath: active,
      openTabs: tabs.map((t) => t.path),
    });
  }, []);

  // Select file to edit
  const openFile = useCallback(
    (filePath: string) => {
      const file = filesRef.current.find((f) => f.path === filePath && !f.isDirectory);
      if (!file) return;

      setActiveFilePath(filePath);

      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.path === filePath);
        if (exists) {
          persistState(filePath, prev);
          return prev;
        }
        const newTabs = [
          ...prev,
          {
            path: filePath,
            title: filePath.split('/').pop() || filePath,
            isDirty: false,
          },
        ];
        persistState(filePath, newTabs);
        return newTabs;
      });
    },
    [persistState]
  );

  // Close tab
  const closeTab = useCallback(
    (filePath: string) => {
      setOpenTabs((prev) => {
        const nextTabs = prev.filter((t) => t.path !== filePath);
        let nextActive = activeFilePath;

        if (activeFilePath === filePath) {
          if (nextTabs.length > 0) {
            // Pick previous tab or last tab
            const closedIdx = prev.findIndex((t) => t.path === filePath);
            const targetIdx = Math.max(0, closedIdx - 1);
            nextActive = nextTabs[targetIdx]?.path || null;
          } else {
            nextActive = null;
          }
        }

        setActiveFilePath(nextActive);
        persistState(nextActive, nextTabs);
        return nextTabs;
      });
    },
    [activeFilePath, persistState]
  );

  // Update file content with debounced autosave to IndexedDB & WebContainer
  const updateFileContent = useCallback(
    (filePath: string, newContent: string) => {
      if (isIgnoredPath(filePath)) return;

      // Update in-memory state immediately
      setFiles((prev) =>
        prev.map((f) => (f.path === filePath ? { ...f, content: newContent } : f))
      );

      // Mark tab as dirty
      setDirtyFiles((prev) => new Set(prev).add(filePath));
      setOpenTabs((prev) =>
        prev.map((t) => (t.path === filePath ? { ...t, isDirty: true } : t))
      );

      // Clear existing debounce timer
      if (autosaveTimers.current.has(filePath)) {
        clearTimeout(autosaveTimers.current.get(filePath)!);
      }

      // Debounce autosave 400ms
      const timer = setTimeout(async () => {
        autosaveTimers.current.delete(filePath);

        const currentFile = filesRef.current.find((f) => f.path === filePath);
        if (currentFile) {
          const updated: WorkspaceFile = {
            ...currentFile,
            content: newContent,
            updatedAt: Date.now(),
          };

          // 1. Save to IndexedDB
          await saveWorkspaceFile(updated);

          // 2. Sync to WebContainer
          if (onFileSync) {
            await onFileSync(filePath, newContent);
          }

          // Clear dirty state
          setDirtyFiles((prev) => {
            const next = new Set(prev);
            next.delete(filePath);
            return next;
          });
          setOpenTabs((prev) =>
            prev.map((t) => (t.path === filePath ? { ...t, isDirty: false } : t))
          );
        }
      }, 400);

      autosaveTimers.current.set(filePath, timer);
    },
    [onFileSync]
  );

  // Force immediate save (e.g., Ctrl+S)
  const saveImmediate = useCallback(
    async (filePath: string) => {
      if (autosaveTimers.current.has(filePath)) {
        clearTimeout(autosaveTimers.current.get(filePath)!);
        autosaveTimers.current.delete(filePath);
      }

      const currentFile = filesRef.current.find((f) => f.path === filePath);
      if (currentFile) {
        await saveWorkspaceFile(currentFile);
        if (onFileSync) {
          await onFileSync(filePath, currentFile.content);
        }
        setDirtyFiles((prev) => {
          const next = new Set(prev);
          next.delete(filePath);
          return next;
        });
        setOpenTabs((prev) =>
          prev.map((t) => (t.path === filePath ? { ...t, isDirty: false } : t))
        );
      }
    },
    [onFileSync]
  );

  // Create new file
  const createFile = useCallback(
    async (rawPath: string) => {
      const sanitized = rawPath.replace(/^\/+|\/+$/g, '').trim();
      if (!sanitized || isIgnoredPath(sanitized)) return;

      const parts = sanitized.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

      // Check if file already exists
      if (filesRef.current.some((f) => f.path === sanitized)) {
        openFile(sanitized);
        return;
      }

      // Ensure intermediate parent directories exist
      const newDirs: WorkspaceFile[] = [];
      if (parentPath) {
        let cur = '';
        for (let i = 0; i < parts.length - 1; i++) {
          const parent = cur;
          cur = cur ? `${cur}/${parts[i]}` : parts[i];
          if (!filesRef.current.some((f) => f.path === cur)) {
            const dirNode: WorkspaceFile = {
              path: cur,
              name: parts[i],
              content: '',
              isDirectory: true,
              parentPath: parent,
              updatedAt: Date.now(),
            };
            newDirs.push(dirNode);
            await saveWorkspaceFile(dirNode);
            if (onDirCreate) await onDirCreate(cur);
          }
        }
      }

      const newFile: WorkspaceFile = {
        path: sanitized,
        name,
        content: '',
        isDirectory: false,
        parentPath,
        updatedAt: Date.now(),
      };

      await saveWorkspaceFile(newFile);
      if (onFileSync) await onFileSync(sanitized, '');

      setFiles((prev) => [...prev, ...newDirs, newFile]);
      openFile(sanitized);
    },
    [openFile, onFileSync, onDirCreate]
  );

  // Create new folder
  const createFolder = useCallback(
    async (rawPath: string) => {
      const sanitized = rawPath.replace(/^\/+|\/+$/g, '').trim();
      if (!sanitized || isIgnoredPath(sanitized)) return;

      const parts = sanitized.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

      if (filesRef.current.some((f) => f.path === sanitized)) return;

      const newDir: WorkspaceFile = {
        path: sanitized,
        name,
        content: '',
        isDirectory: true,
        parentPath,
        updatedAt: Date.now(),
      };

      await saveWorkspaceFile(newDir);
      if (onDirCreate) await onDirCreate(sanitized);

      setFiles((prev) => [...prev, newDir]);
    },
    [onDirCreate]
  );

  // Delete file or folder
  const deleteItem = useCallback(
    async (targetPath: string) => {
      await deleteWorkspaceFile(targetPath);
      if (onFileDelete) {
        await onFileDelete(targetPath);
      }

      // Remove tabs associated with targetPath or children
      setOpenTabs((prev) => {
        const nextTabs = prev.filter(
          (t) => t.path !== targetPath && !t.path.startsWith(`${targetPath}/`)
        );
        return nextTabs;
      });

      if (
        activeFilePath === targetPath ||
        (activeFilePath && activeFilePath.startsWith(`${targetPath}/`))
      ) {
        setActiveFilePath(null);
      }

      setFiles((prev) =>
        prev.filter((f) => f.path !== targetPath && !f.path.startsWith(`${targetPath}/`))
      );
    },
    [activeFilePath, onFileDelete]
  );

  // Rename file or folder
  const renameItem = useCallback(
    async (oldPath: string, newPath: string) => {
      const sanitizedNew = newPath.replace(/^\/+|\/+$/g, '').trim();
      if (!sanitizedNew || oldPath === sanitizedNew) return;

      await renameWorkspaceFile(oldPath, sanitizedNew);

      // Update WebContainer: delete old, create new
      if (onFileDelete) await onFileDelete(oldPath);

      setFiles((prev) =>
        prev.map((item) => {
          if (item.path === oldPath) {
            const name = sanitizedNew.split('/').pop() || sanitizedNew;
            const parentPath = sanitizedNew.includes('/')
              ? sanitizedNew.slice(0, sanitizedNew.lastIndexOf('/'))
              : '';
            const updated = {
              ...item,
              path: sanitizedNew,
              name,
              parentPath,
            };
            if (onFileSync && !item.isDirectory) {
              onFileSync(sanitizedNew, item.content);
            }
            return updated;
          }
          if (item.path.startsWith(`${oldPath}/`)) {
            const sub = item.path.slice(oldPath.length);
            const targetPath = `${sanitizedNew}${sub}`;
            const name = targetPath.split('/').pop() || targetPath;
            const parentPath = targetPath.includes('/')
              ? targetPath.slice(0, targetPath.lastIndexOf('/'))
              : '';
            const updated = {
              ...item,
              path: targetPath,
              name,
              parentPath,
            };
            if (onFileSync && !item.isDirectory) {
              onFileSync(targetPath, item.content);
            }
            return updated;
          }
          return item;
        })
      );

      // Update tabs and active path
      setOpenTabs((prev) =>
        prev.map((t) => {
          if (t.path === oldPath) {
            return {
              ...t,
              path: sanitizedNew,
              title: sanitizedNew.split('/').pop() || sanitizedNew,
            };
          }
          if (t.path.startsWith(`${oldPath}/`)) {
            const targetPath = `${sanitizedNew}${t.path.slice(oldPath.length)}`;
            return {
              ...t,
              path: targetPath,
              title: targetPath.split('/').pop() || targetPath,
            };
          }
          return t;
        })
      );

      if (activeFilePath === oldPath) {
        setActiveFilePath(sanitizedNew);
      } else if (activeFilePath && activeFilePath.startsWith(`${oldPath}/`)) {
        setActiveFilePath(`${sanitizedNew}${activeFilePath.slice(oldPath.length)}`);
      }
    },
    [activeFilePath, onFileDelete, onFileSync]
  );

  // Load starter template
  const loadTemplate = useCallback(
    async (template: StarterTemplate) => {
      // Clear timers
      autosaveTimers.current.forEach((t) => clearTimeout(t));
      autosaveTimers.current.clear();

      const newFiles = templateToWorkspaceFiles(template);
      await saveAllWorkspaceFiles(newFiles);

      setFiles(newFiles);
      setDirtyFiles(new Set());

      const initialTabs = Object.keys(template.files)
        .slice(0, 3)
        .map((p) => ({
          path: p,
          title: p.split('/').pop() || p,
          isDirty: false,
        }));

      setOpenTabs(initialTabs);
      const defaultActive = initialTabs[0]?.path || null;
      setActiveFilePath(defaultActive);
      persistState(defaultActive, initialTabs);

      if (onMountFiles) {
        await onMountFiles(newFiles);
      }
    },
    [onMountFiles, persistState]
  );

  // Reset workspace
  const resetWorkspace = useCallback(async () => {
    await resetWorkspaceDB();
    const defaultTemplate = STARTER_TEMPLATES[0];
    await loadTemplate(defaultTemplate);
  }, [loadTemplate]);

  const activeFile = files.find((f) => f.path === activeFilePath && !f.isDirectory) || null;

  return {
    files,
    activeFile,
    activeFilePath,
    openTabs,
    isLoaded,
    dirtyFiles,
    openFile,
    closeTab,
    updateFileContent,
    saveImmediate,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    loadTemplate,
    resetWorkspace,
  };
}
