import React, { useEffect, useMemo, useRef, useState } from 'react';
import { assetsService } from '../../services/assetsService';
import { FolderIcon, DocumentIcon, EllipsisVerticalIcon, ArrowLeftIcon, PlusIcon, MagnifyingGlassIcon, CloudArrowUpIcon, Squares2X2Icon, Bars3Icon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useProjects } from '../../hooks/useQueryApi';

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; let b = Math.max(bytes, 0);
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${Math.round(b)}${units[i]}`;
}

// Best-effort owner and customer name extractors (backend may not always provide)
const getOwnerName = (item) => {
  try {
    const fn = item?.uploadedBy?.firstName || '';
    const ln = item?.uploadedBy?.lastName || '';
    return `${fn}${ln}`.trim();
  } catch (_) { return ''; }
};

const getCustomerName = (item) => {
  try {
    // Try several likely shapes
    return (
      item?.customerName ||
      item?.customer?.name ||
      item?.project?.customerName ||
      item?.project?.customer?.name ||
      item?.metadata?.customerName ||
      ''
    );
  } catch (_) { return ''; }
};

// Determine a human-friendly file type (e.g., PDF, CSV). Folders return 'Folder'.
const getFileType = (item) => {
  try {
    if (item?.type === 'FOLDER') return 'Folder';
    const mt = item?.mimeType || item?.mimetype || '';
    if (mt && mt.includes('/')) {
      const sub = mt.split('/')[1];
      if (sub) return sub.toUpperCase();
    }
    const name = item?.title || item?.fileName || item?.originalName || '';
    const ext = name.includes('.') ? name.split('.').pop() : '';
    return ext ? ext.toUpperCase() : 'FILE';
  } catch (_) { return 'FILE'; }
};

// Map type label to badge color classes
const getFileTypeInfo = (label) => {
  const L = (label || '').toUpperCase();
  const isAny = (arr) => arr.includes(L);
  if (L === 'FOLDER') return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  if (L === 'PDF') return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  if (isAny(['CSV', 'XLS', 'XLSX'])) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  if (isAny(['DOC', 'DOCX'])) return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
  if (isAny(['PPT', 'PPTX'])) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  if (isAny(['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'])) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
};

// Folder tree node renderer
const FolderTreeNode = ({ node, depth, onToggle, onSelect, isActive, onDropMove }) => {
  const hasChildren = (node.childrenCount ?? (node.children ? node.children.length : 0)) > 0 || node._hasChildren;
  const paddingLeft = 8 + depth * 14;
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = async (e) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/asset-id');
    if (!assetId) return;
    if (assetId === node.id) return; // avoid self-move
    await onDropMove(assetId, node.id);
  };
  return (
    <div
      className={`group flex items-center gap-2 py-1 rounded cursor-pointer ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
      style={{ paddingLeft }}
      onClick={() => onSelect(node)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/asset-id', node.id)}
      title={node.folderName || node.title}
    >
      <button
        className={`w-5 h-5 flex items-center justify-center rounded ${hasChildren ? 'opacity-80 group-hover:bg-gray-100' : 'opacity-0'}`}
        onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node); }}
        title={hasChildren ? (node._expanded ? 'Collapse' : 'Expand') : ''}
      >
        {hasChildren ? (node._expanded ? <ChevronDownIcon className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>) : <span className="w-4 h-4"/>}
      </button>
      <FolderIcon className="w-4 h-4 text-yellow-500"/>
      <span className="text-sm whitespace-normal break-words leading-tight">{node.folderName || node.title}</span>
    </div>
  );
};

