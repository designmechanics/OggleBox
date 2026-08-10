import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Layers, Film } from 'lucide-react';
import type { MediaItem, PrimaryColorKey, ThemeMode } from '../types';

interface CategorySidebarProps {
  library: MediaItem[];
  activeCategory: string; // e.g. "All", "Root", "Tutorials", "Tutorials/Beginner"
  onSelectCategory: (categoryPath: string) => void;
  theme?: ThemeMode;
  primaryColor?: PrimaryColorKey;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  fullPath: string; // matching item.category
  count: number;
  children: Record<string, CategoryTreeNode>;
}

export default function CategorySidebar({ 
  library, 
  activeCategory, 
  onSelectCategory,
  theme = 'dark',
  primaryColor = 'cyan'
}: CategorySidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const colorClasses = useMemo(() => {
    switch(primaryColor) {
      case 'pink':
        return { text: 'text-pink-400', bg: 'bg-pink-500', bgLight: 'bg-pink-500/10', border: 'border-pink-500/30' };
      case 'emerald':
        return { text: 'text-emerald-400', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 'amber':
        return { text: 'text-amber-400', bg: 'bg-amber-500', bgLight: 'bg-amber-500/10', border: 'border-amber-500/30' };
      default:
        return { text: 'text-cyan-400', bg: 'bg-cyan-500', bgLight: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    }
  }, [primaryColor]);

  const isLight = theme === 'light';

  // Build category tree hierarchy dynamically
  const tree = useMemo(() => {
    const rootNodes: Record<string, CategoryTreeNode> = {};

    library.forEach((item) => {
      const rawCat = item.category || 'Root';
      if (rawCat === 'Root' || rawCat === 'media') {
        if (!rootNodes['Root']) {
          rootNodes['Root'] = { id: 'Root', name: 'Root Folder', fullPath: 'Root', count: 0, children: {} };
        }
        rootNodes['Root'].count++;
        return;
      }

      // Split categories by slash e.g. "Tutorials/Beginner/Part1"
      const parts = rawCat.split('/').filter(Boolean);
      let currentLevel = rootNodes;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!currentLevel[part]) {
          currentLevel[part] = {
            id: currentPath,
            name: part,
            fullPath: currentPath,
            count: 0,
            children: {}
          };
        }
        currentLevel[part].count++;
        if (index < parts.length - 1) {
          currentLevel = currentLevel[part].children;
        }
      });
    });

    return rootNodes;
  }, [library]);

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const isPathActive = (fullPath: string) => {
    if (activeCategory === fullPath) return true;
    if (fullPath !== 'All' && activeCategory.startsWith(fullPath + '/')) return true;
    return false;
  };

  return (
    <aside className={`w-full md:w-72 shrink-0 h-full flex flex-col overflow-hidden select-none border-r transition-colors duration-200 ${
      isLight 
        ? 'bg-white/80 backdrop-blur-xl border-slate-200 text-slate-800' 
        : 'bg-black/30 backdrop-blur-xl border-white/10 text-white'
    }`}>
      {/* Sidebar Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
      }`}>
        <div className="flex items-center gap-2">
          <Layers className={`w-4 h-4 ${colorClasses.text}`} />
          <h2 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-white/90'}`}>
            Category Library
          </h2>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${colorClasses.text} ${colorClasses.bgLight} ${colorClasses.border}`}>
          {library.length} Videos
        </span>
      </div>

      {/* Categories Scrollable Tree Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {/* All Media Option */}
        <button
          onClick={() => onSelectCategory('All')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
            activeCategory === 'All'
              ? `${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border} shadow-sm font-bold`
              : isLight
                ? 'text-slate-700 border-transparent hover:bg-slate-100 hover:text-slate-900'
                : 'text-white/70 border-transparent hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Film className={`w-4 h-4 ${colorClasses.text}`} />
            <span className="font-mono text-xs">media/ (All)</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
            isLight ? 'bg-slate-200/70 text-slate-700' : 'bg-white/10 text-white/70'
          }`}>
            {library.length}
          </span>
        </button>

        {/* Tree Nodes */}
        {(Object.values(tree) as CategoryTreeNode[]).map((node) => {
          const hasChildren = Object.keys(node.children).length > 0;
          const isActive = isPathActive(node.fullPath);
          const isExpanded = expandedNodes[node.fullPath] || isActive;

          return (
            <div key={node.id} className="space-y-1">
              {/* Main Category Row */}
              <div
                onClick={() => {
                  onSelectCategory(node.fullPath);
                  if (hasChildren) {
                    setExpandedNodes((prev) => ({ ...prev, [node.fullPath]: true }));
                  }
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-all border ${
                  activeCategory === node.fullPath
                    ? `${colorClasses.bg} text-black border-transparent shadow-md font-bold`
                    : isActive
                    ? `${colorClasses.bgLight} ${colorClasses.text} ${colorClasses.border}`
                    : isLight
                    ? 'text-slate-700 border-transparent hover:bg-slate-100'
                    : 'text-white/80 border-transparent hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {hasChildren ? (
                    <button
                      onClick={(e) => toggleExpand(node.fullPath, e)}
                      className={`p-0.5 rounded transition-colors ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/10'}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className={`w-3.5 h-3.5 ${colorClasses.text}`} />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </button>
                  ) : (
                    <span className="w-3.5" />
                  )}

                  {isExpanded ? (
                    <FolderOpen className={`w-4 h-4 shrink-0 ${activeCategory === node.fullPath ? 'text-black' : colorClasses.text}`} />
                  ) : (
                    <Folder className={`w-4 h-4 shrink-0 ${activeCategory === node.fullPath ? 'text-black' : colorClasses.text}`} />
                  )}

                  <span className="truncate font-mono">media/{node.name}</span>
                </div>

                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeCategory === node.fullPath 
                      ? 'bg-black/20 text-black' 
                      : isLight 
                      ? 'bg-slate-200/80 text-slate-700' 
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {node.count}
                </span>
              </div>

              {/* Sub-Categories */}
              {hasChildren && isExpanded && (
                <div className={`ml-5 pl-2 border-l space-y-1 py-1 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>
                  {(Object.values(node.children) as CategoryTreeNode[]).map((subNode) => {
                    const isSubActive = activeCategory === subNode.fullPath;
                    return (
                      <button
                        key={subNode.id}
                        onClick={() => onSelectCategory(subNode.fullPath)}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono flex items-center justify-between transition-all border ${
                          isSubActive
                            ? `${colorClasses.bg} text-black border-transparent font-bold shadow`
                            : isLight
                            ? 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
                            : 'text-white/70 border-transparent hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Folder className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-black' : colorClasses.text}`} />
                          <span className="truncate">{subNode.name}</span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                          isSubActive 
                            ? 'bg-black/20 text-black' 
                            : isLight 
                            ? 'bg-slate-200 text-slate-600' 
                            : 'bg-white/10 opacity-60'
                        }`}>
                          {subNode.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </aside>
  );
}

