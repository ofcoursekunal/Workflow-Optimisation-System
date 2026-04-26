/**
 * WorkflowEditor.jsx
 * Miro-style visual workflow editor for production plan steps.
 * Features:
 *  - Draggable step nodes
 *  - SVG dependency arrows (click node port → click another → creates edge)
 *  - Add / delete steps
 *  - Delete dependency edges
 *  - Read-only mode (readonly prop)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Trash2, GitBranch, GripVertical } from 'lucide-react';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const PORT_R = 7;

function generateId() {
    return `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function buildInitialLayout(steps) {
    // Topological sort for left-to-right layout
    const positions = {};
    const deps = {};
    steps.forEach(s => { deps[s.taskId] = s.dependsOn || []; });

    const visited = new Set();
    const col = {};

    function visit(id, depth) {
        if (col[id] >= (depth || 0)) return;
        col[id] = depth || 0;
        steps.filter(s => (s.dependsOn || []).includes(id)).forEach(s => visit(s.taskId, (depth || 0) + 1));
    }
    steps.forEach(s => {
        if (!deps[s.taskId] || deps[s.taskId].length === 0) visit(s.taskId, 0);
    });

    const byCol = {};
    steps.forEach(s => {
        const c = col[s.taskId] || 0;
        if (!byCol[c]) byCol[c] = [];
        byCol[c].push(s.taskId);
    });

    Object.entries(byCol).forEach(([c, ids]) => {
        ids.forEach((id, row) => {
            positions[id] = { x: 80 + Number(c) * 260, y: 80 + row * 120 };
        });
    });

    return positions;
}

export default function WorkflowEditor({ steps: initialSteps = [], readonly = false, onChange }) {
    const [nodes, setNodes] = useState(() => initialSteps.map(s => ({
        id: s.taskId,
        name: s.taskName || s.name || 'Step',
        duration: s.duration || s.avgMinutesPerUnit || 30,
        dependsOn: s.dependsOn || []
    })));

    const [positions, setPositions] = useState(() => buildInitialLayout(initialSteps));
    const [connecting, setConnecting] = useState(null); // source node id
    const [addingStep, setAddingStep] = useState(false);
    const [newStepForm, setNewStepForm] = useState({ name: '', duration: 30 });
    const [selectedEdge, setSelectedEdge] = useState(null); // {from, to}
    const svgRef = useRef(null);
    const dragging = useRef(null);

    // Sync back to parent
    useEffect(() => {
        if (!onChange) return;
        const result = nodes.map(n => ({
            taskId: n.id,
            taskName: n.name,
            duration: n.duration,
            dependsOn: n.dependsOn
        }));
        onChange(result);
    }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

    const startDrag = useCallback((e, nodeId) => {
        if (readonly) return;
        e.stopPropagation();
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        dragging.current = { nodeId, startX: e.clientX, startY: e.clientY, origPos: { ...positions[nodeId] } };

        const onMove = (ev) => {
            if (!dragging.current) return;
            const dx = ev.clientX - dragging.current.startX;
            const dy = ev.clientY - dragging.current.startY;
            setPositions(prev => ({
                ...prev,
                [dragging.current.nodeId]: {
                    x: Math.max(0, dragging.current.origPos.x + dx),
                    y: Math.max(0, dragging.current.origPos.y + dy)
                }
            }));
        };
        const onUp = () => {
            dragging.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [positions, readonly]);

    const handlePortClick = useCallback((e, nodeId) => {
        if (readonly) return;
        e.stopPropagation();
        if (!connecting) {
            setConnecting(nodeId);
        } else {
            if (connecting !== nodeId) {
                // Add dependency: nodeId depends on connecting
                setNodes(prev => prev.map(n =>
                    n.id === nodeId
                        ? { ...n, dependsOn: n.dependsOn.includes(connecting) ? n.dependsOn : [...n.dependsOn, connecting] }
                        : n
                ));
            }
            setConnecting(null);
        }
    }, [connecting, readonly]);

    const deleteEdge = useCallback((from, to) => {
        setNodes(prev => prev.map(n =>
            n.id === to ? { ...n, dependsOn: n.dependsOn.filter(d => d !== from) } : n
        ));
        setSelectedEdge(null);
    }, []);

    const deleteNode = useCallback((nodeId) => {
        setNodes(prev => prev.filter(n => n.id !== nodeId).map(n => ({
            ...n, dependsOn: n.dependsOn.filter(d => d !== nodeId)
        })));
        setPositions(prev => { const p = { ...prev }; delete p[nodeId]; return p; });
    }, []);

    const addStep = () => {
        if (!newStepForm.name.trim()) return;
        const id = generateId();
        setNodes(prev => [...prev, { id, name: newStepForm.name, duration: Number(newStepForm.duration), dependsOn: [] }]);
        setPositions(prev => {
            const maxX = Math.max(80, ...Object.values(prev).map(p => p.x));
            return { ...prev, [id]: { x: maxX + 260, y: 80 } };
        });
        setNewStepForm({ name: '', duration: 30 });
        setAddingStep(false);
    };

    // SVG dimensions
    const maxX = Math.max(800, ...Object.values(positions).map(p => p.x + NODE_WIDTH + 60));
    const maxY = Math.max(400, ...Object.values(positions).map(p => p.y + NODE_HEIGHT + 60));

    return (
        <div className="relative select-none" style={{ minHeight: 400 }}>
            {/* Toolbar */}
            {!readonly && (
                <div className="flex items-center gap-3 mb-3">
                    <button
                        onClick={() => setAddingStep(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow transition"
                    >
                        <Plus size={16} /> Add Step
                    </button>
                    {connecting && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-bold rounded-xl border border-violet-300 dark:border-violet-700 animate-pulse">
                            <GitBranch size={16} /> Click another step to set dependency...
                            <button onClick={() => setConnecting(null)} className="ml-1 text-violet-400 hover:text-violet-600"><X size={14} /></button>
                        </div>
                    )}
                    {selectedEdge && (
                        <button
                            onClick={() => deleteEdge(selectedEdge.from, selectedEdge.to)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-800"
                        >
                            <Trash2 size={14} /> Delete Selected Arrow
                        </button>
                    )}
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Drag nodes • Click port circle to connect • Click arrow to select</span>
                </div>
            )}

            {/* Add step form */}
            {addingStep && (
                <div className="mb-3 flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <input
                        autoFocus
                        className="input h-10 text-sm flex-1"
                        placeholder="Step name (e.g. Making Body)"
                        value={newStepForm.name}
                        onChange={e => setNewStepForm(f => ({ ...f, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addStep()}
                    />
                    <input
                        type="number" min={1}
                        className="input h-10 text-sm w-28"
                        placeholder="Duration (min)"
                        value={newStepForm.duration}
                        onChange={e => setNewStepForm(f => ({ ...f, duration: e.target.value }))}
                    />
                    <button onClick={addStep} className="btn-primary h-10 px-5 text-sm">Add</button>
                    <button onClick={() => setAddingStep(false)} className="btn-secondary h-10 px-4 text-sm">Cancel</button>
                </div>
            )}

            {/* Canvas */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 overflow-auto">
                <svg
                    ref={svgRef}
                    width={maxX}
                    height={maxY}
                    onClick={() => { setSelectedEdge(null); setConnecting(null); }}
                    style={{ cursor: connecting ? 'crosshair' : 'default' }}
                >
                    <defs>
                        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
                        </marker>
                        <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {nodes.map(node =>
                        (node.dependsOn || []).map(depId => {
                            const from = positions[depId];
                            const to = positions[node.id];
                            if (!from || !to) return null;

                            const x1 = from.x + NODE_WIDTH;
                            const y1 = from.y + NODE_HEIGHT / 2;
                            const x2 = to.x;
                            const y2 = to.y + NODE_HEIGHT / 2;
                            const mx = (x1 + x2) / 2;
                            const isSelected = selectedEdge?.from === depId && selectedEdge?.to === node.id;
                            const pathD = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;

                            return (
                                <g key={`${depId}-${node.id}`}>
                                    {/* Invisible wider hit area */}
                                    <path d={pathD} strokeWidth={12} stroke="transparent" fill="none"
                                        onClick={e => { e.stopPropagation(); setSelectedEdge({ from: depId, to: node.id }); }} style={{ cursor: 'pointer' }} />
                                    <path
                                        d={pathD}
                                        strokeWidth={isSelected ? 2.5 : 1.5}
                                        stroke={isSelected ? '#ef4444' : '#6366f1'}
                                        fill="none"
                                        markerEnd={isSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
                                        strokeDasharray={isSelected ? '5 3' : 'none'}
                                    />
                                </g>
                            );
                        })
                    )}

                    {/* Nodes */}
                    {nodes.map(node => {
                        const pos = positions[node.id] || { x: 80, y: 80 };
                        const isConnSrc = connecting === node.id;

                        return (
                            <g key={node.id} transform={`translate(${pos.x},${pos.y})`}>
                                {/* Node body */}
                                <rect
                                    x={0} y={0} width={NODE_WIDTH} height={NODE_HEIGHT}
                                    rx={12} ry={12}
                                    fill={isConnSrc ? '#ede9fe' : 'white'}
                                    stroke={isConnSrc ? '#7c3aed' : '#e4e4e7'}
                                    strokeWidth={isConnSrc ? 2 : 1}
                                    filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))"
                                    style={{ cursor: readonly ? 'default' : 'grab' }}
                                    onMouseDown={e => startDrag(e, node.id)}
                                    className="dark:fill-zinc-800 dark:stroke-zinc-700"
                                />
                                {/* Drag handle icon */}
                                {!readonly && (
                                    <foreignObject x={6} y={6} width={18} height={18} style={{ pointerEvents: 'none' }}>
                                        <GripVertical size={14} color="#a1a1aa" />
                                    </foreignObject>
                                )}
                                {/* Step name */}
                                <text
                                    x={NODE_WIDTH / 2} y={34}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fontSize={12} fontWeight="700" fill="#18181b"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                    className="dark:fill-zinc-100"
                                >
                                    {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                                </text>
                                {/* Duration */}
                                <text
                                    x={NODE_WIDTH / 2} y={54}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fontSize={10} fill="#71717a"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {node.duration} min
                                </text>

                                {/* Right port (output — click to start connection FROM this node) */}
                                {!readonly && (
                                    <circle
                                        cx={NODE_WIDTH} cy={NODE_HEIGHT / 2} r={PORT_R}
                                        fill={isConnSrc ? '#7c3aed' : '#6366f1'}
                                        stroke="white" strokeWidth={2}
                                        style={{ cursor: 'crosshair' }}
                                        onClick={e => handlePortClick(e, node.id)}
                                        title="Drag to connect"
                                    />
                                )}
                                {/* Left port (input — click to set as dependency target) */}
                                {!readonly && connecting && connecting !== node.id && (
                                    <circle
                                        cx={0} cy={NODE_HEIGHT / 2} r={PORT_R}
                                        fill="#10b981"
                                        stroke="white" strokeWidth={2}
                                        style={{ cursor: 'pointer' }}
                                        onClick={e => handlePortClick(e, node.id)}
                                    />
                                )}
                                {/* Delete button */}
                                {!readonly && (
                                    <g transform={`translate(${NODE_WIDTH - 18},4)`} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); deleteNode(node.id); }}>
                                        <circle cx={8} cy={8} r={8} fill="#fee2e2" />
                                        <text x={8} y={8} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#ef4444" fontWeight="900">×</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm font-bold">
                        No steps yet. Click "Add Step" to begin.
                    </div>
                )}
            </div>
        </div>
    );
}