const FolderTree = ({ currentParentId, onSelectFolder, rootId, onCreateFolder }) => {
  const [roots, setRoots] = useState([]);
  const [childrenMap, setChildrenMap] = useState({}); // id -> children array
  const [rootInfo, setRootInfo] = useState(null); // scoped root folder metadata

  const refreshRoots = async (preserveExpandedIds = new Set()) => {
    try {
      // When rootId is undefined, show global roots; when null, show blank; otherwise scope to that root's children
      if (typeof rootId === 'undefined') {
        const rootData = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
        const annotated = (rootData || []).map(r => ({ ...r, _expanded: preserveExpandedIds.has(r.id), _hasChildren: (r.children || []).length > 0 }));
        setRoots(annotated);
        setRootInfo(null);
      } else if (rootId === null) {
        setRoots([]);
        setRootInfo(null);
      } else {
        // Scoped to a specific root folder
        const info = await assetsService.get(rootId);
        setRootInfo(info || null);
        const kids = await assetsService.listFolders({ parentId: rootId, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
        const annotated = (kids || []).map(k => ({ ...k, _expanded: preserveExpandedIds.has(k.id), _hasChildren: (k.children || []).length > 0 }));
        setRoots(annotated);
      }
    } catch (e) {
      setRoots([]);
      setRootInfo(null);
    }
  };

  useEffect(() => { refreshRoots(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [rootId]);

  const loadChildren = async (id) => {
    try {
      const kids = await assetsService.listFolders({ parentId: id, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
      setChildrenMap((m) => ({ ...m, [id]: (kids || []).map(k => ({ ...k, _expanded: false, _hasChildren: (k.children || []).length > 0 })) }));
    } catch (e) { setChildrenMap((m) => ({ ...m, [id]: [] })); }
  };

  const handleToggle = async (node) => {
    const isRootNode = Array.isArray(roots) && roots.some(r => r.id === node.id);
    const nextExpanded = !node._expanded;
    if (nextExpanded && !childrenMap[node.id]) {
      await loadChildren(node.id);
    }
    // Update expanded state; if root-level and expanding, collapse siblings (accordion behavior)
    setRoots((arr) => {
      return arr.map(n => {
        if (n.id === node.id) return { ...n, _expanded: nextExpanded };
        if (isRootNode && nextExpanded) return { ...n, _expanded: false };
        return n;
      });
    });
    setChildrenMap((m) => {
      const next = { ...m };
      Object.keys(next).forEach(pid => {
        next[pid] = next[pid].map(n => n.id === node.id ? { ...n, _expanded: nextExpanded } : n);
      });
      return next;
    });
  };

  // Root label click: toggle expand/collapse all first-level folders in current scope
  const handleRootLabelClick = async () => {
    const anyCollapsed = roots.some(r => !r._expanded);
    if (anyCollapsed) {
      // Expand all and preload children lazily
      for (const r of roots) {
        if (!childrenMap[r.id]) {
          try { await loadChildren(r.id); } catch (_) {}
        }
      }
      setRoots(arr => arr.map(r => ({ ...r, _expanded: true })));
    } else {
      // Collapse all
      setRoots(arr => arr.map(r => ({ ...r, _expanded: false })));
    }
  };

  const moveAsset = async (assetId, targetParentId) => {
    try {
      await assetsService.bulkOperation({ operation: 'move', assetIds: [assetId], data: { parentId: targetParentId || null } });
      window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: targetParentId || null } }));
    } catch (e) {
      console.error('Move failed', e);
    }
  };

  // Refresh on external changes while preserving expanded root nodes where possible
  useEffect(() => {
    const handler = async (e) => {
      const expandedRootIds = new Set(roots.filter(r => r._expanded).map(r => r.id));
      await refreshRoots(expandedRootIds);
      const targetId = e?.detail?.parentId;
      if (typeof targetId !== 'undefined' && targetId !== null) {
        // Refresh children for the target parent if present
        await loadChildren(targetId);
      } else if (currentParentId !== null) {
        // Fallback: refresh current parent branch if not root
        await loadChildren(currentParentId);
      }
    };
    window.addEventListener('fm:refresh', handler);
    return () => window.removeEventListener('fm:refresh', handler);
  }, [roots, currentParentId]);

  // Recursive renderer for an item and its children
  const renderBranch = (n, depth) => {
    const children = childrenMap[n.id] || [];
    return (
      <div key={n.id}>
        <FolderTreeNode
          node={n}
          depth={depth}
          onToggle={handleToggle}
          onSelect={(node) => onSelectFolder(node.id)}
          isActive={currentParentId === n.id}
          onDropMove={moveAsset}
        />
        {n._expanded && children.map((c) => renderBranch(c, depth + 1))}
      </div>
    );
  };

  // Blank state when a new tab was added and no root is selected yet
  const renderBlank = () => (
    <div className="flex-1 overflow-auto">
      <div className="p-2 text-xs text-gray-500">No folders yet for this tab.</div>
      {typeof onCreateFolder === 'function' && (
        <div className="p-2">
          <button
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => onCreateFolder()}
          >Create first folder</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Root entry varies by scope */}
      {(() => {
        if (typeof rootId === 'undefined') {
          // Global root selector
          return (
            <div
              className={`group flex items-center gap-2 py-1 rounded cursor-pointer ${currentParentId === null ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
              style={{ paddingLeft: 8 }}
              onClick={() => { onSelectFolder(null); handleRootLabelClick(); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const assetId = e.dataTransfer.getData('text/asset-id');
                if (assetId) await moveAsset(assetId, null);
              }}
            >
              <span className="w-5 h-5" />
              <FolderIcon className="w-4 h-4 text-yellow-500"/>
              <span className="text-sm whitespace-normal break-words leading-tight">My Folder</span>
            </div>
          );
        }
        if (rootId === null) {
          return renderBlank();
        }
        // Scoped root label
        return (
          <div
            className={`group flex items-center gap-2 py-1 rounded cursor-pointer ${currentParentId === rootId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
            style={{ paddingLeft: 8 }}
            onClick={() => { onSelectFolder(rootId); handleRootLabelClick(); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const assetId = e.dataTransfer.getData('text/asset-id');
              if (assetId) await moveAsset(assetId, rootId);
            }}
            title={rootInfo?.folderName || rootInfo?.title}
          >
            <span className="w-5 h-5" />
            <FolderIcon className="w-4 h-4 text-yellow-500"/>
            <span className="text-sm whitespace-normal break-words leading-tight">{rootInfo?.folderName || rootInfo?.title || 'Root'}</span>
          </div>
        );
      })()}

      {/* Children of root (global or scoped) */}
      <div className="mt-1">
        {roots.map((n) => renderBranch(n, 1))}
      </div>
    </div>
  );
};

const Sidebar = ({ onUploadClick, onCreateFolder, currentParentId, onSelectFolder, width = 240, rootId }) => {
  const [quick, setQuick] = useState({ Documents: null, Contracts: null, Images: null, Projects: null });
  useEffect(() => {
    (async () => {
      try {
        const roots = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
        const byName = (n) => roots.find(r => (r.folderName || r.title) === n)?.id || null;
        const docs = byName('Documents') || (await assetsService.createFolder({ name: 'Documents', parentId: null }))?.id || null;
        const contracts = byName('Contracts') || (await assetsService.createFolder({ name: 'Contracts', parentId: null }))?.id || null;
        const images = byName('Images') || (await assetsService.createFolder({ name: 'Images', parentId: null }))?.id || null;
        // Ensure Projects root using existing helper behavior in page if created later
        const projects = byName('Projects') || null;
        setQuick({ Documents: docs, Contracts: contracts, Images: images, Projects: projects });
      } catch (_) {}
    })();
  }, []);

  const itemCls = (active) => `flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${active ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-gray-800'}`;

  return (
    <div className="hidden md:flex md:flex-col border-r bg-white p-3" style={{ width }}>
      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
        <FolderIcon className="w-4 h-4 text-yellow-500" />
        <span>Your Folders</span>
      </div>
      <FolderTree currentParentId={currentParentId} onSelectFolder={onSelectFolder} rootId={rootId} onCreateFolder={onCreateFolder} />
      {/* Bottom sidebar controls intentionally removed per design */}
    </div>
  );
};

const FolderCard = ({ folder, onOpen, onContext }) => {
  const color = folder?.metadata?.color || 'gray';
  const colorMap = {
    yellow: 'bg-yellow-50 text-yellow-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-50 text-gray-700',
  };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = async (e) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/asset-id');
    if (assetId) {
      try {
        await assetsService.bulkOperation({ operation: 'move', assetIds: [assetId], data: { parentId: folder.id } });
        if (typeof window?.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: folder.id } }));
      } catch (err) { console.error('Move failed', err); }
    }
  };
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/asset-id', folder.id)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onOpen(folder)}
      className={`w-48 cursor-pointer rounded-lg border hover:shadow-sm ${colorMap[color] || colorMap.gray} transition-all`}> 
      <div className="p-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderIcon className="w-6 h-6"/>
          <div className="font-medium text-sm truncate" title={folder.folderName || folder.title}>{folder.folderName || folder.title}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onContext?.(e, folder); }}>
          <EllipsisVerticalIcon className="w-5 h-5 opacity-60" />
        </button>
      </div>
      <div className="px-3 pb-3 text-[11px] opacity-80 flex items-center gap-3">
        <span>{(folder.children || []).length} items</span>
        <span>•</span>
        <span>{humanSize(folder.fileSize || 0)}</span>
      </div>
    </div>
  );
};

