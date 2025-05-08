```plaintext
mirror-curve/
├── vendor/                      # Third-party libraries and reusable packages
├── index.html                   # Entry point, loads init.js
├── init.js                      # App bootstrap: initializes state and UI
├── README.md                    # Project overview
├── LOGICAL_STRUCTURE.md         # Logical structure and call graph
├── src/                         # Application source files
│   ├── core/                    # Core modules
│   │   ├── eventEmitter.js      # Pub/sub implementation
│   │   ├── screenDrawer.js      # Canvas rendering logic
│   │   ├── stateManager.js      # Centralized state & event wiring
│   │   └── animationManager.js  # Curve animation queue & control
│   ├── logic/ 			# Class definitions and implementations
	--- curveFinder.js      #Finds the next curves to draw     
│   │   ├── grid.js              # Grid class for managing the grid structure
│   │   └── mirrorCurve.js       # MirrorCurve class for curve representation
│   ├── drawing/                   # Computational logic
│   │   └── spline.js            # Spline interpolation routines
│   ├── ui/                      # UI modules
│   │   ├── desktopUI.js         # Desktop-specific controls
│   │   └── mobileUI.js          # Mobile-specific controls
│   └── styles.css               # Responsive CSS and theming
└── assets/                      # Static assets (images, fonts, etc.)
```

# Logical Structure Overview

This document maps out the functions and classes each module provides, along with their inter-module dependencies for the mirror-curve application.

---

## 1. init.js

**Exports:**
- `initializeApp()` — bootstraps the application on page load.

**Calls:**
- `stateManager.initialize()`
- UI setup from `desktopUI.setup()` or `mobileUI.setup()` depending on viewport
- Registers global handlers: `window.addEventListener('resize', ...)` and `DOMContentLoaded`

---

## 2. src/core/eventEmitter.js

**Exports:**
- `on(eventName: string, handler: Function)`
- `off(eventName: string, handler: Function)`
- `emit(eventName: string, payload?: any)`

**Internal:**
- Manages listener registry for pub/sub communication

---

## 3. src/logic/grid.js

**Exports:**
- `class Grid`

**Constructor & Properties:**
- `Grid(rows: number, cols: number)` — initializes dimensions
- `this.gridLines: Map<string, GridLine>` — collection of all grid line segments keyed by ID
- `this.usedDirections: Map<string, Set<number>>` — tracks which directions are used up for each grid line

**Direction Constants:**
- `static NW = 0` — Northwest direction (integer constant)
- `static NE = 1` — Northeast direction (integer constant)
- `static SW = 2` — Southwest direction (integer constant)
- `static SE = 3` — Southeast direction (integer constant)

**GridLine Structure:**
- `id: string` — unique identifier (e.g., "v_2_3" for vertical line at position 2,3)
- `type: 'horizontal' | 'vertical'` — orientation of the line
- `row: number` — row coordinate
- `col: number` — column coordinate
- `isMirror: boolean` — whether this line segment is a mirror (default: false)
- `connections: Object` — adjacent grid lines by direction:
  ```javascript
  {
    [Grid.NW]: GridLineId | null,
    [Grid.NE]: GridLineId | null,
    [Grid.SW]: GridLineId | null,
    [Grid.SE]: GridLineId | null
  }
  ```

**Core Methods:**
- `initializeGridLines()` — creates all horizontal and vertical line segments
- `computeConnections()` — pre-computes all line-to-line connections for each direction
- `initializeUsedDirections()` — initializes the tracking of used directions
- `getGridLine(id: string): GridLine` — retrieves a grid line by ID
- `getAdjacentGridLine(lineId: string, direction: number): string | null` — gets ID of adjacent line in given direction, throws "Curve left the grid" error if move would leave grid
- `setMirror(lineId: string, isMirror: boolean)` — sets mirror status of a grid line
- `getReflectedDirection(gridLineId: string, incomingDirection: number): number` — computes reflection direction based on line orientation and incoming direction

**Direction Tracking Methods:**
- `markDirectionUsed(gridLineId: string, direction: number)` — marks a direction as used up for a grid line
- `isDirectionUsed(gridLineId: string, direction: number): boolean` — checks if a direction is already used up
- `getUnusedDirections(gridLineId: string): number[]` — returns array of available directions for a grid line
- `resetUsedDirections()` — resets all used direction tracking
- `isEdgeDirection(gridLineId: string, direction: number): boolean` — checks if a direction leads off the grid

**Helper Methods:**
- `generateGridLineId(type: string, row: number, col: number): string` — creates standard ID format
- `parseGridLineId(id: string): {type: string, row: number, col: number}` — extracts components from ID

**Implementation Notes:**
- Grid is purely logical with no rendering dependencies
- Directions are represented as simple integers, not angles
- Connections are pre-computed at initialization
- Moving outside the grid throws "Curve left the grid" error instead of silently returning null
- Edge detection is handled explicitly for proper curve termination

