// src/core/screenDrawer.js
import { on } from './eventEmitter.js';
import { getState } from './stateManager.js';
import { getSplinePoints } from '../drawing/spline.js';
import { ANIMATION_STYLES } from './animationManager.js';

/**
 * Helper function to clear canvas with a background color
 */
function clearCanvas(ctx, color) {
    // First clear the canvas completely
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Only fill with color if not transparent
    if (color !== 'transparent') {
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }
}

/**
 * Convert a grid line to its midpoint coordinates
 */
function getMidpoint(line, cellW, cellH) {
    let x, y;
    
    if (line.type === 'horizontal') {
        // For horizontal lines, the midpoint is at (col + 0.5, row)
        x = (line.col + 0.5) * cellW;
        y = line.row * cellH;
    } else { // vertical
        // For vertical lines, the midpoint is at (col, row + 0.5)
        x = line.col * cellW;
        y = (line.row + 0.5) * cellH;
    }
    
    return { x, y };
}

/**
 * Draw a curve on the canvas
 */
function drawCurve(ctx, curve, idx, cellW, cellH, settings) {
    // Skip if curve is null or not valid
    if (!curve) return;
    
    // Handle different curve formats
    let points = [];
    let isClosed = false;
    
    // Check if this is an animation path object
    if (curve.type === 'animationPath') {
        points = curve.points || [];
        isClosed = curve.isClosed || false;
    }
    // If this is a completed curve that already has points (curved style)
    else if (curve.curvedStyle && curve.points && Array.isArray(curve.points)) {
        // Use the pre-calculated points
        points = curve.points;
        isClosed = curve.isClosed || false;
    }
    // If this is a MirrorCurve object (has gridLines array)
    else if (curve.gridLines && Array.isArray(curve.gridLines)) {
        // Get isClosed property from MirrorCurve
        isClosed = curve.isClosed || false;
        
        // For completed curves, check if we should use the curved style
        if (curve.isCompleted && settings.animationStyle === ANIMATION_STYLES.CURVED) {
            // Calculate helper points and apply spline for smooth curves
            const helperPoints = curve.gridLines.map((line, index) => {
                // Get the basic midpoint
                let x, y;
                if (line.type === 'horizontal') {
                    x = (line.col + 0.5) * cellW;
                    y = line.row * cellH;
                } else { // vertical
                    x = line.col * cellW;
                    y = (line.row + 0.5) * cellH;
                }
                
                // Get the direction
                const direction = curve.directions[index];
                
                // Offset based on direction (similar to calculateCurvedPoints in animationManager)
                const d = Math.min(cellW, cellH) / 4;
                
                if (line.type === 'vertical') {
                    if (direction === 1 || direction === 3) { // NE or SE
                        x += d;
                    } else if (direction === 0 || direction === 2) { // NW or SW
                        x -= d;
                    }
                } else { // horizontal
                    if (direction === 0 || direction === 1) { // NW or NE
                        y -= d;
                    } else if (direction === 2 || direction === 3) { // SW or SE
                        y += d;
                    }
                }
                
                return { x, y };
            });
            
            // Apply spline to get smooth points
            points = getSplinePoints(helperPoints, settings.tension || 0.5, 10);
        } else {
            // Generate points from grid lines (regular midpoints for jagged style)
            points = curve.gridLines.map(line => getMidpoint(line, cellW, cellH));
        }
    } else if (Array.isArray(curve)) {
        // Handle array formats (backward compatibility)
        if (curve.length > 0) {
            if (Array.isArray(curve[0])) {
                // Array of [x, y] pairs
                points = curve.map(([x, y]) => ({ x, y }));
            } else if (typeof curve[0] === 'object' && 'x' in curve[0] && 'y' in curve[0]) {
                // Already array of point objects
                points = curve;
            }
        }
    } else {
        return; // Not a valid curve format
    }
    
    // Skip if no points
    if (points.length === 0) return;
    
    // Determine if we should use spline smoothing for non-completed curves
    // For completed curves, this is already handled above
    const useSpline = !curve.isCompleted && 
                     settings.smooth && 
                     typeof getSplinePoints === 'function' && 
                     isClosed &&
                     curve.type !== 'animationPath'; // Don't apply spline to animation paths
    
    // Apply spline if needed (only for non-completed curves)
    const drawPoints = useSpline 
        ? getSplinePoints(points, settings.tension)
        : points;
    
    // Draw the curve
    ctx.save();
    const { lineStyles, colorScheme } = settings;
    const style = lineStyles.curve;
    const color = colorScheme[idx % colorScheme.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = style.width;
    ctx.beginPath();
    
    drawPoints.forEach((point, i) => {
        const { x, y } = point;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    
    // Close the path if it's a loop
    if (isClosed) {
        ctx.closePath();
    }
    
    ctx.stroke();
    ctx.restore();
}

/**
 * Draw everything on the canvas according to current grid, curves, and options.
 */
export function drawScreen(ctx, state) {
    const grid = state.grid;
    const curves = state.curves || []; // Permanent completed curves
    const animationPath = state.animationPath; // Current animation path
    const settings = state.settings;
    
    
    // Safety check: if grid is null, don't try to draw it
    if (!grid) {
        console.warn("Grid is null, cannot draw screen");
        clearCanvas(ctx, settings.backgroundColor || 'transparent');
        return;
    }
    
    const { showGridLines, showGridPoints, showMirrors, showCenterDots,
            lineStyles, backgroundColor } = settings;
    
    // Get canvas dimensions
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Add a gridLayout property to the state if it doesn't exist
    if (!state.gridLayout) {
        state.gridLayout = {};
    }
    
    // Only recalculate layout values when necessary
    if (!state.gridLayout.cellSize || 
        state.gridLayout.gridRows !== grid.rows || 
        state.gridLayout.gridCols !== grid.cols ||
        state.gridLayout.canvasWidth !== width ||
        state.gridLayout.canvasHeight !== height) {
        
        // Add padding to prevent clipping at the edges (5% of the smallest dimension)
        const minDimension = Math.min(width, height);
        const padding = minDimension * 0.05;
        const drawableWidth = width - (padding * 2);
        const drawableHeight = height - (padding * 2);
        
        // Calculate cell dimensions to ensure cells are square
        const cellSize = Math.min(drawableWidth / grid.cols, drawableHeight / grid.rows);
        
        // Calculate centering offsets to center the grid
        const offsetX = padding + (drawableWidth - (cellSize * grid.cols)) / 2;
        const offsetY = padding + (drawableHeight - (cellSize * grid.rows)) / 2;
        
        // Store these values for consistent reuse
        state.gridLayout = {
            cellSize,
            offsetX,
            offsetY,
            gridRows: grid.rows,
            gridCols: grid.cols,
            canvasWidth: width,
            canvasHeight: height
        };
    }
    
    // Get stored layout values
    const { cellSize, offsetX, offsetY } = state.gridLayout;
    const cellW = cellSize;
    const cellH = cellSize;

    // Clear canvas completely before drawing
    clearCanvas(ctx, backgroundColor);
    
    // Apply translation to center the grid with padding
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw grid lines
    if (showGridLines) {
        ctx.save();
        const style = lineStyles.grid;
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.beginPath();
        for (const line of grid.gridLines.values()) {
            const x1 = line.col * cellW;
            const y1 = line.row * cellH;
            const x2 = (line.type === 'horizontal' ? (line.col + 1) * cellW : x1);
            const y2 = (line.type === 'vertical' ? (line.row + 1) * cellH : y1);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        ctx.restore();
    }

    // Draw grid points (intersections)
    if (showGridPoints) {
        ctx.save();
        const style = lineStyles.gridPoint;
        ctx.fillStyle = style.color;
        for (let r = 0; r <= grid.rows; r++) {
            for (let c = 0; c <= grid.cols; c++) {
                const x = c * cellW;
                const y = r * cellH;
                ctx.beginPath();
                ctx.arc(x, y, style.radius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Draw mirror lines
    if (showMirrors) {
        ctx.save();
        const style = lineStyles.mirror;
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.beginPath();
        for (const line of grid.gridLines.values()) {
            if (!line.isMirror) continue;
            const x1 = line.col * cellW;
            const y1 = line.row * cellH;
            const x2 = (line.type === 'horizontal' ? (line.col + 1) * cellW : x1);
            const y2 = (line.type === 'vertical' ? (line.row + 1) * cellH : y1);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        ctx.restore();
    }

    // Draw center dots
    if (showCenterDots) {
        ctx.save();
        const style = lineStyles.centerDot;
        ctx.fillStyle = style.color;
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const x = (c + 0.5) * cellW;
                const y = (r + 0.5) * cellH;
                ctx.beginPath();
                ctx.arc(x, y, style.radius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Draw permanent curves first
    if (curves && curves.length > 0) {
        curves.forEach((curve, idx) => {
            drawCurve(ctx, curve, idx, cellW, cellH, settings);
        });
    }

    // Draw animation path on top (if exists)
    if (animationPath) {
        // Use a high index to get a different color than existing curves
        drawCurve(ctx, animationPath, curves.length, cellW, cellH, settings);
    }

    // Restore the context after all drawing
    ctx.restore();
}

/**
 * Initialize screen drawing: subscribe to REDRAW events.
 */
export function initScreenDrawer() {
    const canvas = document.getElementById('sd-canvas');
    if (!canvas) {
        console.error('sd-canvas not found');
        return;
    }
    const ctx = canvas.getContext('2d');

    on('REDRAW', () => {
        drawScreen(ctx, getState());
    });

    // Initial draw
    drawScreen(ctx, getState());
}
