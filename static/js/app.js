/**
 * GraphStudio - Python Tutor Style Java Recursion Visualizer
 * Step-by-step line execution with moving arrow indicator,
 * dynamic recursion stack windows, live graph state synchronization,
 * unvisited node blur, active node light ring, stretchable edges,
 * and 2D bridge / edge split layouts.
 */

// ==========================================
// Global State
// ==========================================
const state = {
  nodes: new Map(), // id -> { id, label, x, y, color, origX, origY, dfn, low }
  edges: [],        // [ { id, source, target, weight, directed } ]
  directed: false,
  selectedElement: null, // { type: 'node' | 'edge', data: ... }
  activeTool: 'select',  // 'select' | 'add_node' | 'connect'
  connectSource: null,   // nodeId when initiating edge
  isDraggingNode: false,
  draggedNodeId: null,
  dragOffset: { x: 0, y: 0 },
  isRubberbanding: false,
  autoSplitOnEdgeClick: true,
  currentSplitAnalysis: null,

  // Viewport Zoom & Pan
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  isPanning: false,
  isFocusMode: false,
  savedLayoutState: null,

  // Python Tutor Engine State
  userCode: '',
  tutorSteps: [],
  currentStepIndex: -1,
  isPlaying: false,
  playbackTimer: null,
  playbackSpeed: 650,
  isEditMode: false
};

const NODE_RADIUS = 24;

const DEFAULT_SOLUTION_CODE = `class Solution {
    int[] disc, low;
    int time = 1;
    List<List<Integer>> ans = new ArrayList<>();
    Map<Integer,List<Integer>> edgeMap = new HashMap<>();
    public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
        disc = new int[n];
        low = new int[n];
        for (int i = 0; i < n; i++)
            edgeMap.put(i, new ArrayList<Integer>());
        for (List<Integer> conn : connections) {
            edgeMap.get(conn.get(0)).add(conn.get(1));
            edgeMap.get(conn.get(1)).add(conn.get(0));
        }
        dfs(0, -1);
        return ans;
    }
    public void dfs(int curr, int prev) {
        disc[curr] = low[curr] = time++;
        for (int next : edgeMap.get(curr)) {
            if (disc[next] == 0) {
                dfs(next, curr);
                low[curr] = Math.min(low[curr], low[next]);
            } else if (next != prev)
                low[curr] = Math.min(low[curr], disc[next]);
            if (low[next] > disc[curr]) 
                ans.add(Arrays.asList(curr, next));
        }
    }
}`;

// ==========================================
// DOM Elements
// ==========================================
const svg = document.getElementById('graph-svg');
const viewportTransform = document.getElementById('viewport-transform');
const nodesLayer = document.getElementById('nodes-layer');
const edgesLayer = document.getElementById('edges-layer');
const rubberband = document.getElementById('rubberband-edge');
const splitDivider = document.getElementById('split-divider');

// Toolbar buttons
const toolSelectBtn = document.getElementById('tool-select');
const toolAddNodeBtn = document.getElementById('tool-add-node');
const toolConnectBtn = document.getElementById('tool-connect');
const toolFitBtn = document.getElementById('tool-fit');
const toolAutoSplitBtn = document.getElementById('tool-auto-split');
const autoSplitStateText = document.getElementById('auto-split-state');

// Zoom & Pan controls
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomLevelBadge = document.getElementById('zoom-level-badge');
const zoomFitBtn = document.getElementById('zoom-fit-btn');
const focusModeBtn = document.getElementById('focus-mode-btn');

// Header elements
const presetSelect = document.getElementById('preset-select');
const toggleDirectedBtn = document.getElementById('toggle-directed-btn');
const directedIcon = document.getElementById('directed-icon');
const directedLabel = document.getElementById('directed-label');
const layoutSelect = document.getElementById('layout-select');
const clearGraphBtn = document.getElementById('clear-graph-btn');
const toggleLeftBtn = document.getElementById('toggle-left-btn');
const toggleRightBtn = document.getElementById('toggle-right-btn');
const toggleBottomBtn = document.getElementById('toggle-bottom-btn');

// Resizers & Sidebars
const leftSidebar = document.getElementById('left-sidebar');
const leftSidebarResizer = document.getElementById('left-sidebar-resizer');
const closeLeftSidebar = document.getElementById('close-left-sidebar');
const dockLeftBtn = document.getElementById('dock-left-btn');
const rightSidebar = document.getElementById('right-sidebar');
const rightSidebarResizer = document.getElementById('right-sidebar-resizer');
const closeRightSidebar = document.getElementById('close-right-sidebar');
const dockRightBtn = document.getElementById('dock-right-btn');

// Bottom Panel
const bottomPanel = document.getElementById('bottom-panel');
const bottomResizer = document.getElementById('bottom-resizer');
const toggleBottomMinimizeBtn = document.getElementById('toggle-bottom-minimize-btn');
const btabButtons = document.querySelectorAll('.btab-btn');
const btabPanes = document.querySelectorAll('.btab-pane');
const terminalContainer = document.getElementById('terminal-container');
const clearTerminalBtn = document.getElementById('clear-terminal-btn');

// Sidebar Tabs (Left)
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Manual Input Elements
const manualNodeId = document.getElementById('manual-node-id');
const manualAddNodeBtn = document.getElementById('manual-add-node-btn');
const manualEdgeFrom = document.getElementById('manual-edge-from');
const manualEdgeTo = document.getElementById('manual-edge-to');
const manualEdgeWeight = document.getElementById('manual-edge-weight');
const manualAddEdgeBtn = document.getElementById('manual-add-edge-btn');
const selectionDetails = document.getElementById('selection-details');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const splitSelectedEdgeBtn = document.getElementById('split-selected-edge-btn');

// Batch Text Elements
const batchEdgeText = document.getElementById('batch-edge-text');
const applyBatchTextBtn = document.getElementById('apply-batch-text-btn');
const batchParseStatus = document.getElementById('batch-parse-status');

// Bottom Split Panel Elements
const bridgeStatusBadge = document.getElementById('bridge-status-badge');
const applySplitLayoutBtn = document.getElementById('apply-split-layout-btn');
const resetSplitLayoutBtn = document.getElementById('reset-split-layout-btn');
const splitLeftNodes = document.getElementById('split-left-nodes');
const splitCenterNodes = document.getElementById('split-center-nodes');
const splitRightNodes = document.getElementById('split-right-nodes');
const leftCountBadge = document.getElementById('left-count-badge');
const centerCountBadge = document.getElementById('center-count-badge');
const rightCountBadge = document.getElementById('right-count-badge');

// Python Tutor Elements in Right Sidebar
const runVisualizerBtn = document.getElementById('run-visualizer-btn');
const resetCodeBtn = document.getElementById('reset-code-btn');
const toggleEditModeBtn = document.getElementById('toggle-edit-mode-btn');
const javaCodeEditor = document.getElementById('java-code-editor');
const codeViewerContainer = document.getElementById('code-viewer-container');
const codeLinesWrapper = document.getElementById('code-lines-wrapper');
const recursionWindowsContainer = document.getElementById('recursion-windows-container');
const recDepthBadge = document.getElementById('rec-depth-badge');

// Playback Controls
const playbackPrevBtn = document.getElementById('playback-prev');
const playbackPlayBtn = document.getElementById('playback-play');
const playbackNextBtn = document.getElementById('playback-next');
const playbackSpeedInput = document.getElementById('playback-speed');
const stepCounterBadge = document.getElementById('step-counter-badge');
const stepDescriptionText = document.getElementById('step-description-text');
const callStackList = document.getElementById('call-stack-list');
const tarjanStackList = document.getElementById('tarjan-stack-list');

// ==========================================
// Initialization & Resizers
// ==========================================

function init() {
  setupTabs();
  setupBottomTabs();
  setupToolbar();
  setupCanvasEvents();
  setupManualInputs();
  setupBatchTextInput();
  setupResizers();
  setupSidebarToggles();
  setupSplitPanelActions();
  setupCodeTutor();
  setupPlaybackControls();
  setupZoomAndPan();

  // Load preset from URL query parameter or default to bridge_example
  const urlParams = new URLSearchParams(window.location.search);
  const requestedPreset = urlParams.get('preset') || 'bridge_example';
  loadPreset(requestedPreset);
  if (presetSelect && presetSelect.querySelector(`option[value="${requestedPreset}"]`)) {
    presetSelect.value = requestedPreset;
  }

  // Open Code Tutor on the left in a 50/50 screen split, and minimize Graph Tools on the right
  openLeft();
  closeRight();
  if (toggleLeftBtn) toggleLeftBtn.classList.add('active');
  if (toggleRightBtn) toggleRightBtn.classList.remove('active');

  // Automatically fit graph and prepare tutor steps on launch
  setTimeout(() => {
    fitGraphToViewport();
    generateTutorSteps();
  }, 300);
}

