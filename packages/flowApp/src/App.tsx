import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./index.css";
import { TextUpdaterNode } from "./nodes/textUpdater";
import { TextDisplayerNode } from "./nodes/textDisplayer";

const initialEdges: Edge[] = [
  {
    id: "n1-n2",
    source: "n1",
    target: "n2",
    type: "step",
    label: "connects with",
  },
];

const nodeTypes = {
  textUpdater: TextUpdaterNode,
  textDisplayer: TextDisplayerNode,
};

export default function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    const onChange = (value: string) =>
      setNodes((snap) =>
        snap.map((node) => {
          if (node.id != "n1") return node;
          return {
            ...node,
            data: { ...node.data, value },
          };
        }),
      );

    setNodes([
      {
        id: "n1",
        type: "textUpdater",
        position: { x: 0, y: 0 },
        data: {
          label: "Node 1",
          onChange,
        },
      },
      {
        id: "n2",
        type: "textDisplayer",
        position: { x: 0, y: 100 },
        data: { label: "Node 2" },
      },
    ]);
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
