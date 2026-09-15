export interface WorkspaceFile {
  path: string; // e.g., "server.js" or "src/index.js"
  name: string;
  content: string;
  isDirectory: boolean;
  parentPath: string; // "" for root, or "src"
  updatedAt: number;
}

export interface FileNode {
  path: string;
  name: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface EditorTab {
  path: string;
  title: string;
  isDirty?: boolean;
}

export type WebContainerStatus =
  | 'idle'
  | 'checking'
  | 'booting'
  | 'ready'
  | 'error'
  | 'unsupported';

export interface ServerInfo {
  port: number;
  url: string;
  readyAt: number;
}

export type ActivityView = 'explorer' | 'search' | 'scripts' | 'templates' | 'help';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  files: Record<string, string>;
  defaultRunCommand: string;
  recommendedPort?: number;
}