// Resizable Sidebar, Right Sidebar, & Bottom Panel
function setupResizers() {
  // 1. Left Sidebar Resizer (Code Tutor on Left)
  let isResizingLeft = false;
  if (leftSidebarResizer) {
    leftSidebarResizer.addEventListener('pointerdown', (e) => {
      isResizingLeft = true;
      leftSidebarResizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      leftSidebarResizer.setPointerCapture(e.pointerId);
    });

    window.addEventListener('pointermove', (e) => {
      if (isResizingLeft && leftSidebar) {
        const newWidth = Math.max(300, Math.min(e.clientX, window.innerWidth * 0.8));
        leftSidebar.style.width = newWidth + 'px';
      }
    });

    window.addEventListener('pointerup', () => {
      if (isResizingLeft) {
        isResizingLeft = false;
        leftSidebarResizer.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }

  // 2. Right Sidebar Resizer (Graph Tools on Right)
  let isResizingRight = false;
  if (rightSidebarResizer) {
    rightSidebarResizer.addEventListener('pointerdown', (e) => {
      isResizingRight = true;
      rightSidebarResizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      rightSidebarResizer.setPointerCapture(e.pointerId);
    });

    window.addEventListener('pointermove', (e) => {
      if (isResizingRight && rightSidebar) {
        const newWidth = Math.max(220, Math.min(window.innerWidth - e.clientX, 650));
        rightSidebar.style.width = newWidth + 'px';
      }
    });

    window.addEventListener('pointerup', () => {
      if (isResizingRight) {
        isResizingRight = false;
        rightSidebarResizer.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }

  // 3. Bottom Panel Resizer
  let isResizingBottom = false;
  if (bottomResizer) {
    bottomResizer.addEventListener('pointerdown', (e) => {
      isResizingBottom = true;
      bottomResizer.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      bottomResizer.setPointerCapture(e.pointerId);
    });

    window.addEventListener('pointermove', (e) => {
      if (isResizingBottom && bottomPanel) {
        const newHeight = Math.max(48, Math.min(window.innerHeight - e.clientY, 550));
        bottomPanel.style.height = newHeight + 'px';
      }
    });

    window.addEventListener('pointerup', () => {
      if (isResizingBottom) {
        isResizingBottom = false;
        bottomResizer.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }
}

// Sidebars & Bottom Panel Minimizing / Collapsing
function openLeft() {
  if (!leftSidebar) return;
  leftSidebar.classList.remove('closed');
  if (leftSidebarResizer) leftSidebarResizer.style.display = 'block';
  if (dockLeftBtn) dockLeftBtn.style.display = 'none';
  if (toggleLeftBtn) toggleLeftBtn.classList.add('active');
}

function closeLeft() {
  if (!leftSidebar) return;
  leftSidebar.classList.add('closed');
  if (leftSidebarResizer) leftSidebarResizer.style.display = 'none';
  if (dockLeftBtn) dockLeftBtn.style.display = 'flex';
  if (toggleLeftBtn) toggleLeftBtn.classList.remove('active');
}

function openRight() {
  if (!rightSidebar) return;
  rightSidebar.classList.remove('closed');
  if (rightSidebarResizer) rightSidebarResizer.style.display = 'block';
  if (dockRightBtn) dockRightBtn.style.display = 'none';
  if (toggleRightBtn) toggleRightBtn.classList.add('active');
}

function closeRight() {
  if (!rightSidebar) return;
  rightSidebar.classList.add('closed');
  if (rightSidebarResizer) rightSidebarResizer.style.display = 'none';
  if (dockRightBtn) dockRightBtn.style.display = 'flex';
  if (toggleRightBtn) toggleRightBtn.classList.remove('active');
}

function minimizeBottom() {
  if (!bottomPanel) return;
  bottomPanel.classList.add('minimized');
  if (bottomResizer) bottomResizer.style.display = 'none';
  if (toggleBottomMinimizeBtn) toggleBottomMinimizeBtn.innerHTML = '▲ Expand';
  if (toggleBottomBtn) toggleBottomBtn.classList.remove('active');
}

function expandBottom() {
  if (!bottomPanel) return;
  bottomPanel.classList.remove('minimized');
  bottomPanel.classList.remove('closed');
  if (bottomResizer) bottomResizer.style.display = 'block';
  if (toggleBottomMinimizeBtn) toggleBottomMinimizeBtn.innerHTML = '▼ Minimize';
  if (toggleBottomBtn) toggleBottomBtn.classList.add('active');
}

// Left & Right Sidebar Toggles
function setupSidebarToggles() {
  if (toggleLeftBtn && leftSidebar) {
    toggleLeftBtn.addEventListener('click', () => {
      if (leftSidebar.classList.contains('closed')) openLeft();
      else closeLeft();
    });
  }

  if (closeLeftSidebar && leftSidebar) {
    closeLeftSidebar.addEventListener('click', closeLeft);
  }

  if (dockLeftBtn) {
    dockLeftBtn.addEventListener('click', openLeft);
  }

  if (toggleRightBtn && rightSidebar) {
    toggleRightBtn.addEventListener('click', () => {
      if (rightSidebar.classList.contains('closed')) openRight();
      else closeRight();
    });
  }

  if (closeRightSidebar && rightSidebar) {
    closeRightSidebar.addEventListener('click', closeRight);
  }

  if (dockRightBtn) {
    dockRightBtn.addEventListener('click', openRight);
  }

  if (toggleBottomMinimizeBtn && bottomPanel) {
    toggleBottomMinimizeBtn.addEventListener('click', () => {
      if (bottomPanel.classList.contains('minimized')) expandBottom();
      else minimizeBottom();
    });
  }

  if (toggleBottomBtn && bottomPanel) {
    toggleBottomBtn.addEventListener('click', () => {
      if (bottomPanel.classList.contains('minimized')) expandBottom();
      else minimizeBottom();
    });
  }
}

// Left Sidebar Tab switching
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => (p.style.display = 'none'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.style.display = 'block';
    });
  });
}

// Bottom Panel Tab switching
function setupBottomTabs() {
  btabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (bottomPanel && bottomPanel.classList.contains('minimized')) {
        expandBottom();
      }
      switchBottomTab(btn.dataset.btab);
    });
  });

  if (clearTerminalBtn && terminalContainer) {
    clearTerminalBtn.addEventListener('click', () => {
      terminalContainer.innerHTML = '<div class="terminal-line"><span class="terminal-prompt">$</span> Terminal cleared. Ready.</div>';
    });
  }
}

function switchBottomTab(tabId) {
  btabButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.btab === tabId);
  });
  btabPanes.forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
}

// Terminal logger
function logTerminal(text, type = 'info') {
  if (!terminalContainer) return;
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;

  if (type === 'command') {
    line.innerHTML = `<span class="terminal-prompt">$</span> ${escapeHtml(text)}`;
  } else if (type === 'error') {
    line.innerHTML = `<span style="color: #ef4444;">✗</span> ${escapeHtml(text)}`;
  } else if (type === 'success') {
    line.innerHTML = `<span style="color: #10b981;">✓</span> ${escapeHtml(text)}`;
  } else {
    line.textContent = text;
  }

  terminalContainer.appendChild(line);
  terminalContainer.scrollTop = terminalContainer.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Toolbar modes
function setupToolbar() {
  toolSelectBtn.addEventListener('click', () => setTool('select'));
  toolAddNodeBtn.addEventListener('click', () => setTool('add_node'));
  toolConnectBtn.addEventListener('click', () => setTool('connect'));
  toolFitBtn.addEventListener('click', () => applyAutoLayout('spring'));

  toolAutoSplitBtn.addEventListener('click', () => {
    state.autoSplitOnEdgeClick = !state.autoSplitOnEdgeClick;
    autoSplitStateText.textContent = state.autoSplitOnEdgeClick ? 'ON' : 'OFF';
    autoSplitStateText.style.color = state.autoSplitOnEdgeClick ? 'var(--accent-cyan)' : 'var(--text-muted)';
  });

  toggleDirectedBtn.addEventListener('click', () => {
    state.directed = !state.directed;
    directedIcon.textContent = state.directed ? '➔' : '—';
    directedLabel.textContent = state.directed ? 'Directed' : 'Undirected';
    state.edges.forEach(e => (e.directed = state.directed));
    render();
  });

  layoutSelect.addEventListener('change', (e) => {
    applyAutoLayout(e.target.value);
  });

  clearGraphBtn.addEventListener('click', () => {
    if (confirm('Clear the entire graph?')) {
      state.nodes.clear();
      state.edges = [];
      clearSelection();
      render();
    }
  });

  presetSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value);
    presetSelect.value = '';
  });
}

function setTool(toolName) {
  state.activeTool = toolName;
  toolSelectBtn.classList.toggle('active', toolName === 'select');
  toolAddNodeBtn.classList.toggle('active', toolName === 'add_node');
  toolConnectBtn.classList.toggle('active', toolName === 'connect');
  svg.classList.toggle('connecting', toolName === 'connect');

  if (toolName !== 'connect') {
    cancelConnect();
  }
}

// ==========================================
// Viewport Zoom, Pan & Auto-Fit
// ==========================================

function applyViewportTransform() {
  if (viewportTransform) {
    viewportTransform.setAttribute(
      'transform',
      `translate(${state.pan.x.toFixed(2)}, ${state.pan.y.toFixed(2)}) scale(${state.zoom.toFixed(4)})`
    );
  }
  if (zoomLevelBadge) {
    zoomLevelBadge.textContent = `${Math.round(state.zoom * 100)}%`;
  }
}

function zoomAt(factor, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  const mouseX = (clientX !== undefined) ? (clientX - rect.left) : (rect.width / 2);
  const mouseY = (clientY !== undefined) ? (clientY - rect.top) : (rect.height / 2);

  const oldZoom = state.zoom;
  const newZoom = Math.max(0.15, Math.min(oldZoom * factor, 6.0));
  if (Math.abs(newZoom - oldZoom) < 0.001) return;

  state.pan.x = mouseX - (mouseX - state.pan.x) * (newZoom / oldZoom);
  state.pan.y = mouseY - (mouseY - state.pan.y) * (newZoom / oldZoom);
  state.zoom = newZoom;

  applyViewportTransform();
}

function fitGraphToViewport() {
  if (state.nodes.size === 0) {
    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
    applyViewportTransform();
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  state.nodes.forEach(node => {
    minX = Math.min(minX, node.x - NODE_RADIUS - 20);
    maxX = Math.max(maxX, node.x + NODE_RADIUS + 20);
    minY = Math.min(minY, node.y - NODE_RADIUS - 35);
    maxY = Math.max(maxY, node.y + NODE_RADIUS + 35);
  });

  const graphWidth = Math.max(80, maxX - minX);
  const graphHeight = Math.max(80, maxY - minY);
  const graphCenterX = (minX + maxX) / 2;
  const graphCenterY = (minY + maxY) / 2;

  const rect = svg.getBoundingClientRect();
  const viewWidth = rect.width || 800;
  const viewHeight = rect.height || 500;

  const padding = 70;
  const availWidth = Math.max(100, viewWidth - padding * 2);
  const availHeight = Math.max(100, viewHeight - padding * 2);

  const scaleX = availWidth / graphWidth;
  const scaleY = availHeight / graphHeight;
  const targetZoom = Math.max(0.25, Math.min(Math.min(scaleX, scaleY), 1.6));

  state.zoom = targetZoom;
  state.pan.x = viewWidth / 2 - graphCenterX * targetZoom;
  state.pan.y = viewHeight / 2 - graphCenterY * targetZoom;

  applyViewportTransform();
}

function setupZoomAndPan() {
  // Wheel Zoom centered at cursor
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    zoomAt(zoomFactor, e.clientX, e.clientY);
  }, { passive: false });

  // Zoom Buttons
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomAt(1.25));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomAt(0.8));
  if (zoomLevelBadge) {
    zoomLevelBadge.addEventListener('click', () => {
      state.zoom = 1.0;
      state.pan = { x: 0, y: 0 };
      applyViewportTransform();
    });
  }
  if (zoomFitBtn) zoomFitBtn.addEventListener('click', () => fitGraphToViewport());
  if (toolFitBtn) toolFitBtn.addEventListener('click', () => fitGraphToViewport());

  // Focus Mode (Maximize Graph Canvas)
  if (focusModeBtn) {
    focusModeBtn.addEventListener('click', () => {
      if (!state.isFocusMode) {
        state.isFocusMode = true;
        state.savedLayoutState = {
          leftOpen: leftSidebar ? !leftSidebar.classList.contains('closed') : true,
          rightOpen: rightSidebar ? !rightSidebar.classList.contains('closed') : true,
          bottomMinimized: bottomPanel ? bottomPanel.classList.contains('minimized') : false
        };
        closeLeft();
        closeRight();
        minimizeBottom();
        focusModeBtn.classList.add('active');
        focusModeBtn.innerHTML = '⛶ Exit Focus';
        setTimeout(() => fitGraphToViewport(), 260);
      } else {
        state.isFocusMode = false;
        if (state.savedLayoutState?.leftOpen) openLeft();
        if (state.savedLayoutState?.rightOpen) openRight();
        if (!state.savedLayoutState?.bottomMinimized) expandBottom();
        focusModeBtn.classList.remove('active');
        focusModeBtn.innerHTML = '⛶ Focus';
        setTimeout(() => fitGraphToViewport(), 260);
      }
    });
  }
}