const FileRow = ({ item, onOpen, onContext, onReorder, sortBy, onBeginReorder, isProjectsTab, projects = [], isSelected = false, onToggleSelect, goToProjectDocuments }) => {
  const isFolder = item.type === 'FOLDER';
  // Allow moving another asset into this folder via drop
  const handleRowDragOver = (e) => {
    const isReorder = e.dataTransfer?.types?.includes('text/reorder-id');
    if ((sortBy === 'custom' && isReorder) || isFolder) {
      e.preventDefault();
    }
  };
  const handleRowDrop = async (e) => {
    const reorderId = e.dataTransfer.getData('text/reorder-id');
    if (sortBy === 'custom' && reorderId) {
      e.preventDefault();
      if (reorderId !== item.id) onReorder?.(reorderId, item.id);
      return;
    }
    // Fallback: move into folder if dropping an asset-id
    if (!isFolder) return;
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/asset-id');
    if (!assetId || assetId === item.id) return;
    try {
      await assetsService.bulkOperation({ operation: 'move', assetIds: [assetId], data: { parentId: item.id } });
      if (typeof window?.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: item.id } }));
    } catch (err) { console.error('Move failed', err); }
  };
  return (
    <tr
      className="border-b hover:bg-gray-50"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/asset-id', item.id);
        // Always prepare reorder payload and request auto-switch
        e.dataTransfer.setData('text/reorder-id', item.id);
        onBeginReorder && onBeginReorder(item.id);
      }}
      onContextMenu={(e) => { e.preventDefault(); onContext?.(e, item); }}
      onDragOver={handleRowDragOver}
      onDrop={handleRowDrop}
    >
      {/* Row select */}
      <td className="px-2 py-2 align-middle">
        <input type="checkbox" checked={!!isSelected} onChange={() => onToggleSelect?.()} />
      </td>
      {/* Drag handle for custom reordering */}
      <td className="px-2 py-2 align-middle">
        {sortBy === 'custom' && (
          <button
            className="p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
            draggable
            title="Drag to reorder"
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/reorder-id', item.id);
            }}
          >
            <Bars3Icon className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </td>
      <td className="px-3 py-2 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          {isFolder ? <FolderIcon className="w-5 h-5 text-yellow-500"/> : <DocumentIcon className="w-5 h-5 text-gray-400"/>}
          <button
            className="text-sm text-left text-gray-800 hover:underline truncate block max-w-[60vw] md:max-w-[60ch]"
            title={item.title || item.folderName}
            onClick={() => onOpen(item)}
          >{item.title || item.folderName}</button>
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">
        {(() => {
          const label = getFileType(item);
          const { bg, text, border } = getFileTypeInfo(label);
          return (
            <span className={`inline-flex items-center justify-center px-1.5 h-5 rounded-sm border ${bg} ${text} ${border} text-[10px] font-semibold`}>{label}</span>
          );
        })()}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">{isFolder ? '-' : humanSize(item.fileSize || 0)}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{new Date(item.updatedAt || item.createdAt).toLocaleString()}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center gap-2 justify-end">
          {isProjectsTab && isFolder && (() => {
            const name = item.folderName || item.title || '';
            const list = Array.isArray(projects) ? projects : [];
            const match = list.find(p => (p.projectName || p.name) === name);
            if (!match) return null;
            return (
              <button
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                title="Open project documents"
                onClick={() => goToProjectDocuments?.(match)}
              >
                Docs
              </button>
            );
          })()}
          <button onClick={(e) => onContext?.(e, item)}>
            <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 inline" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default function FileManagerPage() {
  // Tabbed workspaces (multiple folder trees)
  const [tabs, setTabs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fm:tabs') || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (_) {}
    // Default: first tab is Projects
    return [
      { id: 'projects-tab', name: 'Projects', kind: 'projects', parentId: null },
      { id: 'tab-1', name: 'Workspace 1', kind: 'folder', parentId: null }
    ];
  });
  const [activeTabId, setActiveTabId] = useState(() => {
    try { return localStorage.getItem('fm:activeTabId') || 'projects-tab'; } catch (_) { return 'projects-tab'; }
  });
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const [parentId, setParentId] = useState(activeTab?.parentId ?? null);
  useEffect(() => { try { localStorage.setItem('fm:tabs', JSON.stringify(tabs)); } catch (_) {} }, [tabs]);
  useEffect(() => { try { localStorage.setItem('fm:activeTabId', activeTabId); } catch (_) {} }, [activeTabId]);
  useEffect(() => {
    // Keep parentId in sync when switching tabs
    setParentId(activeTab?.parentId ?? null);
  }, [activeTabId]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);
  const [view, setView] = useState('grid'); // 'list' | 'grid'
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, item: null });
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isResizingRef = useRef(false);
  const [customOrderMap, setCustomOrderMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fm:customOrder') || '{}'); } catch (_) { return {}; }
  });
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  // Selection state (multi-select for bulk actions)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const isSelected = (id) => selectedIds.has(id);
  const toggleSelect = (id) => setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(items.map(i => i.id)));
  // Track the Projects root folder id for sidebar scoping
  const [projectsRootId, setProjectsRootId] = useState(null);

  // Ensure first tab is the Projects tab
  useEffect(() => {
    if (!tabs.length || tabs[0]?.kind !== 'projects') {
      setTabs(prev => [{ id: 'projects-tab', name: 'Projects', kind: 'projects', parentId: null }, ...prev.filter(t => t.id !== 'projects-tab')]);
    }
  }, []);

  const setActiveParentId = (id) => {
    setParentId(id);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, parentId: id } : t));
  };

  const addTab = (name, initialParentId = parentId) => {
    const id = `tab-${Date.now()}`;
    const title = (name || '').trim() || `Workspace ${tabs.length + 1}`;
    const next = [...tabs, { id, name: title, kind: 'folder', parentId: initialParentId ?? null }];
    setTabs(next);
    setActiveTabId(id);
    // Immediately reflect new tab root in UI
    setParentId(initialParentId ?? null);
    setItems([]);
    setBreadcrumbs([]);
  };

  const startAddTab = () => { setAddingTab(true); setNewTabName(''); };
  const commitAddTab = () => { addTab(newTabName, null); setAddingTab(false); setNewTabName(''); };
  const cancelAddTab = () => { setAddingTab(false); setNewTabName(''); };
  const renameTab = (id) => {
    const current = tabs.find(t => t.id === id);
    if (current?.kind === 'projects') return; // lock projects tab name
    const nextName = window.prompt('Rename tab', current?.name || '') || '';
    if (!nextName.trim()) return;
    setTabs(prev => prev.map(t => t.id === id ? { ...t, name: nextName.trim() } : t));
  };
  const closeTab = (id) => {
    const current = tabs.find(t => t.id === id);
    if (current?.kind === 'projects') return; // do not close projects tab
    if (tabs.length <= 1) return; // keep at least one
    const idx = tabs.findIndex(t => t.id === id);
    const next = tabs.filter(t => t.id !== id);
    setTabs(next);
    if (activeTabId === id) {
      const newIdx = Math.max(0, idx - 1);
      setActiveTabId(next[newIdx]?.id || next[0].id);
    }
  };

  const saveCustomOrderMap = (next) => {
    setCustomOrderMap(next);
    try { localStorage.setItem('fm:customOrder', JSON.stringify(next)); } catch (_) {}
  };

  const applyCustomOrder = (arr) => {
    const order = customOrderMap[parentId] || [];
    if (!Array.isArray(arr) || order.length === 0) return arr;
    const pos = new Map(order.map((id, idx) => [id, idx]));
    return [...arr].sort((a, b) => {
      const aIn = pos.has(a.id);
      const bIn = pos.has(b.id);
      if (aIn && bIn) return pos.get(a.id) - pos.get(b.id);
      if (aIn) return -1;
      if (bIn) return 1;
      const aName = (a.title || a.folderName || '').toLowerCase();
      const bName = (b.title || b.folderName || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  };

  const handleReorder = (dragId, targetId) => {
    if (!dragId || !targetId || dragId === targetId) return;
    const ids = items.map(i => i.id);
    if (!ids.includes(dragId) || !ids.includes(targetId)) return;
    const current = [...(customOrderMap[parentId] || ids)];
    const filtered = current.filter(id => id !== dragId);
    const targetIndex = Math.max(0, filtered.indexOf(targetId));
    filtered.splice(targetIndex, 0, dragId);
    const nextMap = { ...customOrderMap, [parentId]: filtered };
    saveCustomOrderMap(nextMap);
    setItems((prev) => {
      const byId = new Map(prev.map(p => [p.id, p]));
      return filtered.filter(id => byId.has(id)).map(id => byId.get(id));
    });
  };

  const onSidebarResizeStart = (e) => {
    isResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientX - startX;
      const next = Math.max(180, Math.min(500, startWidth + delta));
      setSidebarWidth(next);
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Header click sorting for list table
  const handleHeaderSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder(key === 'title' ? 'asc' : 'desc');
    }
  };
  const renderSortMark = (key) => (sortBy === key ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : '');

  // Determine which root the sidebar tree should display for the current tab
  const sidebarRootId = useMemo(() => {
    if (activeTab?.kind === 'projects') {
      // If projects root not ready yet, keep blank until ensureProjectsRoot finds/creates it
      return projectsRootId || null;
    }
    if (activeTab?.kind === 'folder') {
      // null => blank state; otherwise scope to chosen folder
      return (typeof activeTab.parentId === 'undefined') ? null : activeTab.parentId;
    }
    // Fallback to global root selector
    return undefined;
  }, [activeTabId, activeTab?.kind, activeTab?.parentId, projectsRootId]);

  const folders = useMemo(() => items.filter(i => i.type === 'FOLDER'), [items]);
  const files = useMemo(() => items.filter(i => i.type !== 'FOLDER'), [items]);

  // Load projects for the Projects tab
  const { data: projectsQuery } = useProjects();
  const projects = useMemo(() => {
    const d = projectsQuery;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d)) return d;
    return [];
  }, [projectsQuery]);

  // Helpers to open project folders under a top-level 'Projects' folder
  const ensureProjectsRoot = async () => {
    // Try to find 'Projects' folder at root; create if missing
    const roots = await assetsService.listFolders({ parentId: null, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
    let projRoot = roots.find(r => (r.folderName || r.title) === 'Projects');
    if (!projRoot) {
      projRoot = await assetsService.createFolder({ name: 'Projects', parentId: null });
      window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: null } }));
    }
    try { setProjectsRootId(projRoot?.id || null); } catch (_) {}
    return projRoot;
  };

  const ensureProjectFolder = async (project) => {
    const root = await ensureProjectsRoot();
    const children = await assetsService.listFolders({ parentId: root.id, sortBy: 'title', sortOrder: 'asc', limit: 1000 });
    const name = project.projectName || project.name || `Project ${project.id}`;
    let pf = children.find(c => (c.folderName || c.title) === name);
    if (!pf) {
      pf = await assetsService.createFolder({ name, parentId: root.id });
      window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: root.id } }));
    }
    return pf;
  };

  const openProjectFolder = async (project) => {
    try {
      const pf = await ensureProjectFolder(project);
      setActiveParentId(pf.id);
    } catch (e) { console.error('Failed to open project folder', e); }
  };

  const goToProjectDocuments = (project) => {
    try {
      // Dispatch a global event so the top-level App can route to the Project Documents tab
      const detail = { projectId: project?.id, project };
      if (typeof window?.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('app:openProjectDocuments', { detail }));
      }
    } catch (e) { console.error('Failed to navigate to project', e); }
  };

  // When switching to the Projects tab, point to the 'Projects' assets folder and ensure child folders exist
  useEffect(() => {
    if (activeTab?.kind !== 'projects') return;
    let cancelled = false;
    (async () => {
      try {
        const projRoot = await ensureProjectsRoot();
        if (cancelled) return;
        if (projRoot?.id) {
          try { setProjectsRootId(projRoot.id); } catch (_) {}
          if (parentId !== projRoot.id) setActiveParentId(projRoot.id);
        }
        setView('list');
        if (Array.isArray(projects) && projects.length) {
          // Ensure each project has a folder under Projects root
          const children = projRoot?.id ? await assetsService.listFolders({ parentId: projRoot.id, sortBy: 'title', sortOrder: 'asc', limit: 10000 }) : [];
          if (cancelled) return;
          const existing = new Set(children.map(c => c.folderName || c.title));
          const toCreate = projects.filter(p => !existing.has(p.projectName || p.name));
          for (const p of toCreate) {
            if (projRoot?.id) await assetsService.createFolder({ name: p.projectName || p.name || `Project ${p.id}`, parentId: projRoot.id });
          }
          if (toCreate.length) {
            window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: projRoot?.id || null } }));
          }
        }
      } catch (e) {
        console.error('Projects tab init failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTabId, projects]);

  const load = async () => {
    setLoading(true);
    try {
      // For blank folder workspaces (no root selected yet), don't auto-list root items
      if (activeTab?.kind === 'folder' && (parentId === null || typeof parentId === 'undefined')) {
        setItems([]);
        setBreadcrumbs([]);
        return;
      }
      const data = await assetsService.list({ parentId, search, limit: 100, sortBy, sortOrder });
      let assets = data?.assets || [];
      // Client-side sorting for Type
      if (sortBy === 'type') {
        assets = [...assets].sort((a, b) => {
          const an = getFileType(a).toLowerCase();
          const bn = getFileType(b).toLowerCase();
          return sortOrder === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
        });
      }
      if (sortBy === 'custom') {
        assets = applyCustomOrder(assets);
      }
      setItems(assets);
      setBreadcrumbs(data?.breadcrumbs || []);
      // Prune selection to visible items
      setSelectedIds((prev) => {
        const visible = new Set(assets.map(a => a.id));
        const next = new Set();
        for (const id of prev) if (visible.has(id)) next.add(id);
        return next;
      });
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [parentId, sortBy, sortOrder]);
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('fm:refresh', handler);
    return () => window.removeEventListener('fm:refresh', handler);
  }, [parentId, sortBy, sortOrder]);

  const openItem = (item) => {
    if (item.type === 'FOLDER') {
      setActiveParentId(item.id);
      return;
    }
    // Authenticated open in new tab (sends Authorization header)
    assetsService.openInNewTab(item.id);
  };

  const goUp = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) { setActiveParentId(null); return; }
    const bc = [...breadcrumbs];
    bc.pop();
    setActiveParentId(bc.length ? bc[bc.length - 1].id : null);
  };

  // Ensure there is a target folder when uploading from a blank workspace tab
  const ensureUploadTarget = async () => {
    if (activeTab?.kind === 'folder' && (parentId === null || typeof parentId === 'undefined')) {
      const name = window.prompt('Create a folder to upload into. Folder name');
      if (!name) return false;
      try {
        const folder = await assetsService.createFolder({ name: name.trim(), parentId: null });
        if (folder?.id) {
          setActiveParentId(folder.id);
          window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: null } }));
          return folder.id;
        }
      } catch (e) {
        console.error('Failed to create folder for upload', e);
        return false;
      }
      return false;
    }
    return parentId;
  };

  const onUploadClick = async () => {
    const target = await ensureUploadTarget();
    if (target === false) return;
    fileInputRef.current?.click();
  };

  const onFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      // Guard: require a folder in non-Projects blank tabs
      if (activeTab?.kind === 'folder' && (parentId === null || typeof parentId === 'undefined')) {
        alert('Select or create a folder first, then upload.');
        return;
      }
      await assetsService.uploadFiles({ files, parentId, description: '' });
      await load();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      e.target.value = '';
    }
  };

  const onCreateFolder = async () => {
    const name = window.prompt('Folder name');
    if (!name) return;
    try {
      // If this is a blank workspace tab, create at root and then select it immediately
      if (activeTab?.kind === 'folder' && (parentId === null || typeof parentId === 'undefined')) {
        const folder = await assetsService.createFolder({ name, parentId: null });
        if (folder?.id) {
          setActiveParentId(folder.id);
          window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId: null } }));
          return;
        }
      }
      // Normal case: create under current parent and refresh
      const folder = await assetsService.createFolder({ name, parentId });
      window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId } }));
      await load();
    } catch (err) { console.error(err); }
  };

  // Drag-and-drop upload on main area
  const onMainDragOver = (e) => {
    const types = e.dataTransfer?.types || [];
    if (types.includes('Files') || types.includes('text/asset-id') || types.includes('text/reorder-id')) {
      e.preventDefault();
    }
  };
  const onMainDrop = async (e) => {
    const types = e.dataTransfer?.types || [];
    if (!(types.includes('Files') || types.includes('text/asset-id'))) return;
    e.preventDefault();
    try {
      const assetId = e.dataTransfer.getData('text/asset-id');
      if (assetId) {
        // Move asset into current folder when dropped on background/zone
        await assetsService.bulkOperation({ operation: 'move', assetIds: [assetId], data: { parentId } });
        window.dispatchEvent(new CustomEvent('fm:refresh', { detail: { parentId } }));
      } else if (e.dataTransfer.files?.length) {
        const files = Array.from(e.dataTransfer.files);
        // If this is a blank tab (no folder yet), prompt user to create one and upload into it
        if (activeTab?.kind === 'folder' && (parentId === null || typeof parentId === 'undefined')) {
          const targetId = await ensureUploadTarget();
          if (!targetId) return;
          await assetsService.uploadFiles({ files, parentId: targetId });
        } else {
          await assetsService.uploadFiles({ files, parentId });
        }
      }
      await load();
    } catch (err) { console.error('Main drop failed', err); }
  };

  // Context menu actions
  const openContext = (e, item) => {
    const rect = e.currentTarget?.getBoundingClientRect?.();
    let x = rect ? rect.left : e.clientX;
    let y = rect ? rect.bottom : e.clientY;
    try {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const menuWidth = 260;
      const menuHeight = 240;
      if (x + menuWidth > vw - 8) x = Math.max(8, vw - menuWidth - 8);
      if (y + menuHeight > vh - 8) y = Math.max(8, y - menuHeight);
    } catch (_) {}
    setMenu({ open: true, x, y, item });
  };
  const closeMenu = () => setMenu({ open: false, x: 0, y: 0, item: null });
  const doRename = async () => {
    const it = menu.item; if (!it) return;
    const current = it.folder_name || it.title || '';
    const name = window.prompt('Rename to', current);
    if (!name || name === current) return;
    try {
      const data = it.type === 'FOLDER' ? { folderName: name, title: name } : { title: name };
      await assetsService.updateAsset(it.id, data);
      closeMenu();
      await load();
    } catch (err) { console.error('Rename failed', err); }
  };
  const doDownload = async () => {
    const it = menu.item; if (!it || it.type === 'FOLDER') return; // download only files
    try {
      await assetsService.saveToDisk(it.id);
    } catch (e) { console.error('Download failed', e); }
    closeMenu();
  };
  const doDelete = async () => {
    const it = menu.item; if (!it) return;
    if (!window.confirm('Delete this item?')) return;
    try {
      await assetsService.bulkOperation({ operation: 'delete', assetIds: [it.id] });
      closeMenu();
      await load();
    } catch (err) { console.error('Delete failed', err); }
  };
  const doPurge = async () => {
    const it = menu.item; if (!it) return;
    if (!window.confirm('Permanently delete this item and remove from RAG? This cannot be undone.')) return;
    try {
      await assetsService.bulkOperation({ operation: 'purge', assetIds: [it.id] });
      closeMenu();
      await load();
    } catch (err) { console.error('Purge failed', err); }
  };
  const doPreview = async () => {
    const it = menu.item; if (!it) return;
    try {
      await assetsService.openInNewTab(it.id);
    } catch (e) { console.error('Preview failed', e); }
    closeMenu();
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb]" onDragOver={onMainDragOver} onDrop={onMainDrop}>
      {/* Top header */}
      <div className="border-b bg-white">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
                placeholder="Search"
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1">
              <button onClick={() => setView('grid')} className={`p-1.5 rounded-md ${view==='grid' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} title="Grid view">
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view==='list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} title="List view">
                <Bars3Icon className="w-4 h-4" />
              </button>
            </div>
            {/* Refresh */}
            <button onClick={load} className="px-2.5 py-1.5 text-sm bg-gray-100 rounded-md">Refresh</button>
          </div>
          {/* Bulk actions are now placed in the top-right header area next to New Folder / Upload */}
          {/* Tabs inline to save vertical space */}
          <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map(t => (
              <div
                key={t.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${t.id === activeTabId ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-700'} shadow-sm`}
                onDragOver={(e) => { if (e.dataTransfer?.types?.includes('text/asset-id')) e.preventDefault(); }}
                onDrop={(e) => {
                  const folderId = e.dataTransfer.getData('text/asset-id');
                  if (!folderId) return;
                  // Set this tab's root to the dropped folder
                  if (t.kind === 'projects') return; // don't change root for projects tab
                  setTabs(prev => prev.map(tab => tab.id === t.id ? { ...tab, parentId: folderId } : tab));
                  setActiveTabId(t.id);
                  setParentId(folderId);
                  setItems([]);
                  setBreadcrumbs([]);
                }}
                title="Drop a folder here to make it this tab's root"
              >
                <button onClick={() => { setActiveTabId(t.id); setParentId(t.parentId ?? null); setItems([]); setBreadcrumbs([]); }} className="text-sm font-medium truncate max-w-[140px]" title={t.name}>{t.name}</button>
                {t.kind !== 'projects' && (
                  <button onClick={() => renameTab(t.id)} title="Rename" className="text-xs opacity-60 hover:opacity-100">✏️</button>
                )}
                {tabs.length > 1 && t.kind !== 'projects' && (
                  <button onClick={() => closeTab(t.id)} title="Close" className="text-xs opacity-60 hover:opacity-100">✖</button>
                )}
              </div>
            ))}
            {addingTab ? (
              <input
                autoFocus
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitAddTab(); if (e.key === 'Escape') cancelAddTab(); }}
                onBlur={commitAddTab}
                placeholder="New tab name"
                className="px-3 py-1.5 border rounded-full text-sm"
                style={{ minWidth: 160 }}
              />
            ) : (
              <button onClick={startAddTab} className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50">+ New Tab</button>
            )}
          </div>
        </div>
      </div>

      

      <div className="w-full mx-auto md:flex">
        <Sidebar onUploadClick={onUploadClick} onCreateFolder={onCreateFolder} currentParentId={parentId} onSelectFolder={setActiveParentId} width={sidebarWidth} rootId={sidebarRootId} />
        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-blue-200 hidden md:block"
          onMouseDown={onSidebarResizeStart}
          aria-label="Resize sidebar"
          role="separator"
        />

        {/* Main area */}
        <div className="flex-1 min-w-0 p-3 overflow-x-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="truncate">
                {breadcrumbs.length === 0 ? (
                  <button onClick={() => setActiveParentId(null)} className="hover:underline">My Folder</button>
                ) : (
                  <>
                    <button onClick={() => setActiveParentId(null)} className="hover:underline text-gray-600">My Folder</button>
                    <span className="text-gray-400"> / </span>
                    {breadcrumbs.map((b, i) => (
                      <button key={b.id} onClick={() => setActiveParentId(b.id)} className="hover:underline">
                        {b.folderName || b.title}{i < breadcrumbs.length - 1 ? ' / ' : ''}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 bg-white border rounded-full px-2 py-1">
                  <span className="text-xs text-gray-700 whitespace-nowrap">{selectedIds.size} selected</span>
                  <div className="w-px h-4 bg-gray-200" />
                  <button
                    className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-gray-200"
                    onClick={clearSelection}
                  >Clear</button>
                  <button
                    className="px-2 py-1 text-xs rounded-full bg-red-600 text-white hover:bg-red-700"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${selectedIds.size} item(s)?`)) return;
                      try {
                        await assetsService.bulkOperation({ operation: 'delete', assetIds: Array.from(selectedIds) });
                        clearSelection();
                        await load();
                      } catch (e) { console.error('Bulk delete failed', e); }
                    }}
                  >Delete</button>
                  <button
                    className="px-2 py-1 text-xs rounded-full bg-red-700 text-white hover:bg-red-800"
                    onClick={async () => {
                      if (!window.confirm(`Permanently delete ${selectedIds.size} item(s) and remove from RAG? This cannot be undone.`)) return;
                      try {
                        await assetsService.bulkOperation({ operation: 'purge', assetIds: Array.from(selectedIds) });
                        clearSelection();
                        await load();
                      } catch (e) { console.error('Bulk purge failed', e); }
                    }}
                  >Purge</button>
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesChosen} />
              <button onClick={onCreateFolder} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 flex items-center gap-1">
                <PlusIcon className="w-4 h-4"/> New folder
              </button>
              <button onClick={onUploadClick} className="px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                <CloudArrowUpIcon className="w-4 h-4"/> Upload
              </button>
            </div>
          </div>

          {/* Removed top 'My Folder' folder-cards section per UX feedback */}

          {/* File list or grid (Projects tab uses the same list/grid, but section title updates) */}
          {view === 'list' ? (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-3 border-b text-sm font-semibold">{activeTab?.kind === 'projects' ? 'Projects' : 'My Folder'}</div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead className="text-xs text-gray-500 bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && selectedIds.size === items.length}
                          indeterminate={String(selectedIds.size > 0 && selectedIds.size < items.length)}
                          onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()}
                        />
                      </th>
                      <th className="px-2 py-2 font-medium select-none w-10">{sortBy === 'custom' ? 'Drag' : ''}</th>
                      <th className="text-left px-3 py-2 font-medium cursor-pointer select-none w-auto" onClick={() => handleHeaderSort('title')}>
                        Name{renderSortMark('title')}
                      </th>
                      <th className="text-left px-3 py-2 font-medium cursor-pointer select-none w-[110px] whitespace-nowrap" onClick={() => handleHeaderSort('type')}>
                        Type{renderSortMark('type')}
                      </th>
                      <th className="text-left px-3 py-2 font-medium cursor-pointer select-none w-[90px] whitespace-nowrap" onClick={() => handleHeaderSort('fileSize')}>
                        Size{renderSortMark('fileSize')}
                      </th>
                      <th className="text-left px-3 py-2 font-medium cursor-pointer select-none w-[160px] whitespace-nowrap" onClick={() => handleHeaderSort('updatedAt')}>
                        Last updated{renderSortMark('updatedAt')}
                      </th>
                      <th className="text-right px-3 py-2 font-medium w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td className="px-3 py-4 text-gray-500" colSpan={6}>Loading…</td></tr>
                    )}
                    {!loading && items.length === 0 && (
                      <tr><td className="px-3 py-6 text-gray-400" colSpan={6}>No items</td></tr>
                    )}
                    {!loading && items.length > 0 && (
                      <>
                        {items.map((it) => (
                          <FileRow
                            key={it.id}
                            item={it}
                            onOpen={openItem}
                            onContext={openContext}
                            onReorder={handleReorder}
                            sortBy={sortBy}
                            onBeginReorder={() => { if (sortBy !== 'custom') setSortBy('custom'); }}
                            isProjectsTab={activeTab?.kind === 'projects'}
                            projects={projects}
                            isSelected={isSelected(it.id)}
                            onToggleSelect={() => toggleSelect(it.id)}
                            goToProjectDocuments={goToProjectDocuments}
                          />
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Central Drag & Drop zone */}
              <div className="col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-6">
                <div
                  className="w-full border-2 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors p-8 flex flex-col items-center justify-center text-center cursor-pointer"
                  onClick={onUploadClick}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onMainDrop}
                  title="Drag & Drop files here or click to upload"
                >
                  <FolderIcon className="w-10 h-10 text-yellow-500 mb-2" />
                  <div className="font-semibold">Drag & Drop Files Here</div>
                  <div className="text-xs text-gray-500">or click "Upload Files" to browse</div>
                </div>
              </div>
              {/* Folders grid */}
              {folders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} onOpen={openItem} onContext={openContext} />
              ))}
              {files.map((it) => (
                <div
                  key={it.id}
                  className={`relative group bg-white border rounded-lg p-3 hover:shadow-sm hover:border-blue-200 transition-colors ${sortBy === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/asset-id', it.id);
                    // Always allow reorder and auto-switch to custom for seamless behavior
                    e.dataTransfer.setData('text/reorder-id', it.id);
                    if (sortBy !== 'custom') setSortBy('custom');
                  }}
                  onDragOver={(e) => {
                    const isReorder = e.dataTransfer?.types?.includes('text/reorder-id');
                    if (sortBy === 'custom' && isReorder) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    const reorderId = e.dataTransfer.getData('text/reorder-id');
                    if (sortBy === 'custom' && reorderId) {
                      e.preventDefault();
                      if (reorderId !== it.id) handleReorder(reorderId, it.id);
                      return;
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label="Select"
                    className="absolute top-2 left-2 w-4 h-4 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    checked={isSelected(it.id)}
                    onChange={() => toggleSelect(it.id)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DocumentIcon className="w-5 h-5 text-gray-400"/>
                      <button
                        className="text-left text-sm hover:underline truncate block max-w-[60vw] md:max-w-[26ch]"
                        title={it.title}
                        onClick={() => openItem(it)}
                      >{it.title}</button>
                    </div>
                    <button onClick={(e) => openContext(e, it)}>
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-2">
                    <span>{humanSize(it.fileSize || 0)}</span>
                    <span>•</span>
                    <span>{new Date(it.updatedAt || it.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Context menu */}
          {menu.open && (
            <div className="fixed inset-0 z-40" onClick={closeMenu}>
              <div className="absolute bg-white border shadow-md rounded-md text-sm z-50 max-h-[70vh] overflow-y-auto w-[260px] max-w-[90vw]" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doPreview}>Preview</button>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doPreview}>Open with…</button>
                {menu.item?.type === 'FOLDER' && (
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => { addTab(menu.item.title || menu.item.folderName || 'Workspace', menu.item.id); closeMenu(); }}
                  >
                    Open in new tab
                  </button>
                )}
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doRename}>Rename</button>
                {menu.item?.type !== 'FOLDER' && (
                  <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doDownload}>Download</button>
                )}
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={doDelete}>Delete</button>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-700" onClick={doPurge}>Purge (hard delete)</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
