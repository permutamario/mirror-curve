// File: src/core/stateManager.js
import { emit } from './eventEmitter.js';
import { Grid } from '../logic/grid.js';
import { 
  enqueueCurve, 
  startAnimation, 
  ANIMATION_STYLES, 
  setAnimationSpeed, 
  getAnimationSpeed,
  clearAllAnimations 
} from './animationManager.js';

// Internal application state
// Loaded with the defaults
let state = {
	grid: new Grid(5,5),
	curves: [],          // Permanent curves that stay visible
	animationPath: null, // Current animation path (temporary)
	settings: {
            showGridLines:  false,
            showGridPoints: false,
            showMirrors:    true,
            showCenterDots: true,

            // spline options
            smooth:  false,
            tension: 0.5,

            // animation options
            animationSpeed: 3900/2, // pixels per second (new setting replacing duration)
            animationStyle: 'curved', // default to jagged animation

            // overall palette
            backgroundColor: 'transparent',
            colorScheme: [
		'#e41a1c',
		'#377eb8',
		'#4daf4a',
		'#984ea3',
		'#ff7f00',
		'#ffff33'
            ],

            // individual line/point styles
            lineStyles: {
		grid:      { color: '#000000', width: 1 },
		gridPoint: { color: '#888888', radius: 3 },
		mirror:    { color: '#000000', width: 2 },
		centerDot: { color: '#888888', radius: 3 },
		curve:     { width: 2 }
            }
	}
    };



/**
 * Initialize application state and emit initial render
 * This creates the grid 
 */
export function initialize() {
    state.grid = new Grid(5, 5);
    console.log("Initial Grid", state.grid);
    
    // Initialize animation speed from state
    setAnimationSpeed(state.settings.animationSpeed);
    
    // Set up the event listeners for animation events
    import('./eventEmitter.js').then(({ on }) => {
        // Event to update the animation path
        on('updateAnimationPath', (animationPath) => {
            state.animationPath = animationPath;
            emit('REDRAW');
        });
        
        // Event to clear the animation path (but keep completed curves)
        on('clearAnimationPath', () => {
            state.animationPath = null;
            emit('REDRAW');
        });
        
        // Event to add a completed curve to the permanent curves
        on('addCompletedCurve', (curve) => {
            // Add the curve to the permanent collection
            state.curves.push(curve);
            emit('REDRAW');
        });
    });
}

/**
 * Dispatch an action to update state
 * @param {string} action
 * @param {*} payload
 */
export function dispatch(action, payload) {
    switch (action) {

    case 'UPDATE_GRID':
	// payload should have { rows, cols }
	state.grid = new Grid(payload.rows, payload.cols);
	state.curves = [];
	state.animationPath = null;
	
	// Reset grid layout data
	if (state.gridLayout) {
            state.gridLayout.gridRows = payload.rows;
            state.gridLayout.gridCols = payload.cols;
            // Force recalculation
            state.gridLayout.cellSize = null;
	}
	
	// Clear all pending animations when grid changes
	clearAllAnimations();
	
	console.log("Grid updated, cleared all curves and animations",state.grid);
	emit('REDRAW');
    break;
    case 'TOGGLE_MIRRORS':
        // payload should have { show }
        state.settings.showMirrors = payload.show;
        emit('REDRAW');
        break;
    case 'TOGGLE_GRID_LINES':
        // payload should have { show }
        state.settings.showGridLines = payload.show;
        emit('REDRAW');
        break;
    case 'TOGGLE_GRID_DOTS':
        // payload should have { show }
        state.settings.showGridPoints = payload.show;
        emit('REDRAW');
        break;
    case 'TOGGLE_CENTER_DOTS':
        // payload should have { show }
        state.settings.showCenterDots = payload.show;
        emit('REDRAW');
        break;
    case 'SET_ANIMATION_SPEED':
        // payload should have { speed }
        state.settings.animationSpeed = payload.speed;
        setAnimationSpeed(payload.speed);
        break;
    case 'SET_ANIMATION_STYLE':
        // payload should have { style }
        state.settings.animationStyle = payload.style;
        // No warning needed as curved animation is now implemented
        break;
    // Keep the old duration case for backward compatibility
    case 'SET_ANIMATION_DURATION':
        console.warn('SET_ANIMATION_DURATION is deprecated, use SET_ANIMATION_SPEED instead');
        // Convert duration to speed assuming average path length of 500px
        const averagePathLength = 500;
        const estimatedSpeed = averagePathLength / (payload.duration / 1000);
        state.settings.animationSpeed = estimatedSpeed;
        setAnimationSpeed(estimatedSpeed);
        break;

    case 'RANDOM':
	state.grid.randomizeMirrors(0.15);
	// Clear all curves and animations when mirrors change
        state.curves = [];
        state.animationPath = null;
        clearAllAnimations();
	break;
    case 'NEXT_CURVE':
        if (payload) {
            // If a curve is provided directly as payload, enqueue it for animation
            enqueueCurve(payload);
            startAnimation();
        } else {
            // If no payload, find the next curve
            if (!state.grid) {
                console.warn('Grid is not initialized');
                return;
            }
            
            // Import findNextCurve dynamically
            import('../logic/curveStartFinder.js').then(module => {
                const nextCurve = module.findNextCurve(state.grid);
                if (nextCurve) {
                    console.log('Next curve found:', nextCurve);
                    // Instead of directly adding to enqueue for animation
                    enqueueCurve(nextCurve);
                    startAnimation();
                } else {
                    console.log('No more curves available');
                    // Silently do nothing if no more curves (as requested)
                }
            }).catch(error => {
                console.error('Error loading curveStartFinder:', error);
            });
            
            // Return early since animation will trigger redraws
            return;
        }
        break;

    case 'ALL_CURVES':
        // If no payload, find the next curve
        
        // Import findNextCurve dynamically
        import('../logic/curveStartFinder.js').then(module => {
            const findAllCurves = module.findAllCurves(state.grid);

	    findAllCurves.forEach(curve => {
		enqueueCurve(curve);
	    });
	    startAnimation();
	});
	    
            return;
	
            break;
    case 'RESET':
        if (state.grid) state.grid.resetUsedDirections();
        // Explicitly set to empty array rather than just clearing
        state.curves = [];
        state.animationPath = null;
        
        // Clear all pending animations on reset
        clearAllAnimations();
        
        console.log("Reset state, cleared all curves and animations");
        break;

    case 'REDRAW':
        if (state.grid) state.grid.resetUsedDirections();
        // Explicitly set to empty array rather than just clearing
        state.curves = [];
        state.animationPath = null;
        
        // Clear all pending animations on reset
        clearAllAnimations();
        
        console.log("Reset state, cleared all curves and animations");
        break;
    case 'TOGGLE_MIRROR':
        // payload should have { gridLineId }
        const line = state.grid.getGridLine(payload.gridLineId);
        if (line) {
            // Don't toggle boundary mirrors
            if (!state.grid.isBoundaryGridLine(line)) {
                state.grid.setMirror(payload.gridLineId, !line.isMirror);
                
                // Clear all curves and animations when mirrors change
                state.curves = [];
                state.animationPath = null;
                clearAllAnimations();
                
                console.log("Mirror toggled, cleared all curves and animations");
                emit('REDRAW');
            } else {
                console.log("Boundary mirrors cannot be toggled");
            }
        }
        break;
    default:
        console.warn(`Unknown action: ${action}`);
    }
}

/**
 * Get a deep copy of current state
 */
export function getState() {
    return state;
}

/**
 * This makes getState and changeState callable by everyone
 */
window.getState     = getState;
