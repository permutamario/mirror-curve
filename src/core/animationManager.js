// File: src/core/animationManager.js
import { emit } from './eventEmitter.js';
import { getState } from './stateManager.js';
import { getSplinePoints } from '../drawing/spline.js';
import { Grid } from '../logic/grid.js';

const queue = [];
let completeCallback = null;
let isAnimating = false;
let animationFrame = null;
let currentCurve = null;
let animationStartTime = 0;
let animationSpeed = 200; // Default pixels per second
let currentPathLength = 0; // Will store the length of the current path

// Animation styles
export const ANIMATION_STYLES = {
  JAGGED: 'jagged',
  CURVED: 'curved'
};

/**
 * Enqueue a MirrorCurve instance for animation
 * @param {*} curve
 */
export function enqueueCurve(curve) {
  queue.push(curve);
}

/**
 * Calculate helper points for smoother curve animation
 * @param {Object} curve - The curve object with gridLines and directions
 * @param {Number} cellW - Cell width
 * @param {Number} cellH - Cell height
 * @returns {Array} Array of helper points for smooth curve animation
 */
function calculateCurvedPoints(curve, cellW, cellH) {
  if (!curve || !curve.gridLines || !curve.gridLines.length) return [];
  
  const d = Math.min(cellW, cellH) / 8; // Offset distance (1/4 of cell size)
  
  // Map each grid line to its curved helper point
  const helperPoints = curve.gridLines.map((line, index) => {
    // Get the basic midpoint first
    let x, y;
    if (line.type === 'horizontal') {
      x = (line.col + 0.5) * cellW;
      y = line.row * cellH;
    } else { // vertical
      x = line.col * cellW;
      y = (line.row + 0.5) * cellH;
    }
    
    // Only apply offset if this edge segment is a mirror
    if (line.isMirror) {
      // Get the direction associated with this grid line
      const direction = curve.directions[index];
      
      // Adjust the point based on line type and direction
      if (line.type === 'vertical') {
        if (direction === Grid.NE || direction === Grid.SE) {
          // Move d units East
          x += d;
        } else if (direction === Grid.NW || direction === Grid.SW) {
          // Move d units West
          x -= d;
        }
      } else { // horizontal
        if (direction === Grid.NE || direction === Grid.NW) {
          // Move d units North
          y -= d;
        } else if (direction === Grid.SE || direction === Grid.SW) {
          // Move d units South
          y += d;
        }
      }
    }
    
    return { x, y };
  });
  
  return helperPoints;
}


/**
 * Calculate points along the path for animation
 * @param {Object} curve - The curve to animate
 * @param {Number} cellW - Cell width
 * @param {Number} cellH - Cell height
 * @param {String} style - Animation style (jagged or curved)
 * @returns {Array} Array of points along the path
 */
function calculatePathPoints(curve, cellW, cellH, style) {
  if (!curve || !curve.gridLines || !curve.gridLines.length) return [];
  
  // For jagged animation style, just use midpoints
  if (!style || style === ANIMATION_STYLES.JAGGED) {
    // Convert gridLines to midpoints (original implementation)
    return curve.gridLines.map(line => {
      let x, y;
      if (line.type === 'horizontal') {
        x = (line.col + 0.5) * cellW;
        y = line.row * cellH;
      } else { // vertical
        x = line.col * cellW;
        y = (line.row + 0.5) * cellH;
      }
      return { x, y };
    });
  } 
  // For curved animation style, use helper points and apply spline
  else if (style === ANIMATION_STYLES.CURVED) {
    const helperPoints = calculateCurvedPoints(curve, cellW, cellH);
    
    // Use spline interpolation with helper points
    // Default tension of 0.5 and 10 subdivisions per segment
    return getSplinePoints(helperPoints, 0.05, 10);
  }
  
  // Default fallback to original midpoints implementation
  return curve.gridLines.map(line => {
    let x, y;
    if (line.type === 'horizontal') {
      x = (line.col + 0.5) * cellW;
      y = line.row * cellH;
    } else { // vertical
      x = line.col * cellW;
      y = (line.row + 0.5) * cellH;
    }
    return { x, y };
  });
}

/**
 * Calculate the total path length
 * @param {Array} points - Array of points along the path
 * @returns {Number} Total path length
 */
function calculatePathLength(points) {
  if (!points || points.length < 2) return 0;
  
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    length += Math.sqrt(dx*dx + dy*dy);
  }
  
  // If closed curve, add distance from last point to first point
  const isClosed = currentCurve && currentCurve.isClosed;
  if (isClosed && points.length > 1) {
    const dx = points[0].x - points[points.length-1].x;
    const dy = points[0].y - points[points.length-1].y;
    length += Math.sqrt(dx*dx + dy*dy);
  }
  
  return length;
}

