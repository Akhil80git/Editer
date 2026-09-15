import React from 'react';
import { Files, Search, PlaySquare, BookOpen, Settings } from 'lucide-react';
import type { ActivityView } from '../types';

interface ActivityBarProps {
  currentView: ActivityView;
  onSelectView: (view: ActivityView) => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ currentView, onSelectView }) => {
  const navItems = [
    { id: 'explorer' as ActivityView, icon: Files, label: 'Explorer (Ctrl+Shift+E)' },
    { id: 'search' as ActivityView, icon: Search, label: 'Search in Workspace (Ctrl+Shift+F)' },
    { id: 'scripts' as ActivityView, icon: PlaySquare, label: 'NPM Scripts & Commands' },
    { id: 'help' as ActivityView, icon: BookOpen, label: 'WebContainer Architecture & Info' },
  ];

  return (
    <div className="w-12 bg-[#333333] flex flex-col justify-between items-center py-2 border-r border-[#252526] z-20 shrink-0 select-none">
      {/* Top Icons */}
      <div className="flex flex-col gap-2 w-full items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              title={item.label}
              className={`relative w-full h-10 flex items-center justify-center transition-colors ${
                isActive
                  ? 'text-white before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-sky-400'
                  : 'text-[#858585] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Bottom Settings Icon */}
      <div className="flex flex-col gap-2 w-full items-center">
        <button
          onClick={() => onSelectView('help')}
          title="Settings & System Diagnostics"
          className="w-full h-10 flex items-center justify-center text-[#858585] hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
