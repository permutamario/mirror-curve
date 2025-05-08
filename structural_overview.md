mirror-curve/
├── vendor/                      # Third-party libraries and reusable packages
├── index.html                   # Entry point, loads init.js
├── init.js                      # App bootstrap: initializes state and UI
├── README.md                    # Project overview
├── LOGICAL\_STRUCTURE.md         # Logical structure and call graph
├── src/                         # Application source files
│   ├── core/                    # Core modules
│   │   ├── eventEmitter.js      # Pub/sub implementation
│   │   ├── screenDrawer.js      # Canvas rendering logic
│   │   ├── stateManager.js      # Centralized state & event wiring
│   │   └── animationManager.js  # Curve animation queue & control
│   ├── logic/                   # Class definitions and implementations
│   │   ├── curveStartFinder.js  # Helper functions to find and start mirror curves
│   │   ├── grid.js              # Grid class for managing the grid structure
│   │   └── mirrorCurve.js       # MirrorCurve class for curve representation
│   ├── drawing/                 # Computational logic
│   │   └── spline.js            # Spline interpolation routines
│   ├── ui/                      # UI modules
│   │   ├── desktopUI.js         # Desktop-specific controls
│   │   ├── baseControls.js      # Shared UI components for desktop & mobile
│   │   └── mobileUI.js          # Mobile-specific controls
│   └── styles.css               # Responsive CSS and theming
└── assets/                      # Static assets (images, fonts, etc.)

# Logical Structure Overview

This document maps out the functions and classes each module provides, along with their inter-module dependencies for the mirror-curve application.

---

## 1. init.js

**Exports:**

* `initializeApp()` — Bootstraps the application on page load.

**Calls:**

* `stateManager.initialize()`
* UI setup from `desktopUI.setup()` or `mobileUI.setup()` depending on viewport
* Registers global handlers: `window.addEventListener('resize', ...)` and `DOMContentLoaded`

---

## 2. src/core/eventEmitter.js

**Exports:**

* `on(eventName: string, handler: Function)`
* `off(eventName: string, handler: Function)`
* `emit(eventName: string, payload?: any)`

**Internal:**

* Manages listener registry for pub/sub communication

---

## 3. src/logic/grid.js

**Exports:**

* `class Grid`

**Constructor & Properties:**

* `Grid(rows: number, cols: number)` — Initializes dimensions
* `this.gridLines: Map<string, GridLine>` — Collection of all grid line segments keyed by ID
* `this.usedDirections: Map<string, Set<number>>` — Tracks which directions are used for each grid line

**Direction Constants:**

* `static NW = 0` — Northwest
* `static NE = 1` — Northeast
* `static SW = 2` — Southwest
* `static SE = 3` — Southeast

**Core Methods:**

* `initializeGridLines()` — Creates all horizontal and vertical line segments
* `computeConnections()` — Pre-computes line-to-line connections for each direction
* `initializeUsedDirections()` — Initializes the used-directions tracking
* `getGridLine(id: string): GridLine` — Retrieves a grid line by ID
* `getAdjacentGridLine(lineId: string, direction: number): string | null` — Gets adjacent line ID or throws on grid exit
* `setMirror(lineId: string, isMirror: boolean)` — Sets mirror status
* `getReflectedDirection(gridLineId: string, incomingDirection: number): number` — Computes reflection

**Direction Tracking Methods:**

* `markDirectionUsed(gridLineId: string, direction: number)`
* `isDirectionUsed(gridLineId: string, direction: number): boolean`
* `getUnusedDirections(gridLineId: string): number[]`
* `resetUsedDirections()`
* `isEdgeDirection(gridLineId: string, direction: number): boolean`
* `isBoundaryGridLine(gridLine: GridLine): boolean` — Checks if a grid line is on the boundary

**Helper Methods:**

* `generateGridLineId(type: string, row: number, col: number): string`
* `parseGridLineId(id: string): {type: string, row: number, col: number}`
* `placeBoundaryMirrors()` — Places mirrors on all boundary grid lines

**Implementation Notes:**

* Logical module, no rendering dependencies
* Directions as integer constants
* Throws on grid exit for curve termination
* Boundary mirrors are always present and cannot be toggled

---

## 4. src/logic/mirrorCurve.js

**Exports:**

* `class MirrorCurve`

**Constructor & Properties:**

* `MirrorCurve(startGridLine: GridLine, initialDirection: number)`
* `this.gridLines: GridLine[]`
* `this.directions: number[]`
* `this.isClosed: boolean`
* `this.leftGrid: boolean`
* `this.exitPoint: GridLine` (if applicable)
* `this.exitDirection: number` (if applicable)

**Methods:**

* `addSegment(nextGridLine: GridLine, nextDirection: number)`
* `buildCurve(grid: Grid): boolean` — Traverses and populates the curve; returns success
* `toString(): string` — Human-readable sequence of steps