// ==========================================
// Canvas Gestures & Stretchable Connection
// ==========================================

function setupCanvasEvents() {
  let isCanvasPanning = false;
  let panOrigin = { x: 0, y: 0 };
  let initialPanCoords = { x: 0, y: 0 };
  let hasMovedPan = false;

  svg.addEventListener('pointerdown', (e) => {
    // If clicking on node or in connect mode with source selected, don't pan canvas
    if (e.target.closest && e.target.closest('.node-group')) return;
    if (state.activeTool === 'connect' && state.connectSource) return;

    if (e.button === 0 || e.button === 1) {
      isCanvasPanning = true;
      hasMovedPan = false;
      panOrigin = { x: e.clientX, y: e.clientY };
      initialPanCoords = { x: state.pan.x, y: state.pan.y };
      svg.style.cursor = 'grabbing';
    }
  });

  // Double-click canvas to create a node
  svg.addEventListener('dblclick', (e) => {
    if (e.target.closest && e.target.closest('.node-group')) return;
    const pt = getSvgCoords(e);
    addNodeAtPosition(pt.x, pt.y);
  });

  // Single click canvas - with snap to nearby edges
  svg.addEventListener('click', (e) => {
    if (hasMovedPan) return; // Ignore click if user was dragging to pan
    if (e.target.closest && e.target.closest('.node-group')) return;

    const pt = getSvgCoords(e);
    if (state.activeTool === 'add_node') {
      addNodeAtPosition(pt.x, pt.y);
    } else if (state.activeTool === 'select') {
      const nearbyEdge = findClosestEdge(pt.x, pt.y, 22);
      if (nearbyEdge) {
        selectElement('edge', nearbyEdge);
      } else {
        clearSelection();
      }
    } else {
      clearSelection();
    }
  });

  // Pointer move: handles dragging nodes OR rubberband edge stretching OR canvas panning
  window.addEventListener('pointermove', (e) => {
    if (state.isDraggingNode && state.draggedNodeId) {
      const node = state.nodes.get(state.draggedNodeId);
      if (node) {
        const pt = getSvgCoords(e);
        node.x = pt.x - state.dragOffset.x;
        node.y = pt.y - state.dragOffset.y;
        updateGraphGeometry();
      }
    } else if (state.isRubberbanding && state.connectSource) {
      const sourceNode = state.nodes.get(state.connectSource);
      if (sourceNode) {
        const pt = getSvgCoords(e);
        rubberband.setAttribute('x1', sourceNode.x);
        rubberband.setAttribute('y1', sourceNode.y);
        rubberband.setAttribute('x2', pt.x);
        rubberband.setAttribute('y2', pt.y);
        rubberband.style.display = 'block';
      }
    } else if (isCanvasPanning) {
      const dx = e.clientX - panOrigin.x;
      const dy = e.clientY - panOrigin.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedPan = true;
      }
      state.pan.x = initialPanCoords.x + dx;
      state.pan.y = initialPanCoords.y + dy;
      applyViewportTransform();
    }
  });

  // Pointer up: release dragged node, cancel rubberband, or end canvas pan
  window.addEventListener('pointerup', () => {
    if (state.isDraggingNode) {
      state.isDraggingNode = false;
      state.draggedNodeId = null;
    }
    if (state.isRubberbanding && state.activeTool !== 'connect') {
      cancelConnect();
    }
    if (isCanvasPanning) {
      isCanvasPanning = false;
      svg.style.cursor = '';
    }
  });

  // Keyboard shortcut: Delete selected node/edge
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElement) {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        deleteSelected();
      }
    }
  });
}

function getSvgCoords(e) {
  const rect = svg.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  return {
    x: (mouseX - state.pan.x) / state.zoom,
    y: (mouseY - state.pan.y) / state.zoom
  };
}

// Add node helper
function addNodeAtPosition(x, y, customId = null) {
  let id = customId;
  if (!id) {
    let index = state.nodes.size;
    while (state.nodes.has(String(index))) {
      index++;
    }
    id = String(index);
  }

  if (state.nodes.has(id)) {
    alert(`Node '${id}' already exists!`);
    return null;
  }

  const newNode = {
    id: id,
    label: id,
    x: Math.round(x),
    y: Math.round(y),
    color: null,
    dfn: null,
    low: null
  };

  state.nodes.set(id, newNode);
  render();
  selectElement('node', newNode);
  return newNode;
}

// Add edge helper
function addEdge(source, target, weight = 1.0) {
  if (!state.nodes.has(source) || !state.nodes.has(target)) {
    alert('Both source and target nodes must exist!');
    return null;
  }

  const existing = state.edges.find(e => 
    (e.source === source && e.target === target) ||
    (!state.directed && e.source === target && e.target === source)
  );

  if (existing) {
    existing.weight = weight;
    render();
    return existing;
  }

  const edge = {
    id: `${source}->${target}`,
    source: source,
    target: target,
    weight: weight,
    directed: state.directed
  };

  state.edges.push(edge);
  render();
  selectElement('edge', edge);
  return edge;
}

// ==========================================
// Rendering: Stretchable Edges & Nodes with Light Ring
// ==========================================

function render() {
  renderEdges();
  renderNodes();
  updateSelectionUI();
  applyViewportTransform();
}

function updateGraphGeometry() {
  state.nodes.forEach(node => {
    const group = document.getElementById(`node-group-${node.id}`);
    if (group) {
      group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    }
  });

  state.edges.forEach(edge => {
    const pathElem = document.getElementById(`edge-path-${edge.source}-${edge.target}`);
    const hitboxElem = document.getElementById(`edge-hitbox-${edge.source}-${edge.target}`);
    const textElem = document.getElementById(`edge-label-${edge.source}-${edge.target}`);
    if (pathElem) {
      const geom = calculateEdgeGeometry(edge);
      if (geom) {
        pathElem.setAttribute('d', geom.pathD);
        if (hitboxElem) hitboxElem.setAttribute('d', geom.pathD);
        if (textElem && geom.midX !== undefined) {
          textElem.setAttribute('x', geom.midX);
          textElem.setAttribute('y', geom.midY - 12);
        }
      }
    }
  });
}

function renderEdges() {
  edgesLayer.innerHTML = '';

  state.edges.forEach(edge => {
    const geom = calculateEdgeGeometry(edge);
    if (!geom) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'edge-group');

    // 1. Transparent wide hit-area (14px wide) for effortless clicking
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitbox.setAttribute('id', `edge-hitbox-${edge.source}-${edge.target}`);
    hitbox.setAttribute('class', 'edge-hitbox');
    hitbox.setAttribute('d', geom.pathD);

    // 2. Visible aesthetic edge path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `edge-path-${edge.source}-${edge.target}`);
    path.setAttribute('class', 'edge-path');
    path.setAttribute('d', geom.pathD);
    if (state.directed) {
      path.setAttribute('marker-end', 'url(#arrowhead)');
    }

    // Hover feedback
    hitbox.addEventListener('mouseenter', () => path.classList.add('hovered'));
    hitbox.addEventListener('mouseleave', () => path.classList.remove('hovered'));

    const onEdgeClick = (e) => {
      e.stopPropagation();
      edgesLayer.appendChild(g);
      selectElement('edge', edge);
    };

    hitbox.addEventListener('click', onEdgeClick);
    path.addEventListener('click', onEdgeClick);

    g.appendChild(hitbox);
    g.appendChild(path);

    // Optional weight label
    if (edge.weight !== 1.0 && geom.midX !== undefined) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('id', `edge-label-${edge.source}-${edge.target}`);
      text.setAttribute('class', 'edge-label');
      text.setAttribute('x', geom.midX);
      text.setAttribute('y', geom.midY - 12);
      text.textContent = edge.weight;
      g.appendChild(text);
    }

    edgesLayer.appendChild(g);
  });
}

function calculateEdgeGeometry(edge) {
  const u = state.nodes.get(edge.source);
  const v = state.nodes.get(edge.target);
  if (!u || !v) return null;

  if (edge.source === edge.target) {
    const r = NODE_RADIUS;
    const x0 = u.x - r * 0.5;
    const y0 = u.y - r * 0.866;
    const x1 = u.x + r * 0.5;
    const y1 = u.y - r * 0.866;
    const cpX1 = u.x - 35;
    const cpY1 = u.y - 65;
    const cpX2 = u.x + 35;
    const cpY2 = u.y - 65;
    return {
      pathD: `M ${x0} ${y0} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x1} ${y1}`,
      midX: u.x,
      midY: u.y - 70
    };
  }

  const hasReverse = state.edges.some(e => e.source === edge.target && e.target === edge.source);

  const dx = v.x - u.x;
  const dy = v.y - u.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return { pathD: `M ${u.x} ${u.y} L ${v.x} ${v.y}` };

  const ux = dx / dist;
  const uy = dy / dist;

  const startX = u.x + ux * NODE_RADIUS;
  const startY = u.y + uy * NODE_RADIUS;
  const endX = v.x - ux * (NODE_RADIUS + (state.directed ? 6 : 0));
  const endY = v.y - uy * (NODE_RADIUS + (state.directed ? 6 : 0));

  if (!hasReverse) {
    return {
      pathD: `M ${startX} ${startY} L ${endX} ${endY}`,
      startX, startY, endX, endY,
      isCurved: false,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2 - 8
    };
  } else {
    const perpX = -uy * 28;
    const perpY = ux * 28;
    const ctrlX = (u.x + v.x) / 2 + perpX;
    const ctrlY = (u.y + v.y) / 2 + perpY;

    const angleToEnd = Math.atan2(endY - ctrlY, endX - ctrlX);
    const adjustedEndX = v.x - Math.cos(angleToEnd) * (NODE_RADIUS + (state.directed ? 6 : 0));
    const adjustedEndY = v.y - Math.sin(angleToEnd) * (NODE_RADIUS + (state.directed ? 6 : 0));

    return {
      pathD: `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${adjustedEndX} ${adjustedEndY}`,
      startX, startY, endX: adjustedEndX, endY: adjustedEndY,
      ctrlX, ctrlY,
      isCurved: true,
      midX: ctrlX,
      midY: ctrlY - 8
    };
  }
}

