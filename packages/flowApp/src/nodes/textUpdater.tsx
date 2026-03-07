import { memo, useCallback } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { isNode } from "./util";

export const isTextUpdaterNode = isNode<TextUpdaterNode>("textUpdater");

export type TextUpdaterNode = Node<
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
