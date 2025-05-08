/**
 * MirrorCurve class for Mirror Curve application
 * Represents a curve that traverses a grid following mirror reflection rules
 */

import { Grid } from "./grid.js";
export class MirrorCurve {
  /**
   * Create a new MirrorCurve
   * @param {Object} startGridLine - The starting grid line
   * @param {number} initialDirection - Initial direction (use Grid.NW, Grid.NE, etc.)
   */
  constructor(startGridLine, initialDirection) {
    // Store the grid lines that form the curve
    this.gridLines = [startGridLine];
    
    // Store the directions after each grid line
    this.directions = [initialDirection];
    
    // Track if the curve is a closed loop
    this.isClosed = false;
    
    // Track if the curve left the grid
    this.leftGrid = false;
    
    // Store exit point and direction if curve leaves grid
    this.exitPoint = null;
    this.exitDirection = null;
  }
  
  /**
   * Add a segment to the curve
   * @param {Object} nextGridLine - The next grid line to add
   * @param {number} nextDirection - The direction after this grid line
   */
  addSegment(nextGridLine, nextDirection) {
    this.gridLines.push(nextGridLine);
    this.directions.push(nextDirection);
  }
  
  /**
   * Build the complete curve by traversing the grid
   * @param {Grid} grid - The grid object containing mirrors and connectivity
   * @returns {boolean} - True if the curve was successfully built
   */
    buildCurve(grid) {
    // Maximum number of segments to prevent infinite loops
    const MAX_SEGMENTS = 1000000;
    
    // Mark the initial direction as used
    let currentGridLine = this.gridLines[0];
    let currentDirection = this.directions[0];
    grid.markDirectionUsed(currentGridLine.id, currentDirection);
    
    // Build the curve until it forms a loop or reaches an edge
    while (this.gridLines.length < MAX_SEGMENTS) {
      try {
        // Get the next grid line in the current direction
        const nextLineId = grid.getAdjacentGridLine(currentGridLine.id, currentDirection);
        
        // If getAdjacentGridLine returned null, we'd already be in the catch block
        // So if we're here, we have a valid next line
        const nextGridLine = grid.getGridLine(nextLineId);
        
        // If the next line doesn't exist for some reason, stop
        if (!nextGridLine) {
          console.warn(`Invalid grid line returned: ${nextLineId}`);
          return false;
        }
        
        // Determine the next direction based on whether the line is a mirror
        let nextDirection = currentDirection;
        if (nextGridLine.isMirror) {
          nextDirection = grid.getReflectedDirection(nextLineId, currentDirection);
        }
        
        // Add the segment to the curve
          this.addSegment(nextGridLine, nextDirection);

	  
          // Mark the outgoingdirection as used
	  grid.markDirectionUsed(nextLineId, nextDirection);
	  const oppositeDirection = currentDirection === Grid.NW ? Grid.SE
		: currentDirection === Grid.SE ? Grid.NW
		: currentDirection === Grid.NE ? Grid.SW
		: /* else SW */             Grid.NE;
	  
	  // Mark that incoming direction as used
	  grid.markDirectionUsed(
	      nextLineId,
	      oppositeDirection);

          
        // Check if we've formed a loop back to the start
        if (this.gridLines.length > 2) { // Need at least 3 points for a meaningful loop
          // Check if we're back at the starting point with matching direction
          if (nextGridLine.id === this.gridLines[0].id && 
              nextDirection === this.directions[0]) {
            this.isClosed = true;
            return true;
          }
        }
        
        
        
        // Update current position for next iteration
        currentGridLine = nextGridLine;
        currentDirection = nextDirection;
      }
      catch (error) {
        // If we get "Curve left the grid" error, mark it and record exit information
        if (error.message === "Curve left the grid") {
          this.leftGrid = true;
          this.exitPoint = currentGridLine;
          this.exitDirection = currentDirection;
          return true; // Successfully built curve, it just left the grid
        }
        // For any other error, propagate it
        throw error;
      }
    }
    
    // If we reach here, we hit the maximum number of segments
    console.warn('Maximum segments reached without forming a loop');
    return false;
  }
  
  /**
   * Generate a string representation of the curve
   * @returns {string} Formatted representation of the curve
   */
  toString() {
    const directionNames = ['NW', 'NE', 'SW', 'SE'];
    let result = 'MirrorCurve:\n';
    
    for (let i = 0; i < this.gridLines.length; i++) {
      const gridLine = this.gridLines[i];
      const direction = directionNames[this.directions[i]];
      
      result += `  ${gridLine.id} -> ${direction}\n`;
    }
    
    if (this.isClosed) {
      result += '  (Closed loop)';
    } else if (this.leftGrid) {
      result += `  (Left grid at ${this.exitPoint.id} in direction ${directionNames[this.exitDirection]})`;
    } else {
      result += '  (Open path)';
    }
    
    return result;
  }
}