function renderNodes() {
  nodesLayer.innerHTML = '';

  state.nodes.forEach(node => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', `node-group-${node.id}`);
    g.setAttribute('class', 'node-group');
    g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    // Light Ring around Active Node
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('class', 'node-ring');
    ring.setAttribute('r', NODE_RADIUS + 8);
    ring.setAttribute('cx', 0);
    ring.setAttribute('cy', 0);
    g.appendChild(ring);

    // Main Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'node-circle');
    circle.setAttribute('r', NODE_RADIUS);
    if (node.color) {
      circle.style.fill = node.color;
    }
    g.appendChild(circle);

    // Node Port (Cyan circle handle for pulling edges)
    const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    port.setAttribute('class', 'node-port');
    port.setAttribute('cx', NODE_RADIUS - 3);
    port.setAttribute('cy', 0);
    port.setAttribute('r', 6);
    port.setAttribute('title', 'Drag to connect to another node');
    g.appendChild(port);

    // Node Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'node-label');
    text.textContent = node.label || node.id;
    g.appendChild(text);

    // Live Discovery Time & Low-Link Badge [dfn: X | low: Y]
    const badgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    badgeGroup.setAttribute('id', `node-badge-${node.id}`);
    badgeGroup.setAttribute('class', 'node-badge-group');

    const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeRect.setAttribute('id', `node-badge-rect-${node.id}`);
    badgeRect.setAttribute('class', 'node-badge-rect');
    badgeRect.setAttribute('x', -34);
    badgeRect.setAttribute('y', NODE_RADIUS + 4);
    badgeRect.setAttribute('width', 68);
    badgeRect.setAttribute('height', 18);
    badgeRect.setAttribute('rx', 4);
    badgeRect.setAttribute('ry', 4);

    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('id', `node-badge-text-${node.id}`);
    badgeText.setAttribute('class', 'node-badge-text');
    badgeText.setAttribute('x', 0);
    badgeText.setAttribute('y', NODE_RADIUS + 13);
    const dVal = (node.dfn !== undefined && node.dfn !== null) ? node.dfn : '-';
    const lVal = (node.low !== undefined && node.low !== null) ? node.low : '-';
    badgeText.textContent = `dfn:${dVal} low:${lVal}`;

    badgeGroup.appendChild(badgeRect);
    badgeGroup.appendChild(badgeText);
    g.appendChild(badgeGroup);

    // Drag events
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();

      if (e.target === port || state.activeTool === 'connect') {
        startConnect(node.id, e);
        return;
      }

      state.isDraggingNode = true;
      state.draggedNodeId = node.id;
      const pt = getSvgCoords(e);
      state.dragOffset = {
        x: pt.x - node.x,
        y: pt.y - node.y
      };
      selectElement('node', node);
    });

    g.addEventListener('pointerup', () => {
      if (state.isRubberbanding && state.connectSource && state.connectSource !== node.id) {
        addEdge(state.connectSource, node.id);
        cancelConnect();
      }
    });

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.activeTool === 'connect') {
        if (!state.connectSource) {
          state.connectSource = node.id;
          g.classList.add('selected');
        } else if (state.connectSource !== node.id) {
          addEdge(state.connectSource, node.id);
          cancelConnect();
        }
      } else {
        selectElement('node', node);
      }
    });

    nodesLayer.appendChild(g);
  });
}

function startConnect(sourceId, e) {
  state.isRubberbanding = true;
  state.connectSource = sourceId;
  const src = state.nodes.get(sourceId);
  const pt = getSvgCoords(e);
  rubberband.setAttribute('x1', src.x);
  rubberband.setAttribute('y1', src.y);
  rubberband.setAttribute('x2', pt.x);
  rubberband.setAttribute('y2', pt.y);
  rubberband.style.display = 'block';
}

function cancelConnect() {
  state.isRubberbanding = false;
  state.connectSource = null;
  rubberband.style.display = 'none';
  document.querySelectorAll('.node-group').forEach(el => el.classList.remove('selected'));
}

// ==========================================
// Selection & Edge Split Bridge Analysis
// ==========================================

function findClosestEdge(px, py, maxDist = 18) {
  let closestEdge = null;
  let minDist = maxDist;

  state.edges.forEach(edge => {
    const geom = calculateEdgeGeometry(edge);
    if (!geom) return;

    let dist;
    if (geom.isCurved) {
      dist = bezierDistance(px, py, geom.startX, geom.startY, geom.ctrlX, geom.ctrlY, geom.endX, geom.endY);
    } else {
      dist = distToSegment(px, py, geom.startX, geom.startY, geom.endX, geom.endY);
    }

    if (dist < minDist) {
      minDist = dist;
      closestEdge = edge;
    }
  });

  return closestEdge;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function bezierDistance(px, py, x0, y0, cx, cy, x1, y1) {
  let minD = Infinity;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x1;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y1;
    const d = Math.hypot(px - x, py - y);
    if (d < minD) minD = d;
  }
  return minD;
}

function selectElement(type, data) {
  clearSelection(false);
  state.selectedElement = { type, data };

  if (type === 'node') {
    const el = document.getElementById(`node-group-${data.id}`);
    if (el) el.classList.add('selected');

    const dfnStr = data.dfn !== null && data.dfn !== undefined ? data.dfn : '-';
    const lowStr = data.low !== null && data.low !== undefined ? data.low : '-';
    selectionDetails.innerHTML = `
      <div style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem; margin-bottom: 0.3rem;">Node: ${escapeHtml(data.id)}</div>
      <div>Discovery Time (disc): <strong>${dfnStr}</strong></div>
      <div>Low-Link Value (low): <strong>${lowStr}</strong></div>
      <div>Position: (${Math.round(data.x)}, ${Math.round(data.y)})</div>
    `;
    deleteSelectedBtn.style.display = 'block';
    splitSelectedEdgeBtn.style.display = 'none';

  } else if (type === 'edge') {
    const edgePaths = [
      document.getElementById(`edge-path-${data.source}-${data.target}`),
      !state.directed ? document.getElementById(`edge-path-${data.target}-${data.source}`) : null
    ];
    edgePaths.forEach(p => { if (p) p.classList.add('selected'); });

    selectionDetails.innerHTML = `
      <div style="font-weight: 700; color: var(--accent-yellow); font-size: 0.95rem; margin-bottom: 0.3rem;">Edge: ${escapeHtml(data.source)} ${state.directed ? '➔' : '—'} ${escapeHtml(data.target)}</div>
      <div>Weight: <strong>${data.weight}</strong></div>
      <div>Directed: <strong>${state.directed ? 'Yes' : 'No'}</strong></div>
    `;
    deleteSelectedBtn.style.display = 'block';
    splitSelectedEdgeBtn.style.display = 'block';

    analyzeEdgeSplit(data);

    if (state.autoSplitOnEdgeClick) {
      applySplitLayout();
    }
  }
}

function clearSelection(resetVisuals = true) {
  if (resetVisuals) {
    document.querySelectorAll('.node-group').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.edge-path').forEach(el => el.classList.remove('selected'));
    selectionDetails.innerHTML = 'Click any node or edge to inspect or test bridge separation.';
    deleteSelectedBtn.style.display = 'none';
    splitSelectedEdgeBtn.style.display = 'none';
    state.selectedElement = null;
  }
}

function deleteSelected() {
  if (!state.selectedElement) return;

  if (state.selectedElement.type === 'node') {
    const nodeId = state.selectedElement.data.id;
    state.nodes.delete(nodeId);
    state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  } else if (state.selectedElement.type === 'edge') {
    const e = state.selectedElement.data;
    state.edges = state.edges.filter(edge => 
      !(edge.source === e.source && edge.target === e.target) &&
      !(!state.directed && edge.source === e.target && edge.target === e.source)
    );
  }

  clearSelection();
  render();
}

function analyzeEdgeSplit(edge) {
  const u = edge.source;
  const v = edge.target;

  const adj = new Map();
  state.nodes.forEach(n => adj.set(n.id, []));

  state.edges.forEach(e => {
    const isChosenEdge = (e.source === u && e.target === v) || (!state.directed && e.source === v && e.target === u);
    if (!isChosenEdge) {
      if (adj.has(e.source)) adj.get(e.source).push(e.target);
      if (!state.directed && adj.has(e.target)) adj.get(e.target).push(e.source);
    }
  });

  const uNeighbors = new Set(state.edges.filter(e => e.source === u || (!state.directed && e.target === u)).map(e => e.source === u ? e.target : e.source));
  const vNeighbors = new Set(state.edges.filter(e => e.source === v || (!state.directed && e.target === v)).map(e => e.source === v ? e.target : e.source));

  const centerNodes = [];
  state.nodes.forEach(node => {
    if (node.id !== u && node.id !== v) {
      if (uNeighbors.has(node.id) && vNeighbors.has(node.id)) {
        centerNodes.push(node.id);
      }
    }
  });
  const centerSet = new Set(centerNodes);

  function getDistances(startNode) {
    const dists = new Map();
    dists.set(startNode, 0);
    const queue = [startNode];
    while (queue.length > 0) {
      const curr = queue.shift();
      const d = dists.get(curr);
      (adj.get(curr) || []).forEach(nbr => {
        if (!dists.has(nbr)) {
          dists.set(nbr, d + 1);
          queue.push(nbr);
        }
      });
    }
    return dists;
  }

  const distU = getDistances(u);
  const distV = getDistances(v);
  const isBridge = !distU.has(v);

  const leftNodes = [u];
  const rightNodes = [v];

  state.nodes.forEach(node => {
    const nid = node.id;
    if (nid === u || nid === v || centerSet.has(nid)) return;

    const du = distU.has(nid) ? distU.get(nid) : Infinity;
    const dv = distV.has(nid) ? distV.get(nid) : Infinity;

    if (du < dv) {
      leftNodes.push(nid);
    } else if (dv < du) {
      rightNodes.push(nid);
    } else {
      if (leftNodes.length <= rightNodes.length) {
        leftNodes.push(nid);
      } else {
        rightNodes.push(nid);
      }
    }
  });

  state.currentSplitAnalysis = {
    edge,
    u,
    v,
    leftNodes,
    centerNodes,
    rightNodes,
    isBridge
  };

  renderSplitPanelInfo(state.currentSplitAnalysis);

  const edgeEl = document.getElementById(`edge-path-${edge.source}-${edge.target}`);
  if (edgeEl) {
    edgeEl.classList.toggle('is-bridge', isBridge);
  }
}

