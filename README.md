# Tarjan's Bridge Logic & GraphStudio Visualizer ⚡

> **Interactive Teaching Artifact for Data Structures & Algorithms**  
> Designed for the *Instructional Designer Intern (Programming Courses)* task.  
> Topic: **Tarjan's Algorithm for Bridges and Critical Connections (LeetCode 1192)**

An interactive, 45-minute structured learning experience that transforms graph bridge detection from abstract recursion formulas into an intuitive visual journey.

---

## 🌟 Key Features & Pedagogical Design

### 1. Progressive Explanation Guide (`/`)
- **45-Minute Lesson Blueprint:** Clear time-budgeted roadmap for both self-paced learners and instructor-led cohorts.
- **Intuitive Analogies & Cut-an-Edge Sandbox:** Physical models of highway bypasses, island transit choke points, and critical infrastructure single-points-of-failure.
- **Interactive Naive vs. Tarjan Dual Simulator:** Side-by-side comparison stepping through brute-force $O(E \cdot (V + E))$ vs. Tarjan's optimal $O(V + E)$ single-pass DFS.
- **DFS Tree & Back-Edges:** Visualizes the distinction between forward tree edges and cycle-forming back-edges.
- **Discovery Times (`disc[]`) & Low-Link (`low[]`):** Demystifies the ancestral reachability math behind the condition `low[next] > disc[curr]`.
- **Annotated Java Code:** Clean LeetCode 1192 solution with line-by-line annotations.
- **Formative Knowledge Check:** 3-question conceptual quiz with instant verification and diagnostic feedback.

### 2. GraphStudio Visualizer (`/editor`)
- **50 / 50 Balanced Screen Split:** Left window features the Java Code Tutor; right window features the Interactive Graph Canvas.
- **Python Tutor–Style Call Stack:** Line pointer arrow moves with execution; recursive stack frames render as structured box cards displaying `curr`, `prev`, `disc[]`, `low[]`, and current action banners.
- **Interactive Graph Canvas:** Draggable nodes, stretchable edges, auto-centering, and zoom/pan controls.
- **Edge-Split & Cluster Separation:** Click any edge to isolate connected components and align mutual cycle neighbors vertically along the center axis.

### 3. Five Real-World Curriculum Assignments (`/assignment/1` to `5`)
1. **National Railway Grid:** 16 stations, 20 tracks connecting freight zones.
2. **Hill Station Landslides:** 14 houses, 18 mountain roads prone to monsoon blockages.
3. **Social Network Circles:** 15 student club members with cross-club liaison bridges.
4. **Precision Agriculture IoT Mesh:** 16 vineyard sensors connected by LoRa radio relays.
5. **Corporate Enterprise Network:** 16 core switches and data center server racks.

Each assignment includes problem context, entity specifications, one-click edge list copying, and instant launch in the GraphStudio visualizer.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.9+
- pip

### Installation & Execution

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nanhesrumani/tarjan.git
   cd tarjan
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the application:**
   ```bash
   python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Open in your browser:**
   - **Explanation Guide & Lesson Module:** [http://localhost:8000/](http://localhost:8000/)
   - **GraphStudio Visualizer:** [http://localhost:8000/editor](http://localhost:8000/editor)
   - **Curriculum Assignments:** [http://localhost:8000/assignment/1](http://localhost:8000/assignment/1)

---

## 📁 Repository Structure

```
├── main.py                     # FastAPI backend & assignment routing
├── requirements.txt            # Python dependencies (FastAPI, Uvicorn, NetworkX)
├── README.md                   # Project documentation & instructional design overview
├── .gitignore                  # Git ignore rules
├── algorithms/
│   ├── grader.py               # Graph validation & bridge detection logic
│   ├── layout.py               # Spring / circular layout calculation helpers
│   └── models.py               # Graph and node Pydantic schemas
└── static/
    ├── learn.html              # Primary 45-minute lesson guide & knowledge check
    ├── index.html              # GraphStudio 50/50 visualizer & code tutor
    ├── assignment_detail.html  # Dedicated specs for the 5 curriculum assignments
    ├── css/
    │   └── style.css           # Warm cream & light theme styles and animations
    └── js/
        └── app.js              # Graph simulation engine & Python Tutor-style call stack
```

---
---

## 📄 License
MIT License. Created for the Instructional Designer Intern evaluation task.
