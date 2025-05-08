# AI Implementation Strategy for Mirror-Curve Application

This document outlines a clear, step-by-step strategy that an AI should follow to fully implement, integrate, and test the mirror-curve application.

---

## 1. Project Initialization

1. **Repository Setup**

   * Clone or create the `mirror-curve` Git repository.
   * Ensure the following directories exist: `vendor/`, `src/`, `assets/`.
   * Install or verify third-party dependencies in `vendor/` (e.g., via `npm install` or simply copying libs).

2. **Entry Point Verification**

   * Open `index.html` and confirm it loads `init.js`.
   * In `init.js`, check for correct import paths to `stateManager`, `desktopUI`, and `mobileUI`.
   * Add logging at bootstrap to confirm app startup.

---

## 2. Core Module Implementation

For each file under `src/core/`, perform the following:

1. **eventEmitter.js**

   * Define `on`, `off`, `emit` functions.
   * Unit-test: Subscribe to a test event, emit, and verify handler invocation.

2. **stateManager.js**

   * Implement `initialize()`, internal state object, and `dispatch(action, payload)`.
   * Wire common actions: `UPDATE_GRID`, `NEXT_CURVE`, `RESET`.
   * Unit-test: Dispatch a dummy action and verify state changes.

3. **animationManager.js**

   * Implement a queue to hold `MirrorCurve` instances.
   * Methods: `enqueueCurve(curve)`, `startAnimation()`, `onComplete(callback)`.
   * Unit-test: Enqueue two curves, start animation, verify callbacks in sequence.

4. **screenDrawer.js**

   * Export: `drawGrid(ctx, grid)`, `drawMirrors(ctx, grid)`, `drawCurve(ctx, curve, opts)`.
   * Integrate `spline.js`: if smoothing enabled, compute spline points before drawing.
   * Visual test: Render a simple 3×3 grid and a diagonal mirror.

---

## 3. Logic Integration into Core

1. **Import Logic Classes**

   * In `stateManager`, import `Grid`, `MirrorCurve`, and `findAllCurves` from `src/logic/`.

2. **Action Handlers**

   * `UPDATE_GRID`: Instantiate a new `Grid(rows, cols)` and emit a render event.
   * `NEXT_CURVE`: Call `findNextCurve(grid)`, enqueue returned `MirrorCurve`.
   * `RESET`: Call `grid.resetUsedDirections()` and emit full redraw.

3. **Event Wiring**

   * On state change, `stateManager` should `emit('render', { grid, curves })`.
   * In `init.js`, subscribe: `eventEmitter.on('render', screenDrawer.drawAll)`.

---

## 4. Drawing and Animation

1. **Spline Integration**

   * In `src/drawing/spline.js`, implement Catmull–Rom or Beziér interpolation.
   * Write tests for a known set of control points.

2. **Curve Animation**

   * In `animationManager.startAnimation()`, loop through queued curves:

     * For each, emit `renderCurve` events at fixed FPS (e.g., 60fps).
   * Hook `renderCurve` events to `drawCurve` with incremental helper points.

---

## 5. UI Layer (Desktop & Mobile)

1. **Desktop UI (`desktopUI.js`)**

   * Create controls: grid size selectors, "Next Curve", "All Curves", "Reset" buttons.
   * On control change, call `stateManager.dispatch` with appropriate action.

2. **Mobile UI (`mobileUI.js`)**

   * Mirror desktop controls with responsive styles and touch handlers.

3. **Styling (`styles.css`)**

   * Ensure controls and canvas resize correctly at breakpoints (e.g., 768px).
   * Add high-contrast mode toggle if needed.

---

## 6. Testing & Validation

1. **Unit Tests**

   * Write tests for all core modules, drawing routines, and logic classes.

2. **Integration Tests**

   * Simulate a user flow: set grid → draw first curve → animate → reset.

3. **Cross-Browser Checks**

   * Verify on Chrome, Firefox, and Safari.

4. **Performance Profiling**

   * For large grids (e.g., 50×50), measure and optimize rendering and curve building.

---

## 7. Documentation & Deployment

1. **README.md**

   * Add setup, build, and usage instructions.

2. **LOGICAL\_STRUCTURE.md**

   * Update call graph to reflect final code.

3. **Release**

   * Tag version, push to GitHub, and deploy demo.

---

*End of AI Implementation Strategy.*