/**
 * Find the point at a specific distance along the path
 * @param {Array} points - Array of points along the path
 * @param {Number} targetDistance - The distance along the path
 * @param {Boolean} isClosed - Whether the curve is closed
 * @returns {Object} The point at the specified distance and the index of the segment
 */
function getPointAtDistance(points, targetDistance, isClosed) {
  if (!points || points.length < 2 || targetDistance <= 0) {
    return { point: points[0], segmentIndex: 0 };
  }
  
  let distanceTraveled = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    const segmentLength = Math.sqrt(dx*dx + dy*dy);
    
    if (distanceTraveled + segmentLength >= targetDistance) {
      // We found the segment where our target distance falls
      const remainingDistance = targetDistance - distanceTraveled;
      const ratio = remainingDistance / segmentLength;
      
      // Interpolate to find the exact point
      const x = points[i-1].x + ratio * dx;
      const y = points[i-1].y + ratio * dy;
      
      return { 
        point: { x, y },
        segmentIndex: i-1
      };
    }
    
    distanceTraveled += segmentLength;
  }
  
  // If it's a closed curve and we've gone through all segments but haven't found the point
  if (isClosed && points.length > 1) {
    const dx = points[0].x - points[points.length-1].x;
    const dy = points[0].y - points[points.length-1].y;
    const segmentLength = Math.sqrt(dx*dx + dy*dy);
    
    if (distanceTraveled + segmentLength >= targetDistance) {
      const remainingDistance = targetDistance - distanceTraveled;
      const ratio = remainingDistance / segmentLength;
      
      const x = points[points.length-1].x + ratio * dx;
      const y = points[points.length-1].y + ratio * dy;
      
      return { 
        point: { x, y },
        segmentIndex: points.length-1 
      };
    }
  }
  
  // If we've gone past the total path length, return the last point
  return { 
    point: isClosed ? points[0] : points[points.length-1],
    segmentIndex: points.length-1
  };
}

/**
 * Animate the path by drawing it up to the current progress point
 * @param {Number} progress - Value between 0 and 1 indicating animation progress
 */
function animatePath(progress) {
  if (!currentCurve) return;
  
  const state = getState();
  const { cellSize } = state.gridLayout || {};
  if (!cellSize) return;
  
  // Calculate the cell width and height
  const cellW = cellSize;
  const cellH = cellSize;
  
  // Calculate all the points along the path using the animation style from settings
  const pathPoints = calculatePathPoints(
    currentCurve, 
    cellW, 
    cellH, 
    state.settings.animationStyle
  );
  
  if (pathPoints.length < 2) return;
  
  // Calculate the total path length
  const totalLength = calculatePathLength(pathPoints);
  if (totalLength <= 0) return;
  
  // Current distance traveled based on progress
  const currentDistance = progress * totalLength;
  
  // Get the current point and segment index
  const { point: currentPoint, segmentIndex } = getPointAtDistance(
    pathPoints, 
    currentDistance, 
    currentCurve.isClosed
  );
  
  // Create a partial path up to the current point
  const partialPoints = [
    ...pathPoints.slice(0, segmentIndex + 1),
    currentPoint
  ];
  
  // Create a partial curve with the visible part of the path
  const partialCurve = {
    type: 'animationPath',
    points: partialPoints,
    isClosed: false, // Never closed while animating
    style: state.settings.animationStyle
  };
  
  // Update the display with the partial curve
  emit('updateAnimationPath', partialCurve);
}

/**
 * Calculate the final, complete set of points for a curve
 * This is used to generate the permanent curve that is displayed after animation
 * @param {Object} curve - The curve object
 * @param {String} style - Animation style to use
 * @param {Number} cellW - Cell width
 * @param {Number} cellH - Cell height
 * @returns {Object} The completed curve with all necessary properties
 */
function generateCompletedCurve(curve, style, cellW, cellH) {
  // Start with a copy of the original curve
  const completedCurve = {
    ...curve,
    isCompleted: true
  };
  
  // If using curved style, we need to add the points and mark it as curved
  if (style === ANIMATION_STYLES.CURVED) {
    // Calculate the full set of curved points
    const points = calculatePathPoints(curve, cellW, cellH, ANIMATION_STYLES.CURVED);
    
    // Add them to the completed curve
    completedCurve.curvedStyle = true;
    completedCurve.points = points;
  }
  
  return completedCurve;
}

/**
 * Animation frame callback for smooth animation
 * @param {Number} timestamp - Current timestamp from requestAnimationFrame
 */
