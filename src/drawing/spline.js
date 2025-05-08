/**
 * src/drawing/spline.js
 * Spline interpolation routines for the Mirror-Curve application.
 * Implements cyclic Catmull-Rom interpolation using a tension parameter.
 *
 * Exports:
 *  - getSplinePoints(rawPoints: Point[], tension: number): Point[]
 */

// Linear interpolation between two scalars
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Subdivide a single curve segment using cubic Hermite basis
function segmentSubdivision(P0, P1, M0, M1, subdivisions) {
  const pts = [];
  for (let j = 0; j < subdivisions; j++) {
    const t = j / subdivisions;
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    // Interpolated point
    const x = h00 * P0.x + h10 * M0.x + h01 * P1.x + h11 * M1.x;
    const y = h00 * P0.y + h10 * M0.y + h01 * P1.y + h11 * M1.y;

    pts.push({ x, y });
  }
  return pts;
}

/**
 * Generate Catmull-Rom spline points for cyclic rawPoints.
 *
 * @param {Array<{x:number,y:number}>} rawPoints - Input control points in cyclic order.
 * @param {number} tension - Tension parameter (0 = standard Catmull-Rom, 1 = linear).
 * @param {number} [subdivisions=10] - Number of interpolated points per segment.
 * @returns {Array<{x:number,y:number}>} - Array of interpolated points closing the loop.
 */
export function getSplinePoints(rawPoints, tension = 0.5, subdivisions = 10) {
  const N = rawPoints.length;
  if (N < 2) {
    return rawPoints.slice();
  }
  
  // Check if the curve is already closed (first point equals last point)
  const alreadyClosed = (N > 1 && 
    Math.abs(rawPoints[0].x - rawPoints[N-1].x) < 0.001 && 
    Math.abs(rawPoints[0].y - rawPoints[N-1].y) < 0.001);
  
  // If already closed, don't include the last point in the spline generation
  // to avoid doubling up on the start/end point
  const effectivePoints = alreadyClosed ? rawPoints.slice(0, N-1) : rawPoints;
  const numPoints = effectivePoints.length;
  
  // Compute tangents with adjusted tension
  const tangents = [];
  for (let i = 0; i < numPoints; i++) {
    const prev = effectivePoints[(i - 1 + numPoints) % numPoints];
    const next = effectivePoints[(i + 1) % numPoints];
    tangents.push({
      x: ((next.x - prev.x) * (1 - tension)) / 2,
      y: ((next.y - prev.y) * (1 - tension)) / 2
    });
  }

  const curve = [];
  
  // Build each segment
  for (let i = 0; i < numPoints; i++) {
    const P0 = effectivePoints[i];
    const P1 = effectivePoints[(i + 1) % numPoints];
    const M0 = tangents[i];
    const M1 = tangents[(i + 1) % numPoints];

    // For the last segment of an open curve, we only go to the last point
    // Otherwise, we subdivide normally
    const segment = segmentSubdivision(P0, P1, M0, M1, subdivisions);
    
    // Only add the subdivided points for this segment
    // (except the last one, which will be the first point of the next segment)
    if (i < numPoints - 1 || alreadyClosed) {
      curve.push(...segment);
    } else {
      // For the last segment of an open curve, include the final point
      curve.push(...segment);
    }
  }
  
  // For closed curves, explicitly add the first point to ensure perfect closure
  if (alreadyClosed) {
    curve.push({ 
      x: effectivePoints[0].x, 
      y: effectivePoints[0].y 
    });
  }
  
  return curve;
}