function renderSplitPanelInfo(analysis) {
  if (bridgeStatusBadge) {
    bridgeStatusBadge.style.display = 'inline-block';
    if (analysis.isBridge) {
      bridgeStatusBadge.style.background = '#FEF2F2';
      bridgeStatusBadge.style.borderColor = '#FECACA';
      bridgeStatusBadge.style.color = '#B91C1C';
      bridgeStatusBadge.innerHTML = `🌉 <strong>BRIDGE DETECTED!</strong> Removing this edge disconnects the graph into 2 separate components.`;
    } else {
      bridgeStatusBadge.style.background = '#ECFDF5';
      bridgeStatusBadge.style.borderColor = '#A7F3D0';
      bridgeStatusBadge.style.color = '#047857';
      bridgeStatusBadge.innerHTML = `🔄 <strong>NOT A BRIDGE:</strong> Connected via ${analysis.centerNodes.length} mutual node(s) or cycle chords.`;
    }
  }

  if (applySplitLayoutBtn) applySplitLayoutBtn.style.display = 'inline-flex';
  if (resetSplitLayoutBtn) resetSplitLayoutBtn.style.display = 'inline-flex';

  if (splitLeftNodes) {
    splitLeftNodes.innerHTML = '';
    analysis.leftNodes.forEach(nid => {
      const chip = document.createElement('span');
      chip.className = 'node-chip chip-left';
      chip.textContent = nid === analysis.u ? `${nid} (Endpoint)` : nid;
      splitLeftNodes.appendChild(chip);
    });
  }
  if (leftCountBadge) leftCountBadge.textContent = `(${analysis.leftNodes.length})`;

  if (splitCenterNodes) {
    splitCenterNodes.innerHTML = '';
    if (analysis.centerNodes.length > 0) {
      analysis.centerNodes.forEach(nid => {
        const chip = document.createElement('span');
        chip.className = 'node-chip chip-center';
        chip.textContent = `${nid} (Mutual)`;
        splitCenterNodes.appendChild(chip);
      });
    } else {
      splitCenterNodes.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">(None — No mutual triangles)</span>';
    }
  }
  if (centerCountBadge) centerCountBadge.textContent = `(${analysis.centerNodes.length})`;

  if (splitRightNodes) {
    splitRightNodes.innerHTML = '';
    analysis.rightNodes.forEach(nid => {
      const chip = document.createElement('span');
      chip.className = 'node-chip chip-right';
      chip.textContent = nid === analysis.v ? `${nid} (Endpoint)` : nid;
      splitRightNodes.appendChild(chip);
    });
  }
  if (rightCountBadge) rightCountBadge.textContent = `(${analysis.rightNodes.length})`;
}

// Animation controller for smooth transitions
let activeTransitionTimer = null;

function animateToPositions(targetMap, duration = 950, onComplete = null) {
  if (activeTransitionTimer) {
    cancelAnimationFrame(activeTransitionTimer);
    activeTransitionTimer = null;
  }

  const startPositions = new Map();
  targetMap.forEach((target, nid) => {
    const node = state.nodes.get(nid);
    if (node) {
      startPositions.set(nid, { x: node.x, y: node.y });
    }
  });

  const startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = easeInOutCubic(progress);

    targetMap.forEach((target, nid) => {
      const node = state.nodes.get(nid);
      const start = startPositions.get(nid);
      if (node && start) {
        node.x = start.x + (target.x - start.x) * ease;
        node.y = start.y + (target.y - start.y) * ease;
      }
    });

    updateGraphGeometry();

    if (progress < 1) {
      activeTransitionTimer = requestAnimationFrame(tick);
    } else {
      targetMap.forEach((target, nid) => {
        const node = state.nodes.get(nid);
        if (node) {
          node.x = target.x;
          node.y = target.y;
        }
      });
      updateGraphGeometry();
      activeTransitionTimer = null;
      if (onComplete) onComplete();
    }
  }

  activeTransitionTimer = requestAnimationFrame(tick);
}

function applySplitLayout() {
  if (!state.currentSplitAnalysis) return;

  const { leftNodes, centerNodes, rightNodes, u, v } = state.currentSplitAnalysis;
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 550;

  const nodeU = state.nodes.get(u);
  const nodeV = state.nodes.get(v);

  let leftSideCluster = leftNodes;
  let rightSideCluster = rightNodes;
  let leftAnchor = u;
  let rightAnchor = v;

  if (nodeU && nodeV && nodeU.x > nodeV.x) {
    leftSideCluster = rightNodes;
    rightSideCluster = leftNodes;
    leftAnchor = v;
    rightAnchor = u;
  }

  const midX = width / 2;
  const baselineY = height * 0.72;
  const edgeGap = Math.min(260, width * 0.32);

  const targetMap = new Map();

  state.nodes.forEach(node => {
    if (node.origX === undefined) {
      node.origX = node.x;
      node.origY = node.y;
    }
  });

  const anchorLeftX = midX - edgeGap / 2;
  const anchorRightX = midX + edgeGap / 2;

  targetMap.set(leftAnchor, { x: anchorLeftX, y: baselineY });
  targetMap.set(rightAnchor, { x: anchorRightX, y: baselineY });

  const numCenter = centerNodes.length;
  if (numCenter === 1) {
    targetMap.set(centerNodes[0], { x: midX, y: baselineY - 180 });
  } else if (numCenter > 1) {
    const centerRadiusX = Math.min(220, edgeGap * 0.85);
    const centerRadiusY = 190;
    centerNodes.forEach((nid, idx) => {
      const theta = Math.PI - ((idx + 1) / (numCenter + 1)) * Math.PI;
      const x = midX + centerRadiusX * Math.cos(theta);
      const y = (baselineY - 15) - centerRadiusY * Math.sin(theta);
      targetMap.set(nid, { x, y });
    });
  }

  const remainingLeft = leftSideCluster.filter(nid => nid !== leftAnchor);
  if (remainingLeft.length > 0) {
    const clusterCenterX = anchorLeftX - 140;
    const clusterRadius = Math.min(130, Math.max(70, remainingLeft.length * 32));
    remainingLeft.forEach((nid, idx) => {
      const angle = (2 * Math.PI * idx) / remainingLeft.length;
      targetMap.set(nid, {
        x: Math.max(NODE_RADIUS + 25, clusterCenterX + clusterRadius * Math.cos(angle)),
        y: Math.max(NODE_RADIUS + 25, Math.min(height - NODE_RADIUS - 25, baselineY + clusterRadius * Math.sin(angle) - 30))
      });
    });
  }

  const remainingRight = rightSideCluster.filter(nid => nid !== rightAnchor);
  if (remainingRight.length > 0) {
    const clusterCenterX = anchorRightX + 140;
    const clusterRadius = Math.min(130, Math.max(70, remainingRight.length * 32));
    remainingRight.forEach((nid, idx) => {
      const angle = (2 * Math.PI * idx) / remainingRight.length;
      targetMap.set(nid, {
        x: Math.min(width - NODE_RADIUS - 25, clusterCenterX + clusterRadius * Math.cos(angle)),
        y: Math.max(NODE_RADIUS + 25, Math.min(height - NODE_RADIUS - 25, baselineY + clusterRadius * Math.sin(angle) - 30))
      });
    });
  }

  splitDivider.setAttribute('x1', midX);
  splitDivider.setAttribute('y1', 30);
  splitDivider.setAttribute('x2', midX);
  splitDivider.setAttribute('y2', height - 30);
  splitDivider.style.display = 'block';
  splitDivider.classList.add('visible');

  animateToPositions(targetMap, 950, () => {
    applySideStyling(leftSideCluster, centerNodes, rightSideCluster);
  });
}

function resetSplitLayout() {
  const targetMap = new Map();
  state.nodes.forEach(node => {
    if (node.origX !== undefined && node.origY !== undefined) {
      targetMap.set(node.id, { x: node.origX, y: node.origY });
    }
  });

  splitDivider.classList.remove('visible');
  setTimeout(() => { splitDivider.style.display = 'none'; }, 600);

  document.querySelectorAll('.node-group').forEach(el => {
    el.classList.remove('side-left', 'side-center', 'side-right');
  });

  animateToPositions(targetMap, 950, () => {
    state.nodes.forEach(node => {
      delete node.origX;
      delete node.origY;
    });
  });
}

function applySideStyling(leftNodes, centerNodes, rightNodes) {
  document.querySelectorAll('.node-group').forEach(el => {
    el.classList.remove('side-left', 'side-center', 'side-right');
  });

  leftNodes.forEach(id => {
    const el = document.getElementById(`node-group-${id}`);
    if (el) el.classList.add('side-left');
  });

  centerNodes.forEach(id => {
    const el = document.getElementById(`node-group-${id}`);
    if (el) el.classList.add('side-center');
  });

  rightNodes.forEach(id => {
    const el = document.getElementById(`node-group-${id}`);
    if (el) el.classList.add('side-right');
  });
}

function setupSplitPanelActions() {
  if (splitSelectedEdgeBtn) {
    splitSelectedEdgeBtn.addEventListener('click', () => {
      applySplitLayout();
    });
  }

  if (applySplitLayoutBtn) {
    applySplitLayoutBtn.addEventListener('click', () => {
      applySplitLayout();
    });
  }

  if (resetSplitLayoutBtn) {
    resetSplitLayoutBtn.addEventListener('click', () => {
      resetSplitLayout();
    });
  }

  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
      deleteSelected();
    });
  }
}