**Dependencies:**

* Relies on `Grid` for connections and reflections
* Uses `grid.getAdjacentGridLine()`, `grid.getReflectedDirection()`, `grid.markDirectionUsed()`

**Implementation Notes:**

* Records exit information for open paths
* Supports closed-loop detection
* For each segment, marks both the outgoing direction and the corresponding incoming direction as used

---

## 5. src/logic/curveStartFinder.js

**Exports:**

* `findNextCurve(grid: Grid): MirrorCurve | null` — Finds the next available mirror curve on the grid by selecting the first unused starting point and building its path.
* `findAllCurves(grid: Grid): MirrorCurve[]` — Resets direction usage and iteratively discovers all curves until none remain.

**Function Details:**

* `findNextCurve(grid)`:

  * Logs the search start.
  * Iterates over `grid.gridLines.entries()`.
  * Uses `grid.getUnusedDirections(id)` to find directions not yet traversed.
  * Selects the first unused direction, instantiates `new MirrorCurve(gridLine, direction)`, and calls `curve.buildCurve(grid)`.
  * Returns the built curve on success; catches errors and continues.
  * Returns `null` if no more curves are found.

* `findAllCurves(grid)`:

  * Invokes `grid.resetUsedDirections()`.
  * Repeatedly calls `findNextCurve(grid)` until it returns `null`.
  * Accumulates and returns an array of all discovered curves.

**Dependencies:**

* Relies on `Grid` and `MirrorCurve` classes from `src/logic`.

**Implementation Notes:**

* Simple linear search for starting points
* Detailed console logging for debugging
* Graceful handling of both closed and open curves

---

## 6. src/drawing/spline.js

**Exports:**

* `getSplinePoints(rawPoints: Point[], tension: number, subdivisions?: number): Point[]`

**Internal Functions:**

* `lerp(a: number, b: number, t: number): number` — Linear interpolation between two scalars
* `segmentSubdivision(P0: Point, P1: Point, M0: Point, M1: Point, subdivisions: number): Point[]` — Subdivides a curve segment using cubic Hermite basis

**Implementation Details:**

* Implements cyclic Catmull-Rom spline interpolation with a tension parameter
* Default tension is 0.5 (where 0 is standard Catmull-Rom, 1 is linear)
* Default subdivisions is 10 points per segment
* Produces smooth, aesthetically pleasing curves
* Returns array of interpolated points that close the loop if input points form a loop

---

## 7. src/core/screenDrawer.js

**Exports:**

* `drawScreen(ctx: CanvasRenderingContext2D, state: AppState)` — Draws the entire screen based on current state
* `initScreenDrawer()` — Initializes screen drawing by subscribing to REDRAW events

**Internal Functions:**

* `clearCanvas(ctx: CanvasRenderingContext2D, color: string)` — Helper to clear canvas with background color
* `getMidpoint(line: GridLine, cellW: number, cellH: number): Point` — Converts a grid line to its midpoint coordinates
* `drawCurve(ctx: CanvasRenderingContext2D, curve: Curve, idx: number, cellW: number, cellH: number, settings: Settings)` — Draws a single curve on the canvas

**Rendering Details:**

* Handles different curve formats:
  * Animation paths
  * Completed curves with pre-calculated points (curved style)
  * MirrorCurve objects with gridLines
  * Array of points
* Applies spline smoothing for curved animation style
* Draws grid lines, grid points, mirrors, center dots, and curves
* Supports both jagged and curved animation styles for permanent curves
* Calculates and uses grid layout with proper scaling and centering

**Dependencies:**

* `eventEmitter.on('REDRAW', ...)` — Subscribes to redraw events
* `getState()` — Gets current application state
* `getSplinePoints()` — For curve smoothing
* `ANIMATION_STYLES` — References animation style constants

---

## 8. src/core/animationManager.js

**Exports:**

* `enqueueCurve(curve: MirrorCurve)` — Adds a curve to the animation queue
* `startAnimation()` — Begins processing the animation queue
* `onComplete(callback: Function)` — Registers a callback for when the queue is emptied
* `isCurrentlyAnimating(): boolean` — Checks if animation is in progress
* `setAnimationDuration(duration: number)` — Sets the animation duration in milliseconds
* `setAnimationStyle(style: string)` — Sets the animation style (jagged or curved)
* `cancelAnimation()` — Cancels the current animation
* `clearAllAnimations()` — Clears all animations and resets animation state
* `ANIMATION_STYLES` — Animation style constants (JAGGED, CURVED)

**Internal Functions:**

