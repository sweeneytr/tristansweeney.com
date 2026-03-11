import { memo, useCallback } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { isNode } from "./util";
import { useStore } from "../store";

export const isColorInputNode = isNode<ColorInputNode>("colorInput");

export type ColorInputNode = Node<
  { color: string | undefined; onChange(value: string): void },
  "colorInput"
>;

export const ColorInputNode = memo(
  ({ id, data, isConnectable }: NodeProps<ColorInputNode>) => {
    const updateNodeValue = useStore((state) => state.updateNodeColor);
    const onChange = useCallback(
      (evt: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeValue(id, evt.target.value);
      },
      [updateNodeValue],
    );
    return (
      <div className="color-input-node">
        <div>
          <label htmlFor="text">Color:</label>
          <input
            name="color"
            type="color"
            value={data.color ?? ""}
            onChange={onChange}
            className="nodrag"
          />
        </div>
        <Handle
          position={Position.Right}
          type="source"
          isConnectable={isConnectable}
        />
      </div>
    );
  },
);
