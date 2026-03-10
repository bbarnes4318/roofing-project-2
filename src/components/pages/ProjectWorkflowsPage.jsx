import React, { useState, useEffect, useReducer, useRef, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H_PHASE = 64;
const NODE_H_SECTION = 56;
const NODE_H_ITEM = 48;
const PORT_R = 7;
const GRID_SNAP = 20;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const AUTO_LAYOUT_GAP_X = 280;
const AUTO_LAYOUT_GAP_Y = 100;

const nodeHeight = (type) => {
  if (type === 'phase') return NODE_H_PHASE;
  if (type === 'section') return NODE_H_SECTION;
  return NODE_H_ITEM;
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
const initialState = {
  nodes: [],
  connections: [],
  viewport: { panX: 60, panY: 60, zoom: 1 },
  selectedNodeId: null,
  selectedConnectionId: null,
  pendingConnection: null, // { fromNodeId }
  nextNodeId: 1,
  nextConnId: 1,
};

function flowReducer(state, action) {
  switch (action.type) {
    case 'ADD_NODE': {
      const id = `node-${state.nextNodeId}`;
      return {
        ...state,
        nodes: [...state.nodes, { id, ...action.payload, position: action.payload.position || { x: 100, y: 100 } }],
        nextNodeId: state.nextNodeId + 1,
        selectedNodeId: id,
      };
    }
    case 'MOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.id ? { ...n, position: { x: Math.round(action.x / GRID_SNAP) * GRID_SNAP, y: Math.round(action.y / GRID_SNAP) * GRID_SNAP } } : n
        ),
      };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.id, selectedConnectionId: null, pendingConnection: null };
    case 'SELECT_CONNECTION':
      return { ...state, selectedConnectionId: action.id, selectedNodeId: null, pendingConnection: null };
    case 'DESELECT':
      return { ...state, selectedNodeId: null, selectedConnectionId: null, pendingConnection: null };
    case 'START_CONNECTION':
      return { ...state, pendingConnection: { fromNodeId: action.fromNodeId } };
    case 'COMPLETE_CONNECTION': {
      const { fromNodeId } = state.pendingConnection || {};
      const toNodeId = action.toNodeId;
      if (!fromNodeId || fromNodeId === toNodeId) return { ...state, pendingConnection: null };
      const exists = state.connections.some(c => c.fromNodeId === fromNodeId && c.toNodeId === toNodeId);
      if (exists) return { ...state, pendingConnection: null };
      const id = `conn-${state.nextConnId}`;
      return {
        ...state,
        connections: [...state.connections, { id, fromNodeId, toNodeId }],
        nextConnId: state.nextConnId + 1,
        pendingConnection: null,
        selectedConnectionId: id,
      };
    }
    case 'CANCEL_CONNECTION':
      return { ...state, pendingConnection: null };
    case 'DELETE_NODE': {
      const nodeId = action.id;
      return {
        ...state,
        nodes: state.nodes.filter(n => n.id !== nodeId),
        connections: state.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    }
    case 'DELETE_CONNECTION':
      return {
        ...state,
        connections: state.connections.filter(c => c.id !== action.id),
        selectedConnectionId: null,
      };
    case 'SET_VIEWPORT':
      return { ...state, viewport: { ...state.viewport, ...action.payload } };
    case 'ZOOM': {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.viewport.zoom + action.delta));
      return { ...state, viewport: { ...state.viewport, zoom: newZoom } };
    }
    case 'FIT_VIEW': {
      if (state.nodes.length === 0) return state;
      const xs = state.nodes.map(n => n.position.x);
      const ys = state.nodes.map(n => n.position.y);
      const minX = Math.min(...xs) - 40;
      const minY = Math.min(...ys) - 40;
      const maxX = Math.max(...xs) + NODE_W + 40;
      const maxY = Math.max(...ys) + NODE_H_PHASE + 40;
      const cw = action.canvasW || 800;
      const ch = action.canvasH || 600;
      const zoom = Math.min(1.5, Math.min(cw / (maxX - minX), ch / (maxY - minY)));
      return { ...state, viewport: { panX: -minX * zoom + 20, panY: -minY * zoom + 20, zoom } };
    }
    case 'AUTO_LAYOUT': {
      if (state.nodes.length === 0) return state;
      // group by type: phases first, then sections, then items
      const phases = state.nodes.filter(n => n.nodeType === 'phase');
      const sections = state.nodes.filter(n => n.nodeType === 'section');
      const items = state.nodes.filter(n => n.nodeType === 'item');
      const groups = [phases, sections, items];
      const laid = [];
      let yOff = 40;
      groups.forEach(group => {
        if (group.length === 0) return;
        group.forEach((node, ci) => {
          laid.push({ ...node, position: { x: 40 + ci * AUTO_LAYOUT_GAP_X, y: yOff } });
        });
        yOff += AUTO_LAYOUT_GAP_Y + 20;
      });
      // keep any nodes that somehow weren't in groups
      const laidIds = new Set(laid.map(n => n.id));
      const rest = state.nodes.filter(n => !laidIds.has(n.id)).map((n, i) => ({
        ...n, position: { x: 40 + i * AUTO_LAYOUT_GAP_X, y: yOff }
      }));
      return { ...state, nodes: [...laid, ...rest] };
    }
    case 'CLEAR':
      return { ...initialState, viewport: state.viewport };
    case 'LOAD_STATE':
      return { ...action.payload, viewport: state.viewport };
    default:
      return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPortCenter(node, which) {
  const h = nodeHeight(node.nodeType);
  if (which === 'out') return { x: node.position.x + NODE_W / 2, y: node.position.y + h };
  return { x: node.position.x + NODE_W / 2, y: node.position.y };
}