function animationStep(timestamp) {
  if (!isAnimating || !currentCurve) {
    cancelAnimationFrame(animationFrame);
    isAnimating = false;
    return;
  }
  
  if (!animationStartTime) {
    animationStartTime = timestamp;
    
    // Calculate path points and length for the current curve
    const state = getState();
    const { cellSize } = state.gridLayout || {};
    const cellW = cellSize;
    const cellH = cellSize;
    
    const pathPoints = calculatePathPoints(
      currentCurve, 
      cellW, 
      cellH, 
      state.settings.animationStyle
    );
    
    currentPathLength = calculatePathLength(pathPoints);
    
    // Calculate animation duration based on path length and speed
    // Speed is in pixels per second, so we convert to milliseconds
    const calculatedDuration = (currentPathLength / animationSpeed) * 1000;
    console.log(`Path length: ${currentPathLength}px, Speed: ${animationSpeed}px/s, Duration: ${calculatedDuration}ms`);
  }
  
  // Calculate progress (0 to 1)
  const elapsed = timestamp - animationStartTime;
  
  // Calculate the animation duration based on path length and speed
  const calculatedDuration = (currentPathLength / animationSpeed) * 1000;
  
  const progress = Math.min(elapsed / calculatedDuration, 1);
  
  // Animate the path based on current progress
  animatePath(progress);
  
  // If animation is complete
  if (progress >= 1) {
    const state = getState();
    const { cellSize } = state.gridLayout || {};
    const cellW = cellSize;
    const cellH = cellSize;
    
    // Create a properly formatted curve object to add to permanent curves
    // Use the current animation style from settings
    const completedCurve = generateCompletedCurve(
      currentCurve,
      state.settings.animationStyle,
      cellW,
      cellH
    );
    
    // Add the completed curve to the permanent curves
    emit('addCompletedCurve', completedCurve);
    
    // Clear the animation path now that we've added the curve to permanent collection
    emit('clearAnimationPath');
    
    // Check for more curves in the queue
    if (queue.length > 0) {
      currentCurve = queue.shift();
      animationStartTime = 0; // Reset for next curve
      currentPathLength = 0;  // Reset path length for next curve
      animationFrame = requestAnimationFrame(animationStep);
    } else {
      // All done
      cancelAnimationFrame(animationFrame);
      isAnimating = false;
      if (completeCallback) completeCallback();
    }
  } else {
    // Continue animation
    animationFrame = requestAnimationFrame(animationStep);
  }
}

/**
 * Start processing the animation queue.
 * Animates each curve as a continuous path.
 */
export function startAnimation() {
  if (isAnimating || queue.length === 0) return;
  
  isAnimating = true;
  currentCurve = queue.shift();
  animationStartTime = 0;
  currentPathLength = 0;
  
  // Clear any existing animation path (but keep completed curves!)
  emit('clearAnimationPath');
  
  // Start the animation loop
  animationFrame = requestAnimationFrame(animationStep);
}

/**
 * Register a callback to be called when queue drains
 * @param {Function} cb
 */
export function onComplete(cb) {
  completeCallback = cb;
}

/**
 * Check if animation is currently in progress
 * @returns {boolean}
 */
export function isCurrentlyAnimating() {
  return isAnimating;
}

/**
 * Set animation speed
 * @param {number} speed - pixels per second
 */
export function setAnimationSpeed(speed) {
  animationSpeed = speed;
}

/**
 * Get current animation speed
 * @returns {number} speed in pixels per second
 */
export function getAnimationSpeed() {
  return animationSpeed;
}

/**
 * Set animation duration (DEPRECATED)
 * Use setAnimationSpeed instead
 * @param {number} duration - milliseconds for the entire path animation
 */
export function setAnimationDuration(duration) {
  console.warn('setAnimationDuration is deprecated, use setAnimationSpeed instead');
  // Convert duration to speed assuming average path length of 500px
  const averagePathLength = 500;
  const estimatedSpeed = averagePathLength / (duration / 1000);
  setAnimationSpeed(estimatedSpeed);
}

/**
 * Cancel the current animation
 */
export function cancelAnimation() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  isAnimating = false;
  queue.length = 0; // Clear the queue
}

/**
 * Clear all animations
 */
export function clearAllAnimations() {
  // Cancel any ongoing animation
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  
  // Reset animation state
  isAnimating = false;
  currentCurve = null;
  animationStartTime = 0;
  currentPathLength = 0;
  
  // Clear the queue
  queue.length = 0;
  
  // Clear the animation path in the UI
  emit('clearAnimationPath');
  
  console.log("All animations cleared");
}
