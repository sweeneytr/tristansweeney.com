import { memo } from "react";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
  useNodeConnections,
  useNodesData,
} from "@xyflow/react";
import { isNode } from "./util";
import { isTextUpdaterNode } from "./textUpdater";

export type TextDisplayerNode = Node<
  { value: string | undefined; onChange(value: string): void },
  "textDisplayer"
>;
export const isTextDisplayerNode = isNode<TextDisplayerNode>("textDisplayer");

export const TextDisplayerNode = memo(
  ({ isConnectable, id }: NodeProps<TextDisplayerNode>) => {
    const edges = useNodeConnections({ id, handleType: "target" });
    const node = useNodesData(edges[0]?.source);
    const value = isTextUpdaterNode(node) ? node.data.value : undefined;

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
      </div>
    );
  },
);
