import React, { useState, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { FileExplorer } from './components/FileExplorer';
import { EditorView } from './components/EditorView';
import { TerminalView, type TerminalViewHandle } from './components/TerminalView';
import { PreviewView } from './components/PreviewView';
import { StatusBar } from './components/StatusBar';
import { UnsupportedModal } from './components/UnsupportedModal';
import { useWebContainer } from './hooks/useWebContainer';
import { useWorkspace } from './hooks/useWorkspace';
import type { ActivityView, StarterTemplate } from './types';

export default function App() {
  const terminalRef = useRef<TerminalViewHandle>(null);

  // Layout Toggles
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [currentActivity, setCurrentActivity] = useState<ActivityView>('explorer');
  const [dismissUnsupportedModal, setDismissUnsupportedModal] = useState(false);

  // WebContainer Hook
  const {
    container,
    status: containerStatus,
    error: containerError,
    supportInfo,
    serverInfo,
    activeServers,
    boot: rebootContainer,
    mountFiles,
    syncFile,
    removeFile,
    makeDirectory,
  } = useWebContainer();

  // Workspace & IDB Hook
  const {
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
  } = useWorkspace({
    onFileSync: syncFile,
    onFileDelete: removeFile,
    onDirCreate: makeDirectory,
    onMountFiles: mountFiles,
    isContainerReady: containerStatus === 'ready',
  });

  // Handle command dispatch to terminal
  const handleRunCommand = useCallback((cmd: string) => {
    if (!showTerminal) {
      setShowTerminal(true);
    }
    setTimeout(() => {
      terminalRef.current?.sendCommand(cmd);
    }, 100);
  }, [showTerminal]);

  const handleRestartContainer = useCallback(() => {
    rebootContainer();
  }, [rebootContainer]);

  const handleSelectTemplate = useCallback(
    (template: StarterTemplate) => {
      loadTemplate(template);
    },
    [loadTemplate]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181818] text-[#cccccc] font-sans">
      {/* Top Header / TitleBar */}
      <TitleBar
        status={containerStatus}
        serverInfo={serverInfo}
        onRunCommand={handleRunCommand}
        onRestartContainer={handleRestartContainer}
        onResetWorkspace={resetWorkspace}
        onSelectTemplate={handleSelectTemplate}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal((prev) => !prev)}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview((prev) => !prev)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Activity Bar (Vertical Left) */}
        <ActivityBar
          currentView={currentActivity}
          onSelectView={(view) => {
            if (currentActivity === view && showSidebar) {
              setShowSidebar(false);
            } else {
              setCurrentActivity(view);
              setShowSidebar(true);
            }
          }}
        />

        {/* Primary Sidebar: File Explorer / Search / Scripts */}
        {showSidebar && (
          <FileExplorer
            files={files}
            activeFilePath={activeFilePath}
            currentView={currentActivity}
            onOpenFile={openFile}
            onCreateFile={createFile}
            onCreateFolder={createFolder}
            onRenameItem={renameItem}
            onDeleteItem={deleteItem}
            onRunCommand={handleRunCommand}
          />
        )}

        {/* Center: Monaco Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[#2d2d2d] overflow-hidden">
          <EditorView
            activeFile={activeFile}
            openTabs={openTabs}
            onSelectTab={openFile}
            onCloseTab={closeTab}
            onChangeContent={updateFileContent}
            onSaveImmediate={saveImmediate}
            onNewFile={() => createFile(`new-file-${Date.now().toString().slice(-4)}.js`)}
          />
        </div>

        {/* Right Panel: Split Terminal (Top) + Live Preview (Bottom) */}
        {(showTerminal || showPreview) && (
          <div className="w-[45%] max-w-[700px] min-w-[320px] flex flex-col h-full bg-[#1e1e1e] border-l border-[#2d2d2d] overflow-hidden">
            {/* Top Half: Xterm.js Terminal */}
            {showTerminal && (
              <TerminalView
                ref={terminalRef}
                container={container}
                isReady={containerStatus === 'ready'}
              />
            )}

            {/* Bottom Half: Live Iframe Preview */}
            {showPreview && (
              <PreviewView
                serverInfo={serverInfo}
                activeServers={activeServers}
                onStartServer={handleRunCommand}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        status={containerStatus}
        serverInfo={serverInfo}
        activeFile={activeFile}
        dirtyCount={dirtyFiles.size}
      />

      {/* Diagnostics / Unsupported Modal if Cross-Origin Isolation is missing */}
      {containerStatus === 'unsupported' && !dismissUnsupportedModal && (
        <UnsupportedModal
          supportInfo={supportInfo}
          onDismiss={() => setDismissUnsupportedModal(true)}
          onRetry={() => {
            rebootContainer();
          }}
        />
      )}
    </div>
  );
}
