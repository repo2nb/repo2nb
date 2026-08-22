import type { ScanNode } from "./types";

export type TreeNode = {
  name: string;
  path: string;
  file?: ScanNode;
  children: Map<string, TreeNode>;
};

export function buildTree(files: ScanNode[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path, children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    });
    node.file = f;
  }
  return root;
}

export function sortedChildren(node: TreeNode): TreeNode[] {
  return Array.from(node.children.values()).sort((a, b) => {
    const aDir = a.children.size > 0;
    const bDir = b.children.size > 0;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
