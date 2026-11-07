import re
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

from algorithms.models import GraphData, NodeModel, EdgeModel
from algorithms.layout import compute_layout

app = FastAPI(title="GraphStudio - Interactive Graph Builder")

class ParseTextRequest(BaseModel):
    text: str
    directed: bool = True
    width: float = 900.0
    height: float = 600.0

class LayoutRequest(BaseModel):
    graph: GraphData
    layout_type: str = "spring"
    width: float = 900.0
    height: float = 600.0

@app.post("/api/graph/parse", response_model=GraphData)
def parse_text_to_graph(req: ParseTextRequest):
    """
    Parses edge list or adjacency representations:
    Examples:
    1 -> 2
    A - B
    A B
    1 2
    A -> B [5]
    u: v, w
    """
    lines = [line.strip() for line in req.text.splitlines() if line.strip() and not line.strip().startswith("#")]
    node_set = set()
    edges: List[EdgeModel] = []

    for line in lines:
        if ":" in line:
            parts = line.split(":", 1)
            src = parts[0].strip()
            node_set.add(src)
            targets = [t.strip() for t in re.split(r'[, \t]+', parts[1].strip()) if t.strip()]
            for tgt in targets:
                node_set.add(tgt)
                edges.append(EdgeModel(source=src, target=tgt, directed=req.directed))
        else:
            weight = 1.0
            cleaned_line = line
            w_match = re.search(r'\[(.*?)\]|weight\s*=\s*(\d+(?:\.\d+)?)', line, re.IGNORECASE)
            if w_match:
                try:
                    w_val = w_match.group(1) or w_match.group(2)
                    weight = float(w_val)
                except ValueError:
                    weight = 1.0
                cleaned_line = line[:w_match.start()] + line[w_match.end():]

            parts = re.split(r'\s*(?:->|--|-|,|\t|\s)\s*', cleaned_line.strip())
            parts = [p for p in parts if p]
            if len(parts) >= 2:
                src, tgt = parts[0], parts[1]
                if len(parts) >= 3 and weight == 1.0:
                    try:
                        weight = float(parts[2])
                    except ValueError:
                        pass
                node_set.add(src)
                node_set.add(tgt)
                edges.append(EdgeModel(source=src, target=tgt, weight=weight, directed=req.directed))
            elif len(parts) == 1:
                node_set.add(parts[0])

    initial_nodes = [NodeModel(id=nid, label=nid) for nid in sorted(node_set)]
    raw_graph = GraphData(nodes=initial_nodes, edges=edges, directed=req.directed)

    if initial_nodes:
        raw_graph.nodes = compute_layout(raw_graph, layout_type="spring", width=req.width, height=req.height)
    return raw_graph

@app.post("/api/graph/layout", response_model=List[NodeModel])
def run_layout(req: LayoutRequest):
    return compute_layout(req.graph, layout_type=req.layout_type, width=req.width, height=req.height)

PRESETS = {
    "bridge_example": {
        "name": "Bridge & Two Connected Clusters",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n1 - 3\n3 - 4\n4 - 5\n5 - 3"
    },
    "cycle_with_chord": {
        "name": "Triangle & Cycles",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n0 - 3\n1 - 3\n3 - 4\n4 - 5\n5 - 3"
    },
    "bipartite": {
        "name": "Two Separated Clusters",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n2 - 3\n3 - 4\n4 - 5\n5 - 3"
    },
    "railway_16": {
        "name": "🚆 Assignment 1: 16-Station National Rail Grid",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 3\n3 - 0\n0 - 2\n1 - 4\n4 - 5\n5 - 6\n6 - 7\n7 - 5\n7 - 8\n2 - 9\n9 - 10\n10 - 11\n11 - 9\n11 - 12\n12 - 13\n13 - 14\n14 - 15\n15 - 13"
    },
    "hill_station": {
        "name": "🏔️ Assignment 2: Hill Station Landslide Chokepoints",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n0 - 2\n1 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n5 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n10 - 11\n11 - 12\n12 - 10\n12 - 13"
    },
    "social_network": {
        "name": "👥 Assignment 3: Social Network Community Bridges",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n0 - 3\n1 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n5 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n9 - 10\n10 - 11\n11 - 12\n12 - 13\n13 - 11\n13 - 14"
    },
    "iot_mesh": {
        "name": "📡 Assignment 4: Precision Agriculture IoT Sensor Mesh",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n0 - 3\n2 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n6 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n10 - 11\n11 - 12\n12 - 10\n11 - 13\n13 - 14\n14 - 15\n15 - 13"
    },
    "company_network": {
        "name": "🏢 Assignment 5: Corporate Enterprise Network Core Hub",
        "directed": False,
        "text": "0 - 1\n1 - 2\n2 - 0\n1 - 3\n2 - 3\n0 - 4\n4 - 5\n5 - 6\n6 - 4\n3 - 7\n7 - 8\n8 - 9\n9 - 7\n9 - 10\n10 - 11\n11 - 12\n12 - 10\n2 - 13\n13 - 14\n14 - 15\n15 - 13"
    }
}