// ==========================================
// Batch Edge List Text Input
// ==========================================

function setupBatchTextInput() {
  if (applyBatchTextBtn) {
    applyBatchTextBtn.addEventListener('click', () => {
      parseAndBuildBatchText();
    });
  }
}

function parseAndBuildBatchText() {
  const rawText = batchEdgeText.value.trim();
  if (!rawText) {
    showBatchStatus('Please enter some edges first!', 'error');
    return;
  }

  state.nodes.clear();
  state.edges = [];
  clearSelection();

  const lines = rawText.split('\n');
  let parsedEdgesCount = 0;
  let parsedNodesSet = new Set();

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    if (line.includes(':')) {
      const [srcPart, destPart] = line.split(':');
      const src = srcPart.trim();
      if (src) {
        parsedNodesSet.add(src);
        const targets = destPart.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
        for (const trg of targets) {
          parsedNodesSet.add(trg);
          addEdgeData(src, trg, 1.0);
          parsedEdgesCount++;
        }
      }
      continue;
    }

    const cleanLine = line.replace(/->|--|-|=>|,/g, ' ');
    const parts = cleanLine.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      const src = parts[0];
      const trg = parts[1];
      const weight = parts[2] ? parseFloat(parts[2]) || 1.0 : 1.0;
      parsedNodesSet.add(src);
      parsedNodesSet.add(trg);
      addEdgeData(src, trg, weight);
      parsedEdgesCount++;
    } else if (parts.length === 1) {
      parsedNodesSet.add(parts[0]);
    }
  }

  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 550;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodeArr = Array.from(parsedNodesSet);
  const n = nodeArr.length;
  const radius = Math.min(centerX, centerY) * 0.72;

  nodeArr.forEach((nodeId, idx) => {
    const angle = (2 * Math.PI * idx) / (n || 1);
    state.nodes.set(nodeId, {
      id: nodeId,
      label: nodeId,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      color: null,
      dfn: null,
      low: null
    });
  });

  applyClientLayout('spring');
  render();

  showBatchStatus(`✓ Created ${state.nodes.size} nodes & ${state.edges.length} edges successfully!`, 'success');

  // Regenerate tutor steps for the new graph
  generateTutorSteps();
}

function addEdgeData(source, target, weight = 1.0) {
  const existing = state.edges.find(e => 
    (e.source === source && e.target === target) ||
    (!state.directed && e.source === target && e.target === source)
  );

  if (existing) {
    existing.weight = weight;
    return;
  }

  state.edges.push({
    id: `${source}->${target}`,
    source: source,
    target: target,
    weight: weight,
    directed: state.directed
  });
}

function showBatchStatus(msg, type = 'info') {
  if (!batchParseStatus) return;
  batchParseStatus.style.display = 'block';
  batchParseStatus.textContent = msg;
  batchParseStatus.style.color = type === 'error' ? 'var(--accent-red)' : 'var(--accent-cyan)';
  setTimeout(() => {
    batchParseStatus.style.display = 'none';
  }, 4000);
}

// ==========================================
// Layout Algorithms
// ==========================================

function applyClientLayout(type) {
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 550;
  const centerX = width / 2;
  const centerY = height / 2;
  const nodeList = Array.from(state.nodes.values());
  const n = nodeList.length;
  if (n === 0) return;

  if (type === 'circular') {
    const radius = Math.min(centerX, centerY) * 0.72;
    nodeList.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });
  } else if (type === 'shell') {
    const innerRadius = Math.min(centerX, centerY) * 0.35;
    const outerRadius = Math.min(centerX, centerY) * 0.75;
    const half = Math.ceil(n / 2);
    nodeList.forEach((node, i) => {
      const isInner = i < half;
      const count = isInner ? half : n - half;
      const idx = isInner ? i : i - half;
      const r = isInner ? innerRadius : outerRadius;
      const angle = (2 * Math.PI * idx) / count;
      node.x = centerX + r * Math.cos(angle);
      node.y = centerY + r * Math.sin(angle);
    });
  } else {
    // Spring Layout (Fruchterman-Reingold)
    const area = (width * 0.8) * (height * 0.8);
    const k = Math.sqrt(area / (n || 1));
    const iterations = 80;

    for (let iter = 0; iter < iterations; iter++) {
      const temp = 1.0 - (iter / iterations);
      const disp = new Map();
      nodeList.forEach(node => disp.set(node.id, { dx: 0, dy: 0 }));

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const u = nodeList[i];
          const v = nodeList[j];
          let dx = u.x - v.x;
          let dy = u.y - v.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (k * k) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          disp.get(u.id).dx += fx;
          disp.get(u.id).dy += fy;
          disp.get(v.id).dx -= fx;
          disp.get(v.id).dy -= fy;
        }
      }

      state.edges.forEach(e => {
        const u = state.nodes.get(e.source);
        const v = state.nodes.get(e.target);
        if (u && v) {
          let dx = u.x - v.x;
          let dy = u.y - v.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist * dist) / k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          disp.get(u.id).dx -= fx;
          disp.get(u.id).dy -= fy;
          disp.get(v.id).dx += fx;
          disp.get(v.id).dy += fy;
        }
      });

      nodeList.forEach(node => {
        const d = disp.get(node.id);
        const dist = Math.sqrt(d.dx * d.dx + d.dy * d.dy) || 1;
        const maxStep = 40 * temp;
        node.x += (d.dx / dist) * Math.min(dist, maxStep);
        node.y += (d.dy / dist) * Math.min(dist, maxStep);

        node.x = Math.max(NODE_RADIUS + 25, Math.min(width - NODE_RADIUS - 25, node.x));
        node.y = Math.max(NODE_RADIUS + 25, Math.min(height - NODE_RADIUS - 25, node.y));
      });
    }
  }

  updateGraphGeometry();
}

function applyAutoLayout(type) {
  applyClientLayout(type);
}

// Preset Loader
function loadPreset(key) {
  const presets = {
    bridge_example: {
      name: "Bridge & Two Connected Clusters",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n1 - 3\n3 - 4\n4 - 5\n5 - 3"
    },
    cycle_with_chord: {
      name: "Triangle & Cycle Chords",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n0 - 3\n1 - 3\n3 - 4\n4 - 5\n5 - 3"
    },
    bipartite: {
      name: "Two Separated Clusters",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n2 - 3\n3 - 4\n4 - 5\n5 - 3"
    },
    railway_assignment: {
      name: "🚆 Railway Grid (3 Clusters & 2 Bridges)",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n1 - 3\n3 - 4\n4 - 5\n5 - 3\n4 - 6\n6 - 7\n7 - 8\n8 - 6"
    },
    railway_16: {
      name: "🚆 Assignment 1: 16-Station National Rail Grid (6 Bridges)",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 3\n3 - 0\n0 - 2\n1 - 4\n4 - 5\n5 - 6\n6 - 7\n7 - 5\n7 - 8\n2 - 9\n9 - 10\n10 - 11\n11 - 9\n11 - 12\n12 - 13\n13 - 14\n14 - 15\n15 - 13"
    },
    hill_station: {
      name: "🏔️ Assignment 2: Hill Station Landslide Chokepoints",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n0 - 2\n1 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n5 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n10 - 11\n11 - 12\n12 - 10\n12 - 13"
    },
    social_network: {
      name: "👥 Assignment 3: Social Network Community Bridges",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n0 - 3\n1 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n5 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n9 - 10\n10 - 11\n11 - 12\n12 - 13\n13 - 11\n13 - 14"
    },
    iot_mesh: {
      name: "📡 Assignment 4: Precision Agriculture IoT Sensor Mesh",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n0 - 3\n2 - 3\n3 - 4\n4 - 5\n5 - 6\n6 - 4\n6 - 7\n7 - 8\n8 - 9\n9 - 7\n8 - 10\n10 - 11\n11 - 12\n12 - 10\n11 - 13\n13 - 14\n14 - 15\n15 - 13"
    },
    company_network: {
      name: "🏢 Assignment 5: Corporate Enterprise Network Core Hub",
      directed: false,
      text: "0 - 1\n1 - 2\n2 - 0\n1 - 3\n2 - 3\n0 - 4\n4 - 5\n5 - 6\n6 - 4\n3 - 7\n7 - 8\n8 - 9\n9 - 7\n9 - 10\n10 - 11\n11 - 12\n12 - 10\n2 - 13\n13 - 14\n14 - 15\n15 - 13"
    }
  };

  if (presets[key]) {
    const p = presets[key];
    batchEdgeText.value = p.text;
    state.directed = p.directed;
    directedIcon.textContent = state.directed ? '➔' : '—';
    directedLabel.textContent = state.directed ? 'Directed' : 'Undirected';
    parseAndBuildBatchText();
  }
}

// Manual Node and Edge Inputs
function setupManualInputs() {
  manualAddNodeBtn.addEventListener('click', () => {
    const val = manualNodeId.value.trim();
    if (!val) {
      alert('Please enter a node name!');
      return;
    }
    const center = getCanvasCenter();
    const created = addNodeAtPosition(center.x + (Math.random() * 80 - 40), center.y + (Math.random() * 80 - 40), val);
    if (created) {
      manualNodeId.value = '';
      generateTutorSteps();
    }
  });

  manualNodeId.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') manualAddNodeBtn.click();
  });

  manualAddEdgeBtn.addEventListener('click', () => {
    const from = manualEdgeFrom.value.trim();
    const to = manualEdgeTo.value.trim();
    const weight = parseFloat(manualEdgeWeight.value) || 1.0;

    if (!from || !to) {
      alert('Please enter both From and To node names!');
      return;
    }

    if (!state.nodes.has(from)) {
      const c = getCanvasCenter();
      addNodeAtPosition(c.x - 70, c.y, from);
    }
    if (!state.nodes.has(to)) {
      const c = getCanvasCenter();
      addNodeAtPosition(c.x + 70, c.y, to);
    }

    addEdge(from, to, weight);
    manualEdgeFrom.value = '';
    manualEdgeTo.value = '';
    manualEdgeWeight.value = '1';
    generateTutorSteps();
  });
}

function getCanvasCenter() {
  const rect = svg.getBoundingClientRect();
  const screenCenterX = (rect.width || 800) / 2;
  const screenCenterY = (rect.height || 500) / 2;
  return {
    x: Math.round((screenCenterX - state.pan.x) / state.zoom),
    y: Math.round((screenCenterY - state.pan.y) / state.zoom)
  };
}

