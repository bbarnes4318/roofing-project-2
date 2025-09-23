import React, { useEffect, useMemo, useRef, useState } from 'react';
import { assetsService } from '../../services/assetsService';
import { FolderIcon, DocumentIcon, EllipsisVerticalIcon, ArrowLeftIcon, PlusIcon, MagnifyingGlassIcon, CloudArrowUpIcon, Squares2X2Icon, Bars3Icon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; let b = Math.max(bytes, 0);
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${Math.round(b)}${units[i]}`;
}

const Sidebar = ({ onUploadClick, onCreateFolder }) => {
  return (
    <div className="col-span-12 md:col-span-3 lg:col-span-2 border-r bg-white p-3 hidden md:flex md:flex-col">
      <div className="mb-3">
        <button onClick={onUploadClick} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
          <CloudArrowUpIcon className="w-4 h-4" />
          <span>Upload file</span>
        </button>
      </div>
      <nav className="space-y-1">
        <button className="w-full text-left px-3 py-2 rounded-md bg-blue-50 text-blue-700 font-medium">My Files</button>
        <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">Shared with me</button>
        <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">Starred</button>
        <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">Trash</button>
        <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50">Setting</button>
      </nav>
      <div className="mt-auto pt-4">
        <div className="text-xs text-gray-500 mb-2">Storage Details</div>
        <div className="h-2 bg-gray-100 rounded">
          <div className="h-2 bg-blue-500 rounded" style={{ width: '26%' }} />
        </div>
        <div className="text-[11px] text-gray-500 mt-1">4 GB of 15 GB Used</div>
        <button onClick={onCreateFolder} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200">
          <PlusIcon className="w-4 h-4" />
          <span>New folder</span>
        </button>
      </div>
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
        if (typeof window?.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('fm:refresh'));
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

const FileRow = ({ item, onOpen, onContext }) => {
  const isFolder = item.type === 'FOLDER';
  return (
    <tr className="border-b hover:bg-gray-50" draggable onDragStart={(e) => e.dataTransfer.setData('text/asset-id', item.id)} onContextMenu={(e) => { e.preventDefault(); onContext?.(e, item); }}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {isFolder ? <FolderIcon className="w-5 h-5 text-yellow-500"/> : <DocumentIcon className="w-5 h-5 text-gray-400"/>}
          <button className="text-sm text-left text-gray-800 hover:underline" onClick={() => onOpen(item)}>{item.title || item.folderName}</button>
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">{new Date(item.updatedAt || item.createdAt).toLocaleString()}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{isFolder ? '-' : humanSize(item.fileSize || 0)}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{item.uploadedBy ? `${item.uploadedBy.firstName || ''} ${item.uploadedBy.lastName || ''}`.trim() : '—'}</td>
      <td className="px-3 py-2 text-xs text-gray-500">—</td>
      <td className="px-3 py-2 text-right">
        <button onClick={(e) => onContext?.(e, item)}>
          <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 inline" />
        </button>
      </td>
    </tr>
  );
};

export default function FileManagerPage() {
  const [parentId, setParentId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, item: null });

  const folders = useMemo(() => items.filter(i => i.type === 'FOLDER'), [items]);
  const files = useMemo(() => items.filter(i => i.type !== 'FOLDER'), [items]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await assetsService.list({ parentId, search, limit: 100, sortBy, sortOrder });
      let assets = data?.assets || [];
      // Client-side sorting for Owner if requested (backend does not support owner sort)
      if (sortBy === 'owner') {
        assets = [...assets].sort((a, b) => {
          const an = (a.uploadedBy?.firstName || '') + (a.uploadedBy?.lastName || '');
          const bn = (b.uploadedBy?.firstName || '') + (b.uploadedBy?.lastName || '');
          return sortOrder === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
        });
      }
      setItems(assets);
      setBreadcrumbs(data?.breadcrumbs || []);
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
      setParentId(item.id);
      return;
    }
    // Authenticated open in new tab (sends Authorization header)
    assetsService.openInNewTab(item.id);
  };

  const goUp = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) { setParentId(null); return; }
    const bc = [...breadcrumbs];
    bc.pop();
    setParentId(bc.length ? bc[bc.length - 1].id : null);
  };

  const onUploadClick = () => fileInputRef.current?.click();

  const onFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
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
      await assetsService.createFolder({ name, parentId });
      await load();
    } catch (err) { console.error(err); }
  };

  // Drag-and-drop upload on main area
  const onMainDragOver = (e) => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  };
  const onMainDrop = async (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    try {
      const files = Array.from(e.dataTransfer.files);
      await assetsService.uploadFiles({ files, parentId });
      await load();
    } catch (err) { console.error('DnD upload failed', err); }
  };

  // Context menu actions
  const openContext = (e, item) => {
    const rect = e.currentTarget?.getBoundingClientRect?.();
    const x = rect ? rect.left : e.clientX;
    const y = rect ? rect.bottom : e.clientY;
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder="Search anything here"
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1">
            <button onClick={() => setView('grid')} className={`p-2 rounded-md ${view==='grid' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} title="Grid view">
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button onClick={() => setView('list')} className={`p-2 rounded-md ${view==='list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} title="List view">
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
          {/* Sorting */}
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-2 text-sm border rounded-md">
              <option value="updatedAt">Modified</option>
              <option value="fileSize">Size</option>
              <option value="owner">Owner</option>
              <option value="title">Name</option>
            </select>
            <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-2 py-2 text-sm border rounded-md flex items-center gap-1">
              <ChevronUpDownIcon className="w-4 h-4" />
              {sortOrder.toUpperCase()}
            </button>
          </div>
          <button onClick={load} className="px-3 py-2 text-sm bg-gray-100 rounded-md">Refresh</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-0">
        <Sidebar onUploadClick={onUploadClick} onCreateFolder={onCreateFolder} />

        {/* Main area */}
        <div className="col-span-12 md:col-span-9 lg:col-span-10 p-4">
          {/* Breadcrumbs + Up */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={goUp} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
                <ArrowLeftIcon className="w-4 h-4"/> Up
              </button>
              <div className="truncate">
                {breadcrumbs.length === 0 ? (
                  <span>My Folder</span>
                ) : (
                  <>
                    <span className="text-gray-400">My Folder / </span>
                    {breadcrumbs.map((b, i) => (
                      <button key={b.id} onClick={() => setParentId(b.id)} className="hover:underline">
                        {b.folderName || b.title}{i < breadcrumbs.length - 1 ? ' / ' : ''}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesChosen} />
              <button onClick={onCreateFolder} className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 flex items-center gap-1">
                <PlusIcon className="w-4 h-4"/> New folder
              </button>
              <button onClick={onUploadClick} className="px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                <CloudArrowUpIcon className="w-4 h-4"/> Upload
              </button>
            </div>
          </div>

          {/* Folder cards */}
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold">My Folder</div>
            <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'flex gap-3 overflow-x-auto pb-1'}>
              {folders.length === 0 && <div className="text-sm text-gray-400">No folders yet.</div>}
              {folders.map((f) => (
                <FolderCard key={f.id} folder={f} onOpen={openItem} onContext={openContext} />
              ))}
            </div>
          </div>

          {/* File list or grid */}
          {view === 'list' ? (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-3 border-b text-sm font-semibold">My Folder</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-gray-500 bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Last modified</th>
                      <th className="text-left px-3 py-2 font-medium">Size</th>
                      <th className="text-left px-3 py-2 font-medium">Owner</th>
                      <th className="text-left px-3 py-2 font-medium">Members</th>
                      <th className="text-right px-3 py-2 font-medium">Actions</th>
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
                          <FileRow key={it.id} item={it} onOpen={openItem} onContext={openContext} />
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {files.map((it) => (
                <div key={it.id} className="bg-white border rounded-lg p-3 hover:shadow-sm" draggable onDragStart={(e) => e.dataTransfer.setData('text/asset-id', it.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DocumentIcon className="w-5 h-5 text-gray-400"/>
                      <button className="text-left text-sm hover:underline" onClick={() => openItem(it)}>{it.title}</button>
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
              <div className="absolute bg-white border shadow-md rounded-md text-sm z-50" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doPreview}>Preview</button>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doPreview}>Open with…</button>
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doRename}>Rename</button>
                {menu.item?.type !== 'FOLDER' && (
                  <button className="block w-full text-left px-3 py-2 hover:bg-gray-50" onClick={doDownload}>Download</button>
                )}
                <button className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={doDelete}>Delete</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
