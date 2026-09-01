// Turns a flow's flat nodes[] + edges[] into an execution order, and
// figures out which nodes to skip when a logic.condition node's branch
// doesn't pass.
//
// Note on branching: the canvas (components/flows/FlowNode.jsx) currently
// gives every node exactly one output handle — there's no separate
// "true"/"false" wire yet the way n8n has. So a condition node can't yet
// route to two different downstream paths; what it *can* do is gate
// whether its single downstream path runs at all. That's what
// getDescendants() below is for. True two-way branching is a canvas
// change (new source handles + edge sourceHandle values) for a later
// pass — this is the honest subset of "branching" the current UI
// supports.

/**
 * Kahn's algorithm. Returns nodes in an order where every node comes
 * after all of its predecessors. Throws if the graph has a cycle (the
 * canvas doesn't block cycles today, so this is the run route's
 * validation point).
 */
export function topologicalOrder(nodes, edges) {
  const inDegree = new Map(nodes.map((n) => [n.nodeId, 0]));
  const children = new Map(nodes.map((n) => [n.nodeId, []]));

  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue; // dangling edge, ignore
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    children.get(edge.source).push(edge.target);
  }

  const queue = nodes.filter((n) => inDegree.get(n.nodeId) === 0);
  const order = [];
  const remaining = new Map(inDegree);

  while (queue.length) {
    const node = queue.shift();
    order.push(node);
    for (const childId of children.get(node.nodeId) || []) {
      remaining.set(childId, remaining.get(childId) - 1);
      if (remaining.get(childId) === 0) {
        const childNode = nodes.find((n) => n.nodeId === childId);
        if (childNode) queue.push(childNode);
      }
    }
  }

  if (order.length !== nodes.length) {
    const err = new Error("Flow has a cycle — can't determine a run order");
    err.code = "CYCLE";
    throw err;
  }

  return order;
}

/** Every nodeId reachable by following outgoing edges from startNodeId. */
export function getDescendants(startNodeId, edges) {
  const childrenOf = new Map();
  for (const edge of edges) {
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source).push(edge.target);
  }

  const visited = new Set();
  const stack = [...(childrenOf.get(startNodeId) || [])];
  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    stack.push(...(childrenOf.get(id) || []));
  }
  return visited;
}

/** Direct predecessor nodeIds for a given node (immediate parents only). */
export function getParents(nodeId, edges) {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source);
}