function updateSelectionUI() {
  if (!state.selectedElement) return;
  selectElement(state.selectedElement.type, state.selectedElement.data);
}

// ==========================================
// Python Tutor Engine: Code Viewer & Recursion Windows
// ==========================================

function setupCodeTutor() {
  state.userCode = DEFAULT_SOLUTION_CODE;
  if (javaCodeEditor) {
    javaCodeEditor.value = state.userCode;
  }

  // Render initial code lines with gutter and arrows
  renderCodeLines(state.userCode);

  // Toggle edit code mode
  if (toggleEditModeBtn) {
    toggleEditModeBtn.addEventListener('click', () => {
      state.isEditMode = !state.isEditMode;
      if (state.isEditMode) {
        toggleEditModeBtn.textContent = '👁 View Tutor';
        javaCodeEditor.style.display = 'block';
        codeViewerContainer.style.display = 'none';
        javaCodeEditor.focus();
      } else {
        toggleEditModeBtn.textContent = '✎ Edit Code';
        state.userCode = javaCodeEditor.value;
        javaCodeEditor.style.display = 'none';
        codeViewerContainer.style.display = 'block';
        renderCodeLines(state.userCode);
        generateTutorSteps();
      }
    });
  }

  if (resetCodeBtn) {
    resetCodeBtn.addEventListener('click', () => {
      state.userCode = DEFAULT_SOLUTION_CODE;
      if (javaCodeEditor) javaCodeEditor.value = state.userCode;
      renderCodeLines(state.userCode);
      generateTutorSteps();
      logTerminal('↺ Code reset to default Solution. Ready to visualize.', 'info');
    });
  }

  if (runVisualizerBtn) {
    runVisualizerBtn.addEventListener('click', () => {
      if (state.isEditMode) {
        // Automatically switch back to viewer
        toggleEditModeBtn.click();
      }
      generateTutorSteps();
      initPlayback(state.tutorSteps);
      switchBottomTab('pane-steps');
      logTerminal('▶ Started Step Visualizer in Python Tutor Mode.', 'success');
    });
  }
}

// Render formatted code with line numbers and moving arrow gutter
function renderCodeLines(code) {
  if (!codeLinesWrapper) return;
  codeLinesWrapper.innerHTML = '';

  const lines = code.split('\n');
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const row = document.createElement('div');
    row.className = 'code-line';
    row.id = `code-line-${lineNum}`;
    row.dataset.line = lineNum;

    // Gutter with execution arrow and line number
    const gutter = document.createElement('span');
    gutter.className = 'line-gutter';

    const arrow = document.createElement('span');
    arrow.className = 'exec-arrow';
    arrow.textContent = '▶';

    const num = document.createElement('span');
    num.className = 'line-num';
    num.textContent = lineNum;

    gutter.appendChild(arrow);
    gutter.appendChild(num);

    // Code text
    const textSpan = document.createElement('span');
    textSpan.className = 'line-code';
    textSpan.textContent = lineText;

    row.appendChild(gutter);
    row.appendChild(textSpan);
    codeLinesWrapper.appendChild(row);
  });
}

