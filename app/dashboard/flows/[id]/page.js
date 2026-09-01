"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ArrowLeft,
  Play,
  Loader2,
  Check,
  Trash2,
  Workflow,
  ListTree,
} from "lucide-react";
import FlowNode from "@/components/flows/FlowNode";
import AnimatedEdge from "@/components/flows/AnimatedEdge";
import NodePalette from "@/components/flows/NodePalette";
import NodeInspector from "@/components/flows/NodeInspector";
import OnboardingHint from "@/components/flows/OnboardingHint";
import DeleteModal from "@/components/chat/DeleteModal";

const nodeTypes = { flowNode: FlowNode };
const edgeTypes = { animated: AnimatedEdge };

let idCounter = 0;
function newNodeId() {
  idCounter += 1;
  return `node_${Date.now()}_${idCounter}`;
}

// Backend <-> canvas shape translation. React Flow's own `type` field on a
// node selects which renderer to use (always "flowNode" here); the actual
// business node type (e.g. "platform.instagramPost") lives in data.nodeType
// so the backend's `type` field can stay the meaningful one for the
// execution engine.
function toCanvasNodes(backendNodes = []) {
  return backendNodes.map((n) => ({
    id: n.nodeId,
    type: "flowNode",
    position: n.position,
    data: { nodeType: n.type, ...n.data },
  }));
}
function toCanvasEdges(backendEdges = []) {
  return backendEdges.map((e) => ({
    id: e.edgeId,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
    type: "animated",
  }));
}
function toBackendNodes(canvasNodes = []) {
  return canvasNodes.map((n) => {
    const { nodeType, ...data } = n.data;
    return { nodeId: n.id, type: nodeType, position: n.position, data };
  });
}
function toBackendEdges(canvasEdges = []) {
  return canvasEdges.map((e) => ({
    edgeId: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || null,
    targetHandle: e.targetHandle || null,
  }));
}

function FlowCanvas() {
  const params = useParams();
  const router = useRouter();
  const flowId = params.id;
  const wrapperRef = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [flow, setFlow] = useState(null);
  const [error, setError] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveTimer = useRef(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/flows/${flowId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Couldn't load this flow");
          return;
        }
        setFlow(data.flow);
        setNameDraft(data.flow.name);
        setNodes(toCanvasNodes(data.flow.nodes));
        setEdges(toCanvasEdges(data.flow.edges));
        // Avoid firing an autosave immediately after the initial load.
        setTimeout(() => {
          hasLoaded.current = true;
        }, 0);
      } catch (e) {
        if (!cancelled) setError("Network error — please try again");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  const persist = useCallback(
    async (partial) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/flows/${flowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        const data = await res.json();
        if (res.ok) {
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1500);
        } else {
          setError(data.error || "Couldn't save your changes");
          setSaveState("idle");
        }
      } catch (e) {
        setError("Network error while saving");
        setSaveState("idle");
      }
    },
    [flowId],
  );

  // Debounced auto-save whenever the graph changes (node moved, wire
  // connected, config edited) — matches the plan's "PUT /api/flows/:id —
  // nodes/edges save karo (canvas se auto-save)".
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({ nodes: toBackendNodes(nodes), edges: toBackendEdges(edges) });
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [nodes, edges, persist]);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, type: "animated" }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/reactflow");
      if (!nodeType || !reactFlowInstance || !wrapperRef.current) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      setNodes((nds) => [
        ...nds,
        { id: newNodeId(), type: "flowNode", position, data: { nodeType } },
      ]);
    },
    [reactFlowInstance, setNodes],
  );

  const handleNodeDataChange = useCallback(
    (nodeId, patch) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges],
  );

  async function handleNameBlur() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === flow?.name) {
      setNameDraft(flow?.name || "");
      return;
    }
    setFlow((f) => ({ ...f, name: trimmed }));
    await persist({ name: trimmed });
  }

  async function handleStatusChange(status) {
    setFlow((f) => ({ ...f, status }));
    await persist({ status });
  }

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/flows/${flowId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRunResult({ ok: false, message: data.error || "Run failed" });
      } else {
        setRunResult({ ok: true, run: data.run });
      }
    } catch (e) {
      setRunResult({ ok: false, message: "Network error — please try again" });
    } finally {
      setRunning(false);
    }
  }

  async function handleDeleteFlow() {
    await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
    router.push("/dashboard/flows");
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  if (error && !flow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4 text-center text-paper">
        <div>
          <p className="mb-3 text-sm text-mist">{error}</p>
          <Link href="/dashboard/flows" className="text-sm text-signal hover:opacity-80">
            Back to Flows
          </Link>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-ink text-mist">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ink text-paper">
      {/* Toolbar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard/flows" className="text-mist transition hover:text-paper" aria-label="Back to Flows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Workflow className="h-4 w-4 shrink-0 text-signal" />
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleNameBlur}
            className="min-w-0 max-w-xs truncate bg-transparent text-sm font-medium text-paper outline-none focus:underline"
          />
          <span className="hidden text-xs text-mist/50 sm:inline">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={flow.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-line bg-surface2 px-2 py-1.5 text-xs text-paper outline-none"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <button
            onClick={handleRun}
            disabled={running || nodes.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-signal px-3 py-1.5 text-xs font-semibold text-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg p-1.5 text-mist transition hover:bg-surface2 hover:text-red-400"
            aria-label="Delete flow"
            title="Delete flow"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {runResult && (
        <div
          className={`flex items-center gap-2 border-b border-line px-4 py-2 text-xs ${
            runResult.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <ListTree className="h-3.5 w-3.5" />
          {runResult.ok
            ? `Run finished — ${runResult.run.logs.length} step${runResult.run.logs.length === 1 ? "" : "s"} logged. This is a simulated run; nothing was posted to any platform yet.`
            : runResult.message}
        </div>
      )}

      {/* Body: palette / canvas / inspector */}
      <div className="flex min-h-0 flex-1">
        <NodePalette />

        <div className="relative min-w-0 flex-1" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: "animated" }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgb(var(--color-line))" gap={20} />
            <Controls className="!border !border-line !bg-surface [&>button]:!border-line [&>button]:!bg-surface [&>button]:!text-paper" />
            <MiniMap
              className="!bg-surface"
              maskColor="rgba(0,0,0,0.5)"
              nodeColor="rgb(var(--color-signal))"
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="max-w-xs text-center text-sm text-mist/50">
                Drag a node from the left onto the canvas to start building your flow.
              </p>
            </div>
          )}

          <OnboardingHint hasNodes={nodes.length > 0} />
        </div>

        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            onChange={handleNodeDataChange}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteFlow}
        title={`Delete "${flow.name}"?`}
        message="This deletes the flow, its nodes, and its run history. This can't be undone."
      />
    </div>
  );
}

export default function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
