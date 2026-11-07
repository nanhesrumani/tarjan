from typing import Dict, Any, List
import networkx as nx
from .models import GraphData, NodeModel

def compute_layout(graph_data: GraphData, layout_type: str = "spring", width: float = 900.0, height: float = 600.0) -> List[NodeModel]:
    G = nx.DiGraph() if graph_data.directed else nx.Graph()
    for n in graph_data.nodes:
        G.add_node(n.id)
    for e in graph_data.edges:
        G.add_edge(e.source, e.target, weight=e.weight or 1.0)

    if not G.nodes:
        return []

    # Center coordinates with margins
    center_x = width / 2.0
    center_y = height / 2.0
    scale_x = (width - 150) / 2.0
    scale_y = (height - 150) / 2.0

    if layout_type == "circular":
        pos = nx.circular_layout(G)
    elif layout_type == "shell":
        pos = nx.shell_layout(G)
    elif layout_type == "kamada_kawai":
        try:
            pos = nx.kamada_kawai_layout(G)
        except Exception:
            pos = nx.spring_layout(G, seed=42, k=1.5 / max(1, len(G.nodes)**0.5))
    else:  # default spring
        pos = nx.spring_layout(G, seed=42, k=1.8 / max(1, len(G.nodes)**0.5), iterations=50)

    updated_nodes = []
    for n in graph_data.nodes:
        if n.id in pos:
            px, py = pos[n.id]
            new_x = center_x + px * scale_x
            new_y = center_y + py * scale_y
            updated_nodes.append(NodeModel(
                id=n.id,
                label=n.label or n.id,
                x=round(new_x, 1),
                y=round(new_y, 1),
                color=n.color
            ))
        else:
            updated_nodes.append(n)

    return updated_nodes
