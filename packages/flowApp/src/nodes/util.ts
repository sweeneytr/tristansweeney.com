import { type Node } from "@xyflow/react";

export type NodeDataOf<T extends Node> = {
  id: T["id"];
  type: T["type"];
  data: T["data"];
};

export function isNode<T extends Node>(key: T["type"]) {
  return function isNode(node: NodeDataOf<Node> | null): node is NodeDataOf<T> {
    return node?.type === key;
  };
}