* `calculateCurvedPoints(curve: Curve, cellW: number, cellH: number): Point[]` — Calculates helper points for curved animation
* `calculatePathPoints(curve: Curve, cellW: number, cellH: number, style: string): Point[]` — Calculates all points along the path
* `calculatePathLength(points: Point[]): number` — Calculates the total path length
* `getPointAtDistance(points: Point[], targetDistance: number, isClosed: boolean): {point: Point, segmentIndex: number}` — Finds the point at a specific distance along the path
* `animatePath(progress: number)` — Draws the path up to the current progress point
* `generateCompletedCurve(curve: Curve, style: string, cellW: number, cellH: number): Curve` — Creates a completed curve with the correct style
* `animationStep(timestamp: number)` — Animation frame callback for smooth animation

**Animation Features:**

* Supports two animation styles:
  * Jagged - Uses straight lines between grid line midpoints
  * Curved - Uses spline interpolation with helper points for smoother paths
* Helper points for curved style are offset from midpoints only for mirror segments
* Progressive animation from start to finish
* Proper curve style preservation when animation completes
* Animates curves one by one from the queue
* Handles both closed loops and open paths

**Dependencies:**

* `eventEmitter.emit()` — For updating the UI
* `getState()` — For accessing settings
* `getSplinePoints()` — For curve smoothing
* `Grid` — For direction constants

---

## 9. src/core/stateManager.js

**Exports:**

* `initialize()` — Initializes application state with default values
* `dispatch(action: string, payload?: any)` — Handles actions to update state
* `getState(): AppState` — Gets a copy of the current state

**State Structure:**

* `grid: Grid` — Current grid instance
* `curves: Curve[]` — Permanent completed curves
* `animationPath: Path` — Current animation path (temporary)
* `settings: Settings` — Application settings

**Settings Structure:**

* Display options (showGridLines, showGridPoints, showMirrors, showCenterDots)
* Spline options (smooth, tension)
* Animation options (animationDuration, animationStyle)
* Appearance (backgroundColor, colorScheme)
* Line styles for different elements (grid, gridPoint, mirror, centerDot, curve)

**Actions Handled:**

* `UPDATE_GRID` — Updates grid dimensions
* `TOGGLE_MIRRORS`, `TOGGLE_GRID_LINES`, `TOGGLE_GRID_DOTS`, `TOGGLE_CENTER_DOTS` — Toggle display options
* `SET_ANIMATION_DURATION`, `SET_ANIMATION_STYLE` — Configure animation
* `NEXT_CURVE` — Find and animate the next available curve
* `RESET` — Reset grid used directions and clear all curves
* `TOGGLE_MIRROR` — Toggle mirror status for a specific grid line

**Dependencies:**

* `eventEmitter.emit()` — For redraw events
* `Grid` — For managing the grid
* `animationManager` functions — For curve animation
* Dynamic import of `curveStartFinder.js` — For finding curves

**Implementation Notes:**

* Centralized state management
* Event-driven architecture
* Dynamic module loading
* Clears curves and animations on certain actions (grid update, mirror toggle, reset)

---

## 10. src/ui/baseControls.js

**Exports:**

* `createControlGroup(labelText: string, control: HTMLElement): HTMLDivElement` — Creates a labeled container for a form control
* `createButton({id, text, onClick}): HTMLButtonElement` — Creates a button element
* `createCheckbox({id, label, checked, onChange}): HTMLDivElement` — Creates a checkbox input
* `createColorPicker({id, label, value, onChange}): HTMLDivElement` — Creates a color picker input
* `createDropdown({id, options, defaultValue, onChange}): HTMLSelectElement` — Creates a dropdown select element
* `createSlider({id, min, max, step, value, onChange}): HTMLInputElement` — Creates a slider input

**Implementation Features:**

* Shared factory functions for UI components used by both desktop and mobile UIs
* Handles both simple values and object-based options for dropdowns ({value, label})
* Sets appropriate classes for styling
* Attaches event listeners for input changes

---

## 11. src/ui/desktopUI.js

**Exports:**

* `setup()` — Builds desktop controls

**UI Components:**

* Grid sliders (rows, columns)
* Show/hide toggles (mirrors, grid lines, grid dots, center dots)
* Animation controls (duration slider, style dropdown)
* Operation buttons (reset, next curve)
* Canvas click handler for toggling mirrors

**Features:**

* Floating tab with controls
* Canvas resizing to fit container
* Canvas click detection with coordinate translation
* Grid line proximity detection for mirror toggling

**Calls:**

* `stateManager.dispatch()` — For various actions
* `createControlGroup()`, `createButton()`, etc. — For UI components

---

## 12. src/ui/mobileUI.js

**Exports:**

* `setup()` — Builds mobile-friendly controls

**Calls:**

* Same dispatch actions as desktopUI
* Handles touch events

---

## 13. Styles and Static Assets

* `styles.css` — Responsive theming and layout
* `vendor/` — Third-party scripts loaded by `index.html`
