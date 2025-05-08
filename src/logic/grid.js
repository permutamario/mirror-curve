/**
 * Grid class for Mirror Curve application
 * Manages the grid structure and mirrors without any rendering dependencies
 */
export class Grid {
  // Direction constants
  static NW = 0;
  static NE = 1;
  static SW = 2;
  static SE = 3;
  
  /**
   * Create a new Grid
   * @param {number} rows - Number of rows in the grid
   * @param {number} cols - Number of columns in the grid
   */
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.gridLines = new Map(); // Map of all grid lines
    this.usedDirections = new Map(); // Map of used directions for each grid line
    
    // Initialize grid lines and connections
    this.initializeGridLines();
    this.computeConnections();
    this.placeBoundaryMirrors(); // Place mirrors on all boundary grid lines
    this.initializeUsedDirections(); // Mark appropriate directions as used
  }

  /**
   * Create all horizontal and vertical grid lines
   * Stores results in this.gridLines
   */
  initializeGridLines() {
    // Create horizontal grid lines
    for (let row = 0; row <= this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const id = this.generateGridLineId('h', row, col);
        this.gridLines.set(id, {
          id: id,
          type: 'horizontal',
          row: row,
          col: col,
          isMirror: false,
          connections: { 
            [Grid.NW]: null, 
            [Grid.NE]: null, 
            [Grid.SW]: null, 
            [Grid.SE]: null 
          }
        });
      }
    }
    
    // Create vertical grid lines
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col <= this.cols; col++) {
        const id = this.generateGridLineId('v', row, col);
        this.gridLines.set(id, {
          id: id,
          type: 'vertical',
          row: row,
          col: col,
          isMirror: false,
          connections: { 
            [Grid.NW]: null, 
            [Grid.NE]: null, 
            [Grid.SW]: null, 
            [Grid.SE]: null 
          }
        });
      }
    }
  }

  /**
   * Place mirrors on all boundary grid lines
   */
  placeBoundaryMirrors() {
    // Top boundary (horizontal lines at row 0)
    for (let col = 0; col < this.cols; col++) {
      const id = this.generateGridLineId('h', 0, col);
      this.setMirror(id, true);
    }
    
    // Bottom boundary (horizontal lines at row = this.rows)
    for (let col = 0; col < this.cols; col++) {
      const id = this.generateGridLineId('h', this.rows, col);
      this.setMirror(id, true);
    }
    
    // Left boundary (vertical lines at col 0)
    for (let row = 0; row < this.rows; row++) {
      const id = this.generateGridLineId('v', row, 0);
      this.setMirror(id, true);
    }
    
    // Right boundary (vertical lines at col = this.cols)
    for (let row = 0; row < this.rows; row++) {
      const id = this.generateGridLineId('v', row, this.cols);
      this.setMirror(id, true);
    }
  }

  /**
   * Pre-compute connections between all grid lines
   * This creates a navigation map for all four directions
   */
  computeConnections() {
    // For each grid line
    for (const gridLine of this.gridLines.values()) {
      const { type, row, col } = gridLine;
      
      if (type === 'horizontal') {
        // For horizontal lines
        // NW connection - vertical line to the left
        if (col >= 0 && row > 0) {
          gridLine.connections[Grid.NW] = this.generateGridLineId('v', row - 1, col);
        }
        
        // NE connection - vertical line to the right
        if (row > 0) {
          gridLine.connections[Grid.NE] = this.generateGridLineId('v', row - 1, col + 1);
        }
        
        // SW connection - vertical line to the left (below)
        if (col >= 0 && row < this.rows) {
          gridLine.connections[Grid.SW] = this.generateGridLineId('v', row, col);
        }
        
        // SE connection - vertical line to the right (below)
        if (row < this.rows) {
          gridLine.connections[Grid.SE] = this.generateGridLineId('v', row, col + 1);
        }
      } else {
        // For vertical lines
        // NW connection - horizontal line above
        if (row >= 0 && col > 0) {
          gridLine.connections[Grid.NW] = this.generateGridLineId('h', row, col - 1);
        }
        
        // NE connection - horizontal line above (to the right)
        if (row >= 0 && col < this.cols) {
          gridLine.connections[Grid.NE] = this.generateGridLineId('h', row, col);
        }
        
        // SW connection - horizontal line below
        if (row < this.rows && col > 0) {
          gridLine.connections[Grid.SW] = this.generateGridLineId('h', row + 1, col - 1);
        }
        
        // SE connection - horizontal line below (to the right)
        if (row < this.rows && col < this.cols) {
          gridLine.connections[Grid.SE] = this.generateGridLineId('h', row + 1, col);
        }
      }
      
      // Validate connections (remove those that point outside the grid)
      //for (const direction in gridLine.connections) {
      //  const connId = gridLine.connections[direction];
      //  if (connId !== null && !this.gridLines.has(connId)) {
      //    gridLine.connections[direction] = null;
      //  }
      //}
    }
  }

  /**
   * Initialize the tracking of used directions
   * For boundary mirrors, marks the specific directions as used according to their position
   */
  initializeUsedDirections() {
    // Initialize empty sets for all grid lines
    for (const [id, gridLine] of this.gridLines.entries()) {
      this.usedDirections.set(id, new Set());
    }
    
    // Set used directions for boundary mirrors as specified
    for (const [id, gridLine] of this.gridLines.entries()) {
      // If it's not a boundary line, all directions are initially available
      if (!this.isBoundaryGridLine(gridLine)) {
        continue;
      }
      
      // Mark the appropriate directions as used based on the boundary position
      if (gridLine.type === 'horizontal') {
        if (gridLine.row === 0) {
          // Horizontal top - NW NE are used
          this.usedDirections.get(id).add(Grid.NW);
          this.usedDirections.get(id).add(Grid.NE);
        } else if (gridLine.row === this.rows) {
          // Horizontal bottom - SW SE are used
          this.usedDirections.get(id).add(Grid.SW);
          this.usedDirections.get(id).add(Grid.SE);
        }
      } else { // vertical
        if (gridLine.col === 0) {
          // Vertical left - SW NW are used
          this.usedDirections.get(id).add(Grid.SW);
          this.usedDirections.get(id).add(Grid.NW);
        } else if (gridLine.col === this.cols) {
          // Vertical right - NE SE are used
          this.usedDirections.get(id).add(Grid.NE);
          this.usedDirections.get(id).add(Grid.SE);
        }
      }
    }
  }

  /**
   * Check if a grid line is on the boundary
   * @param {Object} gridLine - The grid line to check
   * @returns {boolean} True if the grid line is on the boundary
   */
  isBoundaryGridLine(gridLine) {
    if (!gridLine) return false;
    
    const { type, row, col } = gridLine;
    
    if (type === 'horizontal') {
      return row === 0 || row === this.rows;
    } else { // vertical
      return col === 0 || col === this.cols;
    }
  }

  /**
   * Retrieve a grid line by its ID
   * @param {string} id - Grid line ID
   * @returns {Object|null} The grid line or null if not found
   */
  getGridLine(id) {
    return this.gridLines.get(id) || null;
  }

  /**
   * Get the adjacent grid line ID in the specified direction
   * @param {string} lineId - Starting grid line ID
   * @param {number} direction - Direction (use Grid.NW, Grid.NE, etc.)
   * @returns {string|null} ID of the adjacent grid line or null if none
   * @throws {Error} If trying to move outside the grid
   */
  getAdjacentGridLine(lineId, direction) {
    const gridLine = this.getGridLine(lineId);
    if (!gridLine) return null;
    
    // Make sure direction is valid
    if (![Grid.NW, Grid.NE, Grid.SW, Grid.SE].includes(direction)) {
      return null;
    }
    
    const nextLineId = gridLine.connections[direction];
    
    // Check if this move would leave the grid
    if (nextLineId === null) {
      throw new Error("Curve left the grid");
    }
    
    return nextLineId;
  }

  /**
   * Set the mirror status of a grid line
   * @param {string} lineId - Grid line ID
   * @param {boolean} isMirror - Whether this line should be a mirror
   */
  setMirror(lineId, isMirror) {
    const gridLine = this.getGridLine(lineId);
    if (gridLine) {
      gridLine.isMirror = isMirror;
    }
  }

  /**
   * Get the reflected direction when a ray hits a mirror
   * @param {string} gridLineId - ID of the grid line (mirror)
   * @param {number} incomingDirection - Direction (use Grid.NW, Grid.NE, etc.)
   * @returns {number} Reflected direction
   */
  getReflectedDirection(gridLineId, incomingDirection) {
    const gridLine = this.getGridLine(gridLineId);
    if (!gridLine) return incomingDirection;
    
    // If not a mirror, just continue in the same direction
    if (!gridLine.isMirror) {
      return incomingDirection;
    }
    
    // Calculate reflection based on line orientation and incoming direction
    // For horizontal mirrors: NW <-> SW, NE <-> SE
    // For vertical mirrors: NW <-> NE, SW <-> SE
    
    if (gridLine.type === 'horizontal') {
      switch (incomingDirection) {
        case Grid.NW: return Grid.SW;
        case Grid.NE: return Grid.SE;
        case Grid.SW: return Grid.NW;
        case Grid.SE: return Grid.NE;
        default: return incomingDirection;
      }
    } else { // vertical
      switch (incomingDirection) {
        case Grid.NW: return Grid.NE;
        case Grid.NE: return Grid.NW;
        case Grid.SW: return Grid.SE;
        case Grid.SE: return Grid.SW;
        default: return incomingDirection;
      }
    }
  }

  /**
   * Mark a direction as used for a grid line
   * @param {string} gridLineId - Grid line ID
   * @param {number} direction - Direction (use Grid.NW, Grid.NE, etc.)
   */
  markDirectionUsed(gridLineId, direction) {
    if (this.usedDirections.has(gridLineId)) {
      this.usedDirections.get(gridLineId).add(direction);
    }
  }

  /**
   * Check if a direction is already used for a grid line
   * @param {string} gridLineId - Grid line ID
   * @param {number} direction - Direction (use Grid.NW, Grid.NE, etc.)
   * @returns {boolean} True if the direction is already used
   */
  isDirectionUsed(gridLineId, direction) {
    if (!this.usedDirections.has(gridLineId)) {
      return false;
    }
    return this.usedDirections.get(gridLineId).has(direction);
  }

  /**
   * Get all unused directions for a grid line
   * @param {string} gridLineId - Grid line ID
   * @returns {number[]} Array of available directions
   */
  getUnusedDirections(gridLineId) {
    const allDirections = [Grid.NW, Grid.NE, Grid.SW, Grid.SE];
    const gridLine = this.getGridLine(gridLineId);
    
    if (!gridLine || !this.usedDirections.has(gridLineId)) {
      return [];
    }
    
    const usedDirs = this.usedDirections.get(gridLineId);
    const validDirs = allDirections.filter(dir => {
      // Filter out directions where connection is null
      //if (gridLine.connections[dir] === null) {
        //return false;
      //}
      // Filter out directions that are already used
      if (usedDirs.has(dir)) {
        return false;
      }
      return true;
    });
    
    return validDirs;
  }

  /**
   * Reset all used directions
   * Re-initializes with the correct boundary mirror directions
   */
  resetUsedDirections() {
    this.initializeUsedDirections();
  }

  /**
   * Check if a direction from a grid line leads off the grid
   * @param {string} gridLineId - Grid line ID
   * @param {number} direction - Direction (use Grid.NW, Grid.NE, etc.)
   * @returns {boolean} True if the direction leads off the grid
   */
  isEdgeDirection(gridLineId, direction) {
    const gridLine = this.getGridLine(gridLineId);
    if (!gridLine) return true;
    
    // Make sure direction is valid
    if (![Grid.NW, Grid.NE, Grid.SW, Grid.SE].includes(direction)) {
      return true;
    }
    
    return gridLine.connections[direction] === null;
  }

  /**
   * Get the number of mirrors in the grid
   * @returns {number} Number of mirrors
   */
  getMirrorCount() {
    let count = 0;
    for (const gridLine of this.gridLines.values()) {
      if (gridLine.isMirror) count++;
    }
    return count;
  }

    /**
     * Randomly toggles each interior mirror line with probability p.
     * Boundary lines (all of which are always mirrors) are left unchanged.
     * @param {number} p – probability in [0,1] of toggling each line’s mirror state
     */
    randomizeMirrors(p) {
	if (p < 0 || p > 1) {
	    throw new Error("Probability must be between 0 and 1");
	}

	for (const [id, gridLine] of this.gridLines.entries()) {
	    // skip boundary lines
	    const { type, row, col } = this.parseGridLineId(id);
	    const isBoundary =
		  (type === 'h' && (row === 0 || row === this.rows)) ||
		  (type === 'v' && (col === 0 || col === this.cols));
	    if (isBoundary) continue;

	    // with probability p, flip its mirror status
	    if (Math.random() < p) {
		this.setMirror(id, !gridLine.isMirror);
	    }
	}
    }

  /**
   * Generate a standard grid line ID
   * @param {string} type - 'h' for horizontal, 'v' for vertical
   * @param {number} row - Row index
   * @param {number} col - Column index
   * @returns {string} Formatted ID string
   */
  generateGridLineId(type, row, col) {
    return `${type}_${row}_${col}`;
  }

  /**
   * Parse components from a grid line ID
   * @param {string} id - Grid line ID
   * @returns {Object} Object with type, row, and col properties
   */
  parseGridLineId(id) {
    const parts = id.split('_');
    return {
      type: parts[0],
      row: parseInt(parts[1], 10),
      col: parseInt(parts[2], 10)
    };
  }
}
