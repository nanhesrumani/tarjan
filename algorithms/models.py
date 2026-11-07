from typing import List, Optional
from pydantic import BaseModel

class NodeModel(BaseModel):
    id: str
    label: Optional[str] = None
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    color: Optional[str] = None

class EdgeModel(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    weight: Optional[float] = 1.0
    directed: Optional[bool] = True
    label: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[NodeModel]
    edges: List[EdgeModel]
    directed: bool = True
