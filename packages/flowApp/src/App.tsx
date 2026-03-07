import {
  useState,
  useCallback,
  memo,
  useEffect,
  type MemoExoticComponent,
} from "react";
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
    const node = useNodesData(edges[0]?.source);
    const value = validators.textDisplayer(node) ? node.data.value : undefined;

    return (
      <div className="text-updater-node">
        <div>
          <div>{value}</div>
        </div>
        <Handle
          position={Position.Top}
          type="target"
          isConnectable={isConnectable}
        />
        <Handle
          position={Position.Left}
          type="target"
          isConnectable={isConnectable}
          id="b"
        />
      </div>
    );
  },
);

type CustomNodeType = TextUpdaterNode | TextDisplayerNode;

type NodeDataOf<T extends Node> = {
  id: T["id"];
  type: T["type"];
  data: T["data"];
};
type NodeOf<T> = T extends (p: NodeProps<infer Node>) => any
  ? Node
  : T extends React.MemoExoticComponent<(p: NodeProps<infer Node>) => any>
    ? Node
    : never;

function isNode<T extends Node>(key: T["type"]) {
  return function isNode(node: NodeDataOf<Node> | null): node is NodeDataOf<T> {
    return node?.type === key;
  };
}

const isTextUpdaterNode = isNode<TextUpdaterNode>("textUpdater");
const isTextDisplayerNode = isNode<TextDisplayerNode>("textDisplayer");

const nodeTypes = {
  textUpdater: TextUpdaterNode,
  textDisplayer: TextDisplayerNode,
};

const makeValidators = <
  T extends Record<string, MemoExoticComponent<(props: NodeProps<any>) => any>>,
>(
  record: T,
): {
  [Prop in keyof T]: (
    node: NodeDataOf<Node> | null,
  ) => node is NodeDataOf<NodeOf<T[Prop]>>;
  // @ts-expect-error requires human knowledge
} => Object.fromEntries(Object.keys(record).map((key) => [key, isNode(key)]));

const validators = makeValidators(nodeTypes);

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