---

## 4. src/logic/mirrorCurve.js

**Exports:**
- `class MirrorCurve`

**Constructor & Properties:**
- `MirrorCurve(startGridLine: GridLine, initialDirection: number)` — initializes with a starting grid line and direction
- `this.gridLines: GridLine[]` — sequence of grid lines forming the curve
- `this.directions: number[]` — sequence of directions for traversal after each grid line
- `this.isClosed: boolean` — whether the curve forms a closed loop
- `this.leftGrid: boolean` — whether the curve left the grid
- `this.exitPoint: GridLine` — the grid line where the curve exited (if applicable)
- `this.exitDirection: number` — the direction in which the curve exited (if applicable)

**Methods:**
- `addSegment(nextGridLine: GridLine, nextDirection: number)` — adds a grid line and the subsequent direction to the curve
- `buildCurve(grid: Grid)` — computes and adds all segments by traversing grid lines according to mirror positions, handles grid exit gracefully
- `toString(): string` — prints the curve as a sequence of grid lines and directions using cardinal notation (NW, NE, SW, SE)

**Static Methods:**
- `findAllCurves(grid: Grid): MirrorCurve[]` — discovers all possible unique curves in the grid
- `findNextCurve(grid: Grid): MirrorCurve` — finds the next available unused curve in the grid

**Dependencies:**
- Depends on `Grid` object for grid line information and mirror positions
- Uses `grid.getAdjacentGridLine()` to determine possible next grid lines in the curve
- Uses `grid.getReflectedDirection()` to compute path after hitting mirrors
- Uses `grid.markDirectionUsed()` to record used directions
- Uses `grid.isDirectionUsed()` to check for available directions

**Implementation Notes:**
- Handles "Curve left the grid" errors by recording exit information
- Supports both closed loops and curves that exit the grid
- Implements proper error handling throughout curve building

---

## 5. src/drawing/spline.js

**Exports:**
- `getSplinePoints(rawPoints: Point[], tension: number): Point[]`

**Internal:**
- Implements Catmull–Rom interpolation
- Uses numeric helpers: `lerp()`, `segmentSubdivision()`

---

## 6. src/core/screenDrawer.js

**Exports:**
- `drawGrid(context: CanvasRenderingContext2D, grid: Grid)`
- `drawMirrors(context: CanvasRenderingContext2D, grid: Grid)`
- `drawCurve(context: CanvasRenderingContext2D, curve: MirrorCurve, styleOptions)`

**Calls:**
- Subscribes via `eventEmitter.on('render', ...)`
- Uses Canvas API: `beginPath()`, `moveTo()`, `lineTo()`, `stroke()`
- Calls `spline.getSplinePoints(curve.getPoints(), tension)` if smooth style

---

## 7. src/core/animationManager.js

**Exports:**
- `enqueueCurve(curve: MirrorCurve)`
- `startAnimation()` — processes queue sequentially
- `onComplete(callback: Function)` — called when a curve finishes drawing

**Internal:**
- Manages an internal queue
- Emits `eventEmitter.emit('renderCurve', curve)` for each dequeued curve

---

## 8. src/core/stateManager.js

**Exports:**
- `initialize()` — sets default state, wires UI events, triggers first render
- `dispatch(action: string, payload?: any)` — updates state, manages animation enqueue, and emits events
- `getState(): State`

**Calls:**
- `eventEmitter.on(...)` for UI actions (`NEXT_CURVE`, `ALL_CURVES`, `UPDATE_GRID`, etc.)
- `grid = new Grid(...)` on UPDATE_GRID
- Instantiates new `MirrorCurve` objects with starting points and directions
- Calls `mirrorCurve.buildCurve(grid)` to generate curves
- Calls `animationManager.enqueueCurve(curve)` to display curves
- Emits `eventEmitter.emit('stateChanged', this.state)` after state updates

---

## 9. src/ui/desktopUI.js

**Exports:**
- `setup()` — builds desktop toolbar and control panel

**Calls:**
- `stateManager.dispatch('UPDATE_GRID', { rows, cols })`
- `stateManager.dispatch('NEXT_CURVE')` / `'ALL_CURVES'`
- `stateManager.dispatch('SET_STYLE', { smooth })`
- Registers click/slider listeners

---

## 10. src/ui/mobileUI.js

**Exports:**
- `setup()` — builds mobile-friendly controls and bottom nav

**Calls:**
- Same dispatch actions as desktopUI
- Registers touch-specific events

---

## 11. Styles and Static Assets

- `styles.css` — CSS classes used by UI and drawer modules
- `vendor/` — third-party scripts loaded by `index.html` via `<script>` tags

---

This mapping ensures each class and function has a clear home and outlines how control flows from UI events through state updates, logic computation, queuing, and rendering.