function bezierPath(x1, y1, x2, y2) {
  const dy = Math.abs(y2 - y1);
  const cp = Math.max(40, dy * 0.45);
  return `M${x1},${y1} C${x1},${y1 + cp} ${x2},${y2 - cp} ${x2},${y2}`;
}

const typeColors = {
  phase: { bg: 'var(--color-brand-aqua-blue)', text: '#fff', border: 'var(--color-brand-deep-teal)', badge: 'Phase' },
  section: { bg: '#0d9488', text: '#fff', border: '#0f766e', badge: 'Section' },
  item: { bg: 'var(--color-surface-white)', text: 'var(--color-text-charcoal)', border: 'var(--color-border-silver)', badge: 'Item' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════
const ProjectWorkflowsPage = ({ colorMode }) => {
  const [state, dispatch] = useReducer(flowReducer, initialState);
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const isDraggingNode = useRef(false);
  const dragNodeOffset = useRef({ x: 0, y: 0 });
  const dragNodeId = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Source panel
  const [systemWorkflows, setSystemWorkflows] = useState([]);
  const [customWorkflows, setCustomWorkflows] = useState([]);
  const [expandedSources, setExpandedSources] = useState({});
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourcePanelOpen, setSourcePanelOpen] = useState(true);

  // Save state
  const [workflowName, setWorkflowName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // ─── Fetch workflows ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

        const [sysResp, cwResp] = await Promise.all([
          fetch(`${API_BASE_URL}/workflow-data/full-structure`, { headers }),
          fetch(`${API_BASE_URL}/workflow-data/custom-workflows`, { headers }),
        ]);

        if (sysResp.ok) {
          const d = await sysResp.json();
          if (d.success) setSystemWorkflows(d.data || []);
        }
        if (cwResp.ok) {
          const d = await cwResp.json();
          if (d.success) setCustomWorkflows(d.data || []);
        }
      } catch (err) {
        console.error('Error fetching workflows:', err);
      }
    };
    fetchAll();
  }, [saveSuccess]);

  // ─── Build source tree ──────────────────────────────────────────────────────
  const sourceTree = useMemo(() => {
    const tree = [];

    systemWorkflows.forEach(phase => {
      const phaseNode = {
        id: phase.id,
        label: phase.label || phase.name,
        type: 'phase',
        origin: 'System',
        children: [],
      };
      (phase.items || []).forEach(section => {
        const sectionNode = {
          id: section.id || `sec-${phase.id}-${section.label}`,
          label: section.label,
          type: 'section',
          origin: `System: ${phase.label}`,
          children: [],
        };
        (section.subtasks || []).forEach(li => {
          sectionNode.children.push({
            id: li.id,
            label: li.label,
            type: 'item',
            origin: `${phase.label} → ${section.label}`,
            role: li.responsibleRole || '',
          });
        });
        phaseNode.children.push(sectionNode);
      });
      tree.push(phaseNode);
    });

    customWorkflows.forEach(cw => {
      const cwNode = {
        id: cw.id,
        label: cw.name,
        type: 'phase',
        origin: 'Custom',
        children: [],
      };
      (cw.phases || []).forEach(phase => {
        (phase.sections || []).forEach(section => {
          const sNode = {
            id: section.id || `csec-${cw.id}-${section.sectionName}`,
            label: section.displayName || section.sectionName,
            type: 'section',
            origin: `Custom: ${cw.name}`,
            children: [],
          };
          (section.lineItems || []).forEach(li => {
            sNode.children.push({
              id: li.id,
              label: li.itemName,
              type: 'item',
              origin: `${cw.name} → ${section.displayName || section.sectionName}`,
              role: li.responsibleRole || '',
            });
          });
          cwNode.children.push(sNode);
        });
      });
      tree.push(cwNode);
    });

    return tree;
  }, [systemWorkflows, customWorkflows]);

  // ─── Add node from source panel ─────────────────────────────────────────────
  const addNodeFromSource = useCallback((item) => {
    // Find an open spot
    const occupied = new Set(state.nodes.map(n => `${n.position.x},${n.position.y}`));
    let x = 300, y = 80;
    while (occupied.has(`${x},${y}`)) { y += 100; }

    dispatch({
      type: 'ADD_NODE',
      payload: {
        nodeType: item.type,
        label: item.label,
        sourceId: item.id,
        origin: item.origin || '',
        role: item.role || '',
        position: { x, y },
      },
    });
  }, [state.nodes]);

  // ─── Canvas mouse handlers ──────────────────────────────────────────────────
  const screenToCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - state.viewport.panX) / state.viewport.zoom,
      y: (clientY - rect.top - state.viewport.panY) / state.viewport.zoom,
    };
  }, [state.viewport]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current || e.target === svgRef.current || e.target.classList.contains('flow-canvas-bg')) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - state.viewport.panX, y: e.clientY - state.viewport.panY };
      dispatch({ type: 'DESELECT' });
      e.preventDefault();
    }
  }, [state.viewport]);

  const handleCanvasMouseMove = useCallback((e) => {
    const cp = screenToCanvas(e.clientX, e.clientY);
    mousePos.current = cp;
    if (state.pendingConnection) setCursorPos(cp);

    if (isPanning.current) {
      dispatch({
        type: 'SET_VIEWPORT',
        payload: { panX: e.clientX - panStart.current.x, panY: e.clientY - panStart.current.y },
      });
      return;
    }

    if (isDraggingNode.current && dragNodeId.current) {
      dispatch({
        type: 'MOVE_NODE',
        id: dragNodeId.current,
        x: cp.x - dragNodeOffset.current.x,
        y: cp.y - dragNodeOffset.current.y,
      });
    }
  }, [state.pendingConnection, screenToCanvas]);

  const handleCanvasMouseUp = useCallback(() => {
    isPanning.current = false;
    isDraggingNode.current = false;
    dragNodeId.current = null;
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    dispatch({ type: 'ZOOM', delta: e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP });
  }, []);

  // ─── Node mouse handlers ───────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const cp = screenToCanvas(e.clientX, e.clientY);
    isDraggingNode.current = true;
    dragNodeId.current = nodeId;
    dragNodeOffset.current = { x: cp.x - node.position.x, y: cp.y - node.position.y };
    dispatch({ type: 'SELECT_NODE', id: nodeId });
  }, [state.nodes, screenToCanvas]);

  // ─── Port handlers ─────────────────────────────────────────────────────────
  const handleOutputPortClick = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (state.pendingConnection) {
      dispatch({ type: 'CANCEL_CONNECTION' });
    } else {
      dispatch({ type: 'START_CONNECTION', fromNodeId: nodeId });
    }
  }, [state.pendingConnection]);

  const handleInputPortClick = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (state.pendingConnection) {
      dispatch({ type: 'COMPLETE_CONNECTION', toNodeId: nodeId });
    }
  }, [state.pendingConnection]);

  // ─── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (state.selectedConnectionId) {
          dispatch({ type: 'DELETE_CONNECTION', id: state.selectedConnectionId });
        } else if (state.selectedNodeId) {
          dispatch({ type: 'DELETE_NODE', id: state.selectedNodeId });
        }
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'CANCEL_CONNECTION' });
        dispatch({ type: 'DESELECT' });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state.selectedNodeId, state.selectedConnectionId]);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!workflowName.trim()) { setSaveError('Please enter a workflow name.'); return; }
    // Collect all item-type nodes in connection order (or all nodes if no connections)
    const itemNodes = state.nodes.filter(n => n.nodeType === 'item');
    if (itemNodes.length === 0) { setSaveError('Add at least one line item node to save.'); return; }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const resp = await fetch(`${API_BASE_URL}/workflow-data/custom-workflows/combine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          name: workflowName.trim(),
          description: `Flow built with ${state.nodes.length} nodes and ${state.connections.length} connections`,
          items: itemNodes.map((node, idx) => ({ lineItemId: node.sourceId, displayOrder: idx + 1 })),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setSaveSuccess(`Workflow "${workflowName}" saved with ${itemNodes.length} items!`);
          setWorkflowName('');
        } else {
          setSaveError(data.message || 'Failed to save.');
        }
      } else {
        setSaveError('Server error. Please try again.');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle source expand ──────────────────────────────────────────────────
  const toggleExpand = (id) => setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Selected node data ────────────────────────────────────────────────────
  const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId);
  const selectedConnsIn = state.connections.filter(c => c.toNodeId === state.selectedNodeId);
  const selectedConnsOut = state.connections.filter(c => c.fromNodeId === state.selectedNodeId);

  // ─── Filter source tree ────────────────────────────────────────────────────
  const filterTree = (nodes, q) => {
    if (!q) return nodes;
    const lq = q.toLowerCase();
    return nodes.reduce((acc, node) => {
      const match = node.label.toLowerCase().includes(lq);
      const filteredChildren = node.children ? filterTree(node.children, q) : [];
      if (match || filteredChildren.length > 0) {
        acc.push({ ...node, children: match ? node.children : filteredChildren });
      }
      return acc;
    }, []);
  };
  const filteredTree = filterTree(sourceTree, sourceSearch);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flow-builder-page">
      {/* ────── Toolbar ────── */}
      <div className="flow-toolbar">
        <div className="flow-toolbar-left">
          <h1 className="flow-toolbar-title">Project Workflows</h1>
          <span className="flow-toolbar-sep" />
          <input
            type="text"
            value={workflowName}
            onChange={e => setWorkflowName(e.target.value)}
            placeholder="Workflow name…"
            className="flow-toolbar-input"
          />
          <button
            onClick={handleSave}
            disabled={saving || !workflowName.trim()}
            className="flow-toolbar-save"
          >
            {saving ? (
              <><span className="flow-spinner" /> Saving…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Save Workflow
              </>
            )}
          </button>
        </div>
        <div className="flow-toolbar-right">
          <button className="flow-tool-btn" title="Zoom In" onClick={() => dispatch({ type: 'ZOOM', delta: ZOOM_STEP })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
          <span className="flow-zoom-label">{Math.round(state.viewport.zoom * 100)}%</span>
          <button className="flow-tool-btn" title="Zoom Out" onClick={() => dispatch({ type: 'ZOOM', delta: -ZOOM_STEP })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
          </button>
          <button className="flow-tool-btn" title="Fit to View" onClick={() => dispatch({ type: 'FIT_VIEW', canvasW: canvasRef.current?.clientWidth, canvasH: canvasRef.current?.clientHeight })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
          </button>
          <span className="flow-toolbar-sep" />
          <button className="flow-tool-btn" title="Auto Layout" onClick={() => dispatch({ type: 'AUTO_LAYOUT' })}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>
          </button>
          <button className="flow-tool-btn flow-tool-btn--danger" title="Clear Canvas" onClick={() => { if (window.confirm('Clear all nodes and connections?')) dispatch({ type: 'CLEAR' }); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Feedback */}
      {saveSuccess && (
        <div className="flow-feedback flow-feedback--success">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {saveSuccess}
          <button onClick={() => setSaveSuccess('')} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {saveError && (
        <div className="flow-feedback flow-feedback--error">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {saveError}
          <button onClick={() => setSaveError('')} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flow-body">
        {/* ────── Source Panel ────── */}
        <div className={`flow-source-panel ${sourcePanelOpen ? '' : 'flow-source-panel--collapsed'}`}>
          <div className="flow-source-header">
            <button className="flow-source-toggle" onClick={() => setSourcePanelOpen(p => !p)} title={sourcePanelOpen ? 'Collapse' : 'Expand'}>
              <svg className={`w-4 h-4 transition-transform ${sourcePanelOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            {sourcePanelOpen && <span className="flow-source-title">Components</span>}
          </div>

          {sourcePanelOpen && (
            <>
              <div className="flow-source-search">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input
                  type="text"
                  placeholder="Search…"
                  value={sourceSearch}
                  onChange={e => setSourceSearch(e.target.value)}
                  className="flow-source-search-input"
                />
              </div>
              <div className="flow-source-list custom-scrollbar">
                {filteredTree.length === 0 && (
                  <p className="flow-source-empty">No workflows found.</p>
                )}
                {filteredTree.map(phase => (
                  <SourceTreeNode
                    key={phase.id}
                    node={phase}
                    depth={0}
                    expanded={expandedSources}
                    onToggle={toggleExpand}
                    onAdd={addNodeFromSource}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ────── Canvas ────── */}
        <div
          ref={canvasRef}
          className={`flow-canvas ${state.pendingConnection ? 'flow-canvas--connecting' : ''}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="flow-canvas-inner"
            style={{
              transform: `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`,
            }}
          >
            {/* Grid background */}
            <div className="flow-canvas-bg" />

            {/* SVG connections layer */}
            <svg ref={svgRef} className="flow-svg-layer">
              {state.connections.map(conn => {
                const from = state.nodes.find(n => n.id === conn.fromNodeId);
                const to = state.nodes.find(n => n.id === conn.toNodeId);
                if (!from || !to) return null;
                const p1 = getPortCenter(from, 'out');
                const p2 = getPortCenter(to, 'in');
                const selected = state.selectedConnectionId === conn.id;
                return (
                  <g key={conn.id} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SELECT_CONNECTION', id: conn.id }); }} className="flow-connection-group">
                    {/* Wider invisible hitbox */}
                    <path d={bezierPath(p1.x, p1.y, p2.x, p2.y)} fill="none" stroke="transparent" strokeWidth={16} className="cursor-pointer" />
                    <path
                      d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                      className={`flow-connection-path ${selected ? 'flow-connection-path--selected' : ''}`}
                    />
                    {selected && (
                      <circle cx={(p1.x + p2.x) / 2} cy={(p1.y + p2.y) / 2 + 5} r={8} className="flow-connection-delete-dot" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_CONNECTION', id: conn.id }); }} />
                    )}
                  </g>
                );
              })}

              {/* Pending connection line */}
              {state.pendingConnection && (() => {
                const from = state.nodes.find(n => n.id === state.pendingConnection.fromNodeId);
                if (!from) return null;
                const p1 = getPortCenter(from, 'out');
                return (
                  <path
                    d={bezierPath(p1.x, p1.y, cursorPos.x, cursorPos.y)}
                    className="flow-connection-pending"
                  />
                );
              })()}
            </svg>

            {/* Nodes layer */}
            {state.nodes.map(node => {
              const colors = typeColors[node.nodeType] || typeColors.item;
              const h = nodeHeight(node.nodeType);
              const isSelected = state.selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={`flow-node flow-node--${node.nodeType} ${isSelected ? 'flow-node--selected' : ''}`}
                  style={{
                    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                    width: NODE_W,
                    height: h,
                    '--node-bg': colors.bg,
                    '--node-text': colors.text,
                    '--node-border': colors.border,
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {/* Input port */}
                  <div
                    className={`flow-port flow-port--in ${state.pendingConnection ? 'flow-port--active' : ''}`}
                    onClick={(e) => handleInputPortClick(e, node.id)}
                  >
                    <div className="flow-port-dot" />
                  </div>

                  {/* Node content */}
                  <div className="flow-node-content">
                    <span className="flow-node-badge" style={{ background: node.nodeType === 'item' ? 'var(--color-brand-aqua-blue-light-tint)' : 'rgba(255,255,255,0.2)', color: node.nodeType === 'item' ? 'var(--color-brand-aqua-blue)' : '#fff' }}>
                      {colors.badge}
                    </span>
                    <span className="flow-node-label">{node.label}</span>
                  </div>

                  {/* Output port */}
                  <div
                    className="flow-port flow-port--out"
                    onClick={(e) => handleOutputPortClick(e, node.id)}
                  >
                    <div className="flow-port-dot" />
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {state.nodes.length === 0 && (
              <div className="flow-empty-state">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <p className="flow-empty-title">Build your workflow</p>
                <p className="flow-empty-sub">Click <strong>+</strong> on components in the left panel to add nodes, then connect them by clicking the ports.</p>
              </div>
            )}
          </div>
        </div>

        {/* ────── Properties Panel ────── */}
        <div className={`flow-props-panel ${selectedNode ? 'flow-props-panel--open' : ''}`}>
          {selectedNode ? (
            <>
              <div className="flow-props-header">
                <h3 className="flow-props-title">Properties</h3>
                <button className="flow-tool-btn" onClick={() => dispatch({ type: 'DESELECT' })}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flow-props-body custom-scrollbar">
                <div className="flow-props-row">
                  <span className="flow-props-label">Name</span>
                  <span className="flow-props-value">{selectedNode.label}</span>
                </div>
                <div className="flow-props-row">
                  <span className="flow-props-label">Type</span>
                  <span className={`flow-type-badge flow-type-badge--${selectedNode.nodeType}`}>
                    {typeColors[selectedNode.nodeType]?.badge || 'Node'}
                  </span>
                </div>
                {selectedNode.origin && (
                  <div className="flow-props-row">
                    <span className="flow-props-label">Origin</span>
                    <span className="flow-props-value flow-props-value--sm">{selectedNode.origin}</span>
                  </div>
                )}
                {selectedNode.role && (
                  <div className="flow-props-row">
                    <span className="flow-props-label">Role</span>
                    <span className="flow-props-value">{selectedNode.role}</span>
                  </div>
                )}
                <div className="flow-props-divider" />
                <div className="flow-props-row">
                  <span className="flow-props-label">Connections In</span>
                  <span className="flow-props-value">{selectedConnsIn.length}</span>
                </div>
                {selectedConnsIn.map(c => {
                  const from = state.nodes.find(n => n.id === c.fromNodeId);
                  return from ? (
                    <div key={c.id} className="flow-props-conn">
                      ← {from.label}
                    </div>
                  ) : null;
                })}
                <div className="flow-props-row">
                  <span className="flow-props-label">Connections Out</span>
                  <span className="flow-props-value">{selectedConnsOut.length}</span>
                </div>
                {selectedConnsOut.map(c => {
                  const to = state.nodes.find(n => n.id === c.toNodeId);
                  return to ? (
                    <div key={c.id} className="flow-props-conn">
                      → {to.label}
                    </div>
                  ) : null;
                })}
                <div className="flow-props-divider" />
                <button
                  className="flow-delete-btn"
                  onClick={() => dispatch({ type: 'DELETE_NODE', id: selectedNode.id })}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete Node
                </button>
              </div>
            </>
          ) : (
            <div className="flow-props-empty">
              <svg className="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
              <p>Select a node to view properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Source Tree Node ─────────────────────────────────────────────────────────
const SourceTreeNode = React.memo(({ node, depth, expanded, onToggle, onAdd }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.id];
  const typeLabel = node.type === 'phase' ? 'P' : node.type === 'section' ? 'S' : 'I';
  const typeClass = `flow-source-type flow-source-type--${node.type}`;

  return (
    <div className="flow-source-node">
      <div
        className="flow-source-row"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button className="flow-source-expand" onClick={() => onToggle(node.id)}>
            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        ) : (
          <span className="flow-source-expand-spacer" />
        )}
        <span className={typeClass}>{typeLabel}</span>
        <span className="flow-source-label" title={node.label}>{node.label}</span>
        <button className="flow-source-add" onClick={() => onAdd(node)} title="Add to canvas">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
      {hasChildren && isExpanded && (
        <div className="flow-source-children">
          {node.children.map(child => (
            <SourceTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default ProjectWorkflowsPage;