// Highlight executing line and scroll smoothly
function highlightExecutingLine(lineNum) {
  document.querySelectorAll('.code-line').forEach(el => el.classList.remove('executing-line'));
  if (!lineNum || lineNum < 1) return;

  const targetLine = document.getElementById(`code-line-${lineNum}`);
  if (targetLine) {
    targetLine.classList.add('executing-line');
    // Ensure line is visible in viewer
    targetLine.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Render Recursion Stack Windows (Frames as Clean Boxes)
function renderRecursionWindows(callStack, activeFrameId, currentStep) {
  if (!recursionWindowsContainer) return;

  if (!callStack || callStack.length === 0) {
    recursionWindowsContainer.innerHTML = `
      <div id="rec-empty-hint" style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 2rem 1rem; line-height: 1.6; background: #FFFFFF; border: 1px dashed var(--border-color); border-radius: 10px;">
        ${currentStep && currentStep.description ? currentStep.description : 'Click <strong>▶ Start Step Visualizer</strong> to trace recursion with step-by-step frame boxes!'}
      </div>
    `;
    if (recDepthBadge) recDepthBadge.textContent = 'Stack Depth: 0';
    return;
  }

  if (recDepthBadge) {
    recDepthBadge.textContent = `Stack Depth: ${callStack.length}`;
  }

  recursionWindowsContainer.innerHTML = '';

  callStack.forEach((frame, idx) => {
    const isTop = idx === callStack.length - 1;
    const box = document.createElement('div');
    box.className = `recursion-box ${isTop ? 'active-box' : 'waiting-box'}`;
    box.id = `rec-window-${frame.frameId}`;

    const discVal = currentStep && currentStep.disc && currentStep.disc[frame.curr] !== undefined ? currentStep.disc[frame.curr] : 0;
    const lowVal = currentStep && currentStep.low && currentStep.low[frame.curr] !== undefined ? currentStep.low[frame.curr] : 0;
    const nextVal = frame.next !== null && frame.next !== undefined ? frame.next : '—';
    const descText = isTop ? (currentStep ? currentStep.description : frame.desc) : `Paused: waiting for child call to return and update reachability...`;

    box.innerHTML = `
      <div class="rec-box-header">
        <div class="rec-box-title-group">
          <span class="rec-frame-pill">${isTop ? '⚡ Frame ' + (idx + 1) : 'Frame ' + (idx + 1)}</span>
          <span class="rec-func-call">dfs(curr = ${frame.curr}, prev = ${frame.prev})</span>
        </div>
        <span class="rec-status-badge ${isTop ? 'status-active' : 'status-waiting'}">
          ${isTop ? '● Executing' : '⏳ Waiting'}
        </span>
      </div>

      <div class="rec-tiles-grid">
        <div class="rec-tile">
          <span class="rec-tile-label">Node (curr)</span>
          <span class="rec-tile-val font-mono">${frame.curr}</span>
        </div>
        <div class="rec-tile">
          <span class="rec-tile-label">Parent (prev)</span>
          <span class="rec-tile-val font-mono">${frame.prev}</span>
        </div>
        <div class="rec-tile tile-disc">
          <span class="rec-tile-label">disc[${frame.curr}]</span>
          <span class="rec-tile-val font-mono">${discVal}</span>
        </div>
        <div class="rec-tile tile-low">
          <span class="rec-tile-label">low[${frame.curr}]</span>
          <span class="rec-tile-val font-mono">${lowVal}</span>
        </div>
        <div class="rec-tile">
          <span class="rec-tile-label">next neighbor</span>
          <span class="rec-tile-val font-mono">${nextVal}</span>
        </div>
      </div>

      <div class="rec-box-banner ${isTop ? 'banner-active' : 'banner-waiting'}">
        <span style="font-size: 0.85rem; line-height: 1;">${isTop ? '👉' : '⏸'}</span>
        <span>${escapeHtml(descText)}</span>
      </div>
    `;

    recursionWindowsContainer.appendChild(box);
  });

  // Automatically scroll down so the entire active card and its action banner are completely visible
  setTimeout(() => {
    if (recursionWindowsContainer) {
      recursionWindowsContainer.scrollTop = recursionWindowsContainer.scrollHeight;
    }
  }, 20);
}

// ==========================================
// Python Tutor Engine: Step-by-Step Simulation
// ==========================================

function generateTutorSteps() {
  const nodeList = Array.from(state.nodes.values());
  const n = nodeList.length;
  if (n === 0) {
    state.tutorSteps = [];
    return;
  }

  // Map graph node labels/IDs to integer indices 0..n-1
  const idToIndex = new Map();
  const indexToId = new Map();

  nodeList.forEach((node, idx) => {
    let intVal = parseInt(node.id, 10);
    if (isNaN(intVal) || intVal < 0 || intVal >= n || idToIndex.has(intVal)) {
      intVal = idx;
    }
    idToIndex.set(node.id, intVal);
    indexToId.set(intVal, node.id);
  });

  // Build connections list
  const edgeMap = new Map();
  for (let i = 0; i < n; i++) {
    edgeMap.set(i, []);
  }

  state.edges.forEach(e => {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u !== undefined && v !== undefined) {
      edgeMap.get(u).push(v);
      if (!state.directed) {
        edgeMap.get(v).push(u);
      }
    }
  });

  // Simulation State
  const steps = [];
  const disc = {};
  const low = {};
  let time = 1;
  const ans = [];
  const callStack = [];
  let frameIdGen = 1;

  for (let i = 0; i < n; i++) {
    const nid = indexToId.get(i);
    disc[nid] = 0;
    low[nid] = 0;
  }

  function snapshot(line, desc, activeNode = null, activeEdge = null) {
    steps.push({
      line: line,
      description: desc,
      activeNode: activeNode !== null ? (indexToId.get(activeNode) || String(activeNode)) : null,
      activeEdge: activeEdge ? {
        source: indexToId.get(activeEdge[0]) || String(activeEdge[0]),
        target: indexToId.get(activeEdge[1]) || String(activeEdge[1])
      } : null,
      callStack: callStack.map(f => ({ ...f })),
      disc: { ...disc },
      low: { ...low },
      time: time,
      ans: ans.map(a => [...a]),
      bridges: ans.map(a => [indexToId.get(a[0]) || String(a[0]), indexToId.get(a[1]) || String(a[1])])
    });
  }

  // Line 6: criticalConnections method invoked
  snapshot(6, `criticalConnections(n = ${n}, connections) called with ${state.edges.length} connections.`);

  // Line 7: disc array initialization
  snapshot(7, `disc = new int[${n}] -> discovery times array allocated.`);

  // Line 8: low array initialization
  snapshot(8, `low = new int[${n}] -> low-link values array allocated.`);

  // Line 9-10: build edgeMap
  snapshot(9, `edgeMap initialized for all ${n} vertices.`);

  // Line 11-14: connections loaded into adjacency map
  snapshot(11, `Connections loaded into adjacency edgeMap.`);

  // Line 15: dfs(0, -1) call
  snapshot(15, `dfs(0, -1) invoked: initiating Depth-First Search from root node 0.`);

  // Recursive DFS function simulator
  function dfs(curr, prev) {
    const currId = indexToId.get(curr);
    const frameObj = {
      frameId: `frame-${frameIdGen++}`,
      curr: curr,
      prev: prev,
      next: null,
      desc: `Executing dfs(curr=${curr}, prev=${prev})`
    };
    callStack.push(frameObj);

    // Line 18: function header
    snapshot(18, `Entering dfs(curr=${curr}, prev=${prev}) -> new recursion window created!`, curr);

    // Line 19: disc[curr] = low[curr] = time++
    disc[currId] = time;
    low[currId] = time;
    snapshot(19, `disc[${curr}] = low[${curr}] = time++ -> set disc[${curr}]=${time}, low[${curr}]=${time}`, curr);
    time++;

    const neighbors = edgeMap.get(curr) || [];
    // Line 20: for (int next : edgeMap.get(curr))
    snapshot(20, `Looping through neighbors of node ${curr}: [${neighbors.join(', ')}]`, curr);

    for (let next of neighbors) {
      frameObj.next = next;
      const nextId = indexToId.get(next);

      // Line 20: current neighbor iteration
      snapshot(20, `Checking edge (${curr} -> ${next})`, curr, [curr, next]);

      // Line 21: if (disc[next] == 0)
      snapshot(21, `Evaluating if (disc[${next}] == 0): disc[${next}] is currently ${disc[nextId]}`, curr, [curr, next]);

      if (disc[nextId] === 0) {
        // Line 22: dfs(next, curr)
        snapshot(22, `Neighbor ${next} unvisited! Recursing into dfs(curr=${next}, prev=${curr})...`, curr, [curr, next]);
        dfs(next, curr);

        // Line 23: low[curr] = Math.min(low[curr], low[next])
        const prevLow = low[currId];
        low[currId] = Math.min(low[currId], low[nextId]);
        snapshot(23, `Returned from dfs(${next}). Updated low[${curr}] = min(low[${curr}], low[${next}]) = min(${prevLow}, ${low[nextId]}) = ${low[currId]}`, curr);

      } else if (next !== prev) {
        // Line 24: else if (next != prev)
        snapshot(24, `Neighbor ${next} already visited and not direct parent (next != prev). Back-edge detected!`, curr, [curr, next]);

        // Line 25: low[curr] = Math.min(low[curr], disc[next])
        const prevLow = low[currId];
        low[currId] = Math.min(low[currId], disc[nextId]);
        snapshot(25, `Back-edge (${curr} -> ${next}): updated low[${curr}] = min(low[${curr}], disc[${next}]) = min(${prevLow}, ${disc[nextId]}) = ${low[currId]}`, curr);
      } else {
        snapshot(24, `Neighbor ${next} is the direct parent (next == prev). Skipped reverse edge to prevent trivial cycle.`, curr);
      }

      // Line 26: if (low[next] > disc[curr])
      snapshot(26, `Evaluating bridge condition: is low[${next}] (${low[nextId]}) > disc[${curr}] (${disc[currId]})?`, curr, [curr, next]);

      if (low[nextId] > disc[currId]) {
        // Line 27: ans.add(Arrays.asList(curr, next))
        ans.push([curr, next]);
        snapshot(27, `CRITICAL CONNECTION FOUND! Edge (${curr}, ${next}) is a bridge since low[${next}] (${low[nextId]}) > disc[${curr}] (${disc[currId]})! Added to ans.`, curr, [curr, next]);
      }
    }

    // Line 28-29: exit dfs
    snapshot(29, `Finished all branches for node ${curr}. Exiting dfs(${curr}, ${prev}) -> popping recursion window frame.`, curr);
    callStack.pop();
  }

  // Start execution from root 0
  dfs(0, -1);

  // Line 16: return ans
  snapshot(16, `Finished criticalConnections! Returning ans with ${ans.length} bridge(s): ${JSON.stringify(ans)}.`);

  state.tutorSteps = steps;
}

// ==========================================
// Playback Engine: Synchronizing Arrow, Frames & Canvas
// ==========================================

function setupPlaybackControls() {
  if (playbackPrevBtn) {
    playbackPrevBtn.addEventListener('click', prevStep);
  }
  if (playbackNextBtn) {
    playbackNextBtn.addEventListener('click', nextStep);
  }
  if (playbackPlayBtn) {
    playbackPlayBtn.addEventListener('click', togglePlay);
  }
  if (playbackSpeedInput) {
    playbackSpeedInput.addEventListener('input', (e) => {
      state.playbackSpeed = parseInt(e.target.value, 10);
      if (state.isPlaying) {
        pausePlayback();
        startPlayback();
      }
    });
  }
}

function initPlayback(steps) {
  state.tutorSteps = steps || [];
  state.currentStepIndex = -1;
  pausePlayback();
  goToStep(0);
}

function goToStep(index) {
  if (!state.tutorSteps || state.tutorSteps.length === 0) return;
  index = Math.max(0, Math.min(index, state.tutorSteps.length - 1));
  state.currentStepIndex = index;

  const step = state.tutorSteps[index];

  // 1. Highlight line in Code Viewer with moving arrow
  highlightExecutingLine(step.line);

  // 2. Render Recursion Stack Windows (Frames)
  renderRecursionWindows(step.callStack, step.callStack.length > 0 ? step.callStack[step.callStack.length - 1].frameId : null, step);

  // 3. Step counter badge
  if (stepCounterBadge) {
    stepCounterBadge.textContent = `Step ${index + 1} / ${state.tutorSteps.length}`;
  }

  // 4. Step description text
  if (stepDescriptionText) {
    stepDescriptionText.innerHTML = `<strong>[Line ${step.line}]:</strong> ${escapeHtml(step.description)}`;
  }

  // 5. Update Call Stack pills in bottom panel
  if (callStackList) {
    callStackList.innerHTML = '';
    if (step.callStack && step.callStack.length > 0) {
      step.callStack.forEach(frame => {
        const pill = document.createElement('span');
        pill.className = 'stack-pill call-pill';
        pill.textContent = `dfs(${frame.curr}, ${frame.prev})`;
        callStackList.appendChild(pill);
      });
    } else {
      callStackList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">(empty)</span>';
    }
  }

  // 6. Tarjan / Bridge Pills
  if (tarjanStackList) {
    tarjanStackList.innerHTML = '';
    if (step.bridges && step.bridges.length > 0) {
      step.bridges.forEach(b => {
        const pill = document.createElement('span');
        pill.className = 'stack-pill tarjan-pill';
        pill.textContent = `Bridge: (${b[0]}, ${b[1]})`;
        tarjanStackList.appendChild(pill);
      });
    } else {
      tarjanStackList.innerHTML = '<span style="font-size: 0.75rem; color: var(--text-muted);">None found yet</span>';
    }
  }

  // 7. Update Canvas Nodes: Discovery Time, Low-Link, Visited, Unvisited Blur, and Active Light Ring
  state.nodes.forEach(node => {
    const isVisited = step.disc && step.disc[node.id] !== undefined && step.disc[node.id] > 0;
    const isActive = step.activeNode !== null && step.activeNode !== undefined && (String(step.activeNode) === String(node.id));

    const grp = document.getElementById(`node-group-${node.id}`);
    if (grp) {
      grp.classList.remove('active', 'unvisited', 'visited');
      if (isActive) {
        grp.classList.add('active', 'visited');
      } else if (isVisited) {
        grp.classList.add('visited');
      } else {
        grp.classList.add('unvisited');
      }
    }

    const discVal = (step.disc && step.disc[node.id] !== undefined && step.disc[node.id] > 0) ? step.disc[node.id] : null;
    const lowVal = (step.low && step.low[node.id] !== undefined && step.low[node.id] > 0) ? step.low[node.id] : null;
    node.dfn = discVal;
    node.low = lowVal;

    const bText = document.getElementById(`node-badge-text-${node.id}`);
    if (bText) {
      bText.textContent = `disc:${discVal !== null ? discVal : '-'} low:${lowVal !== null ? lowVal : '-'}`;
    }

    const bRect = document.getElementById(`node-badge-rect-${node.id}`);
    if (bRect) {
      if (discVal !== null) {
        bRect.style.stroke = '#0284C7';
        bRect.style.fill = '#F0F9FF';
      } else {
        bRect.style.stroke = 'var(--border-color)';
        bRect.style.fill = '#FAF8F5';
      }
    }
  });

  // 8. Highlight Active Edge
  document.querySelectorAll('.edge-path').forEach(el => el.classList.remove('active'));
  if (step.activeEdge && step.activeEdge.source && step.activeEdge.target) {
    const u = step.activeEdge.source;
    const v = step.activeEdge.target;
    const ep1 = document.getElementById(`edge-path-${u}-${v}`);
    const ep2 = !state.directed ? document.getElementById(`edge-path-${v}-${u}`) : null;
    if (ep1) ep1.classList.add('active');
    if (ep2) ep2.classList.add('active');
  }

  // 9. Highlight Bridges
  if (step.bridges) {
    const bridgeSet = new Set(step.bridges.map(b => `${b[0]}-${b[1]}`));
    state.edges.forEach(e => {
      const isBr = bridgeSet.has(`${e.source}-${e.target}`) || (!state.directed && bridgeSet.has(`${e.target}-${e.source}`));
      const el = document.getElementById(`edge-path-${e.source}-${e.target}`);
      if (el) el.classList.toggle('is-bridge', isBr);
    });
  }

  // Log step into terminal console
  logTerminal(`Step ${index + 1} [Line ${step.line}]: ${step.description}`, 'stdout');
}

function nextStep() {
  if (state.currentStepIndex < state.tutorSteps.length - 1) {
    goToStep(state.currentStepIndex + 1);
  } else {
    pausePlayback();
  }
}

function prevStep() {
  if (state.currentStepIndex > 0) {
    goToStep(state.currentStepIndex - 1);
  }
}

function togglePlay() {
  if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (!state.tutorSteps || state.tutorSteps.length === 0) {
    generateTutorSteps();
  }
  if (!state.tutorSteps || state.tutorSteps.length === 0) return;

  state.isPlaying = true;
  if (playbackPlayBtn) playbackPlayBtn.textContent = '⏸ Pause';

  if (state.currentStepIndex >= state.tutorSteps.length - 1) {
    state.currentStepIndex = -1;
  }

  state.playbackTimer = setInterval(() => {
    if (state.currentStepIndex < state.tutorSteps.length - 1) {
      goToStep(state.currentStepIndex + 1);
    } else {
      pausePlayback();
    }
  }, state.playbackSpeed);
}

function pausePlayback() {
  state.isPlaying = false;
  if (playbackPlayBtn) playbackPlayBtn.textContent = '▶ Play';
  if (state.playbackTimer) {
    clearInterval(state.playbackTimer);
    state.playbackTimer = null;
  }
}

// Start application
window.addEventListener('DOMContentLoaded', init);