@app.get("/api/presets")
def get_presets():
    return PRESETS

ASSIGNMENTS = {
    1: {
        "id": 1,
        "title": "Assignment 1: National Railway Critical Tracks",
        "subtitle": "Discover single points of failure across a 16-station passenger rail network",
        "difficulty": "Medium-Hard",
        "category": "Railway Infrastructure",
        "nodes_count": 16,
        "edges_count": 20,
        "preset_id": "railway_16",
        "icon": "🚆",
        "question": "The National Transit Authority operates 16 passenger railway stations (0 to 15) connected by 20 bidirectional railway tracks across 4 regional commuter hubs. Identify all critical tracks (bridges) that, if blocked or derailed, would split the national rail system into disconnected clusters.",
        "nodes_list": [
            {"id": "0", "name": "Central Transit Station"},
            {"id": "1", "name": "North Hub Junction"},
            {"id": "2", "name": "South Hub Junction"},
            {"id": "3", "name": "West Terminal"},
            {"id": "4", "name": "Valley Crossing Post"},
            {"id": "5", "name": "Lake Hub Station"},
            {"id": "6", "name": "Harbour Maritime Post"},
            {"id": "7", "name": "East Hub Junction"},
            {"id": "8", "name": "Coastal Terminus"},
            {"id": "9", "name": "Mountain Rail Junction"},
            {"id": "10", "name": "Hill Post Station"},
            {"id": "11", "name": "High Pass Depot"},
            {"id": "12", "name": "Peak Freight Yard"},
            {"id": "13", "name": "Border Hub Junction"},
            {"id": "14", "name": "Alpine Halt"},
            {"id": "15", "name": "Glacier Terminus"}
        ],
        "edges_text": "0 - 1\n1 - 2\n2 - 3\n3 - 0\n0 - 2\n1 - 4\n4 - 5\n5 - 6\n6 - 7\n7 - 5\n7 - 8\n2 - 9\n9 - 10\n10 - 11\n11 - 9\n11 - 12\n12 - 13\n13 - 14\n14 - 15\n15 - 13"
    },
    2: {
        "id": 2,
        "title": "Assignment 2: Hill Station Landslide Road Chokepoints",
        "subtitle": "Locate vulnerable mountain roads whose obstruction cuts off village clusters",
        "difficulty": "Medium",
        "category": "Disaster Preparedness",
        "nodes_count": 14,
        "edges_count": 18,
        "preset_id": "hill_station",
        "icon": "🏔️",
        "question": "In a Himalayan hill station, 14 residential cottages and tea estate houses (0 to 13) are connected by 18 narrow mountain ridge roads. During monsoon season, heavy rainfall triggers landslides. If a landslide blocks a single road that has no alternative bypass, an entire ridge community is cut off from medical aid, food convoys, and emergency services. Identify all critical mountain roads (bridges) that must be reinforced with retaining walls!",
        "nodes_list": [
            {"id": "0", "name": "Valley Main Transit Post"},
            {"id": "1", "name": "Pine Ridge Cottage"},
            {"id": "2", "name": "Apple Orchard Homestead"},
            {"id": "3", "name": "Ridge Pass Lodge"},
            {"id": "4", "name": "Misty Valley Tea Estate"},
            {"id": "5", "name": "Terraced Green House"},
            {"id": "6", "name": "Cloud Vista Villa"},
            {"id": "7", "name": "Eagle Peak Summit Post"},
            {"id": "8", "name": "Solar Weather Cabin"},
            {"id": "9", "name": "Gorge Lookout Shelter"},
            {"id": "10", "name": "Hidden Meadow Villa"},
            {"id": "11", "name": "Stream Organic Farm"},
            {"id": "12", "name": "Hilltop Orchard House"},
            {"id": "13", "name": "Solitary Forest Lookout Cabin"}
        ],
        "edges_text": "0 - 1\n1 - 2\n2 - 0\n0 - 2\n1 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n5 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n10 - 11\n11 - 12\n12 - 10\n12 - 13"
    },
    3: {
        "id": 3,
        "title": "Assignment 3: Social Network Community Bridges",
        "subtitle": "Discover critical friendships holding distinct social circles together",
        "difficulty": "Medium",
        "category": "Social Network Analysis",
        "nodes_count": 15,
        "edges_count": 20,
        "preset_id": "social_network",
        "icon": "👥",
        "question": "A university campus social graph maps 15 students (0 to 14) partitioned across four major student clubs: Robotics, Music Band, Athletics, and Debate Society. Within each club, students form dense friendship cliques where everyone communicates. However, information flow between distinct clubs depends on a few rare cross-club friendships. If a bridge friendship is severed, rumors or student council updates cannot reach neighboring subcultures. Identify all bridge friendships (critical connections) in this social network!",
        "nodes_list": [
            {"id": "0", "name": "Alex (Robotics Lead)"},
            {"id": "1", "name": "Bella (Robotics Hardware)"},
            {"id": "2", "name": "Chris (Robotics AI)"},
            {"id": "3", "name": "Diana (Robotics/Music Liaison)"},
            {"id": "4", "name": "Ethan (Band Lead Guitar)"},
            {"id": "5", "name": "Fiona (Band Drummer)"},
            {"id": "6", "name": "George (Band Bassist)"},
            {"id": "7", "name": "Hannah (Athletics Captain)"},
            {"id": "8", "name": "Ian (Track Sprinter)"},
            {"id": "9", "name": "Jack (Fitness Coach)"},
            {"id": "10", "name": "Kelly (Sports/Debate Liaison)"},
            {"id": "11", "name": "Leo (Debate President)"},
            {"id": "12", "name": "Maya (Debate Researcher)"},
            {"id": "13", "name": "Noah (Debate Speaker)"},
            {"id": "14", "name": "Olivia (First-Year Mentee)"}
        ],
        "edges_text": "0 - 1\n1 - 2\n2 - 0\n0 - 3\n1 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n5 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n9 - 10\n10 - 11\n11 - 12\n12 - 13\n13 - 11\n13 - 14"
    },
    4: {
        "id": 4,
        "title": "Assignment 4: Precision Agriculture IoT Sensor Mesh",
        "subtitle": "Pinpoint single-point-of-failure radio relays across a hillside vineyard",
        "difficulty": "Hard",
        "category": "Wireless Sensor Networks",
        "nodes_count": 16,
        "edges_count": 21,
        "preset_id": "iot_mesh",
        "icon": "📡",
        "question": "A commercial vineyard deploys 16 solar-powered IoT telemetry nodes (0 to 15) across four terraced hillside zones to measure soil moisture, sap flow, and frost risk. Local nodes broadcast sensor readings via multi-hop RF mesh. Inter-zone data traverses long-range directional LoRa links back to the central gateway (node 0). If a single transceiver battery expires or line-of-sight is blocked by vineyard machinery, entire vineyard sectors are disconnected from automated drip irrigation. Identify all critical wireless transmission links (bridges) in this agricultural mesh!",
        "nodes_list": [
            {"id": "0", "name": "Central Solar Gateway Station"},
            {"id": "1", "name": "North Sap-Flow Sensor N1"},
            {"id": "2", "name": "North Soil Moisture Tensiometer"},
            {"id": "3", "name": "North Weather Anemometer Mast"},
            {"id": "4", "name": "River Basin Valve Controller"},
            {"id": "5", "name": "Deep Root Moisture Probe R1"},
            {"id": "6", "name": "Drip Irrigation Flowmeter"},
            {"id": "7", "name": "Canyon Long-Range Radio Relay"},
            {"id": "8", "name": "Hilltop Cru Solar Pyranometer"},
            {"id": "9", "name": "Wind Chill & Frost Sensor"},
            {"id": "10", "name": "South Greenhouse Gateway"},
            {"id": "11", "name": "Canopy Humidity Probe G1"},
            {"id": "12", "name": "Soil Electrical Conductivity Probe"},
            {"id": "13", "name": "Remote Wellhead Radio Relay"},
            {"id": "14", "name": "Submersible Borehole Pump Node"},
            {"id": "15", "name": "Aquifer Level Pressure Transducer"}
        ],
        "edges_text": "0 - 1\n1 - 2\n2 - 0\n0 - 3\n2 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n6 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n10 - 11\n11 - 12\n12 - 10\n11 - 13\n13 - 14\n14 - 15\n15 - 13"
    },
    5: {
        "id": 5,
        "title": "Assignment 5: Corporate Enterprise Network Core Hub",
        "subtitle": "Identify vulnerable high-speed fiber trunks connecting corporate branch divisions",
        "difficulty": "Hard",
        "category": "Enterprise Infrastructure",
        "nodes_count": 16,
        "edges_count": 21,
        "preset_id": "company_network",
        "icon": "🏢",
        "question": "A global technology enterprise connects 16 core network hubs and server clusters (0 to 15) across HQ Datacenter, Engineering VPC, Finance & Payroll Hub, Customer Support Center, and Secure Cold Vault. While each division maintains internal fiber rings, inter-department data flows through high-speed 100Gbps backbone trunks. If a single backbone trunk is severed during office remodeling or a core switch port fails, entire divisions are partitioned from corporate databases and cloud applications. Identify all critical backbone connections (bridges) in the company network!",
        "nodes_list": [
            {"id": "0", "name": "HQ Core Backbone Switch"},
            {"id": "1", "name": "Primary SAN Storage Array"},
            {"id": "2", "name": "Active Directory & IAM Master"},
            {"id": "3", "name": "Perimeter Edge Firewall & DMZ"},
            {"id": "4", "name": "Engineering CI/CD Farm Switch"},
            {"id": "5", "name": "Kubernetes Cluster Controller"},
            {"id": "6", "name": "AI/GPU Compute Cluster Gateway"},
            {"id": "7", "name": "Finance ERP Application Gateway"},
            {"id": "8", "name": "Encrypted Ledger SQL Database"},
            {"id": "9", "name": "Payroll Processing Server"},
            {"id": "10", "name": "Customer CRM Application Switch"},
            {"id": "11", "name": "VoIP PBX Telephony Gateway"},
            {"id": "12", "name": "Global IT Helpdesk Server"},
            {"id": "13", "name": "Air-Gapped Vault Switch"},
            {"id": "14", "name": "Robotic LTO Tape Archive"},
            {"id": "15", "name": "Disaster Recovery Mirror SAN"}
        ],
        "edges_text": "0 - 1\n1 - 2\n2 - 0\n1 - 3\n2 - 3\n0 - 4\n4 - 5\n5 - 6\n6 - 4\n3 - 7\n7 - 8\n8 - 9\n9 - 7\n9 - 10\n10 - 11\n11 - 12\n12 - 10\n2 - 13\n13 - 14\n14 - 15\n15 - 13"
    }
}

