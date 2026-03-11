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
import { ColorInputNode } from "./nodes/colorInput";
import type { AppState } from "./types";
import { useStore } from "./store";
import { useShallow } from "zustand/shallow";

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
  colorInput: ColorInputNode,
};

const selector = (state: AppState) => ({
  nodes: state.nodes,
  setNodes: state.setNodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

export default function App() {
  const { nodes, setNodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useStore(useShallow(selector));

  useEffect(() => {
    setNodes([
      {
        id: "n1",
        type: "textUpdater",
        position: { x: 0, y: 0 },
        data: {
          label: "Node 1",
        },
      },
      {
        id: "n2",
        type: "textDisplayer",
        position: { x: 0, y: 100 },
        data: { label: "Node 2" },
      },
      {
        id: "n3",
        type: "colorInput",
        position: { x: 0, y: 100 },
        data: { label: "Node 3" },
      },
    ]);
  }, []);

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
