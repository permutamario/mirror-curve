/**
 * CurveFinder - Simple helper functions to find mirror curves on a grid
 */


/**
 * Find the next available curve in a grid
 * @param {Grid} grid - The grid object containing mirrors
 * @returns {MirrorCurve|null} The next available curve or null if none
 */
function findNextCurve(grid) {
  console.log('Looking for the next available curve...');
  
  // Find any grid line that has a mirror and an unused direction
  for (const [id, gridLine] of grid.gridLines.entries()) {
 
    // Get unused directions for this grid line
    const unusedDirections = grid.getUnusedDirections(id);
    
    // If there are unused directions, create a curve with the first one
    if (unusedDirections.length > 0) {
      const direction = unusedDirections[0];
      console.log(`Starting curve from ${id} in direction ${direction}`);
      
      // Create a new curve
      const curve = new MirrorCurve(gridLine, direction);
      
      try {
        // Build the curve
        const success = curve.buildCurve(grid);
        
        if (success) {
          console.log(`Built curve with ${curve.gridLines.length} segments (${curve.isClosed ? 'closed loop' : 'open path'})`);
          return curve;
        }
      } catch (error) {
        console.error(`Error building curve from ${id} in direction ${direction}:`, error);
        // Continue with the next grid line
      }
    }
  }
  
  console.log('No more curves available');
  return null;
}

/**
 * Find all possible curves in a grid
 * @param {Grid} grid - The grid object containing mirrors
 * @returns {Array<MirrorCurve>} Array of all unique mirror curves
 */
function findAllCurves(grid) {
  const curves = [];
  
  // Reset used directions
  grid.resetUsedDirections();
  
  // Keep finding curves until there are no more
  let curve;
  while ((curve = findNextCurve(grid)) !== null) {
    curves.push(curve);
  }
  
  return curves;
}