@app.get("/api/assignments")
def get_assignments_list():
    return list(ASSIGNMENTS.values())

@app.get("/api/assignments/{assignment_id}")
def get_assignment_details(assignment_id: str):
    try:
        aid = int(assignment_id)
        if aid in ASSIGNMENTS:
            return ASSIGNMENTS[aid]
    except ValueError:
        pass
    for a in ASSIGNMENTS.values():
        if a.get("preset_id") == assignment_id:
            return a
    return ASSIGNMENTS[1]

# Serve frontend static assets
app.mount("/static", StaticFiles(directory="/home/mani/Tarjan/static"), name="static")

# 1. Landing Page: Always the Explanation Page
@app.get("/")
def serve_index():
    return FileResponse("/home/mani/Tarjan/static/learn.html")

@app.get("/learn")
def serve_learn():
    return FileResponse("/home/mani/Tarjan/static/learn.html")

# 2. GraphStudio Editor at /editor
@app.get("/editor")
def serve_editor():
    return FileResponse("/home/mani/Tarjan/static/index.html")

# 3. Dedicated Assignment Routes
@app.get("/assignment")
def serve_assignment_default():
    return FileResponse("/home/mani/Tarjan/static/assignment_detail.html")

@app.get("/assignment/1")
def serve_assignment_1():
    return FileResponse("/home/mani/Tarjan/static/assignment_detail.html")

@app.get("/assignment/{assignment_id}")
def serve_assignment_by_id(assignment_id: int):
    return FileResponse("/home/mani/Tarjan/static/assignment_detail.html")
