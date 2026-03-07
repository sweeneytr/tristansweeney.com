import { useState, useCallback, memo, useEffect } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeProps,
  useNodeConnections,
  useNodesData,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./index.css";

const initialEdges: Edge[] = [
  {
    id: "n1-n2",
    source: "n1",
    target: "n2",
    type: "step",
    label: "connects with",
  },
];

type TextUpdaterNode = Node<
  { value: string | undefined; onChange(value: string): void },
  "textUpdater"
>;

export const TextUpdaterNode = memo(
  ({ data, isConnectable }: NodeProps<TextUpdaterNode>) => {
    const onChange = useCallback(
      (evt: React.ChangeEvent<HTMLInputElement>) => {
        data.onChange(evt.target.value);
      },
      [data.onChange],
    );

    return (
      <div className="text-updater-node">
        <div>
          <label htmlFor="text">Text:</label>
          <input
            id="text"
            name="text"
            value={data.value ?? ""}
            onChange={onChange}
            className="nodrag"
          />
        </div>
        <Handle
          position={Position.Bottom}
          type="source"
          isConnectable={isConnectable}
        />
      </div>
    );
  },
);

type TextDisplayerNode = Node<
  { value: string | undefined; onChange(value: string): void },
  "textDisplayer"
>;

export const TextDisplayerNode = memo(
  ({ isConnectable, id }: NodeProps<TextDisplayerNode>) => {
    const edges = useNodeConnections({ id, handleType: "target" });
    const graph = useNodesData<
      Node<
        { value: string | undefined; onChange(value: string): void },
        "textUpdater"
      >
    >(edges[0].source);
    console.log(graph?.data);

    return (
      <div className="text-updater-node">
        <div>
          <div>{graph?.data.value}</div>
        </div>
        <Handle
          position={Position.Top}
          type="target"
          isConnectable={isConnectable}
        />
      </div>
    );
  },
);

function isNode<T extends Node>(key: T["type"]) {
  return function isNode(node: Node): node is T {
    return node.type === key;
  };
}

type CustomNodeType = TextUpdaterNode | TextDisplayerNode;
const isTextUpdaterNode = isNode<TextDisplayerNode>("textDisplayer");
const isTextDisplayerNode = isNode<TextDisplayerNode>("textDisplayer");

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
