// src/ui/desktopUI.js
import {
  createControlGroup,
  createButton,
  createCheckbox,
  createColorPicker,
  createDropdown,
    createSlider,
    createInputBox
} from './baseControls.js';
import { dispatch, getState } from '../core/stateManager.js';

export function setup() {
    const app = document.getElementById('app');
    app.innerHTML = '';  // clear any old layout
    let settings = getState().settings;

    // Create canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container';
    app.appendChild(canvasContainer);

    // create canvas inside the container
    const canvas = document.createElement('canvas');
    canvas.id = 'sd-canvas';
    canvasContainer.appendChild(canvas);

    window.getState = getState; // Expose getState globally
    window.dispatch = dispatch; // Expose dispatch globally
    setupCanvasClickHandler(canvas); // Set up the click handler

    // Create floating tab container - now permanently visible
    const tab = document.createElement('div');
    tab.className = 'floating-tab';
    tab.innerHTML = `
    <div class="floating-tab-header">
      <h2>Controls</h2>
    </div>
    <div class="floating-tab-content"></div>
  `;
    app.appendChild(tab);

    // Build controls into the content area
    const content = tab.querySelector('.floating-tab-content');

    // --- GRID SLIDERS ---

    const rowsInput = createInputBox({
	id: 'rows-input',
	value: 5,
	min: 1,
	max: 40,
	onChange: rows => {
	    const cols = Number(document.getElementById('cols-input').value);
	    dispatch('UPDATE_GRID', { rows, cols });
	}
    });
    content.appendChild(createControlGroup('Rows', rowsInput));

    const colsInput = createInputBox({
	id: 'cols-input',
	value: 5,
	min: 1,
	max: 40,
	onChange: cols => {
	    const rows = Number(document.getElementById('rows-input').value);
	    dispatch('UPDATE_GRID', { rows, cols });
	}
    });
    content.appendChild(createControlGroup('Columns', colsInput));

    // --- SHOW MIRRORS ---
    const showMirrors = createCheckbox({
	id: 'show-mirrors',
	label: 'Show Mirrors',
	checked: settings.showMirrors,
	onChange: checked => dispatch('TOGGLE_MIRRORS', { show: checked })
    });
    content.appendChild(createControlGroup('', showMirrors));
    
    // --- SHOW GRID LINES ---
    const showGridLines = createCheckbox({
	id: 'show-grid-lines',
	label: 'Show Grid Lines',
	checked: settings.showGridLines,
	onChange: checked => dispatch('TOGGLE_GRID_LINES', { show: checked })
    });
    content.appendChild(createControlGroup('', showGridLines));
    
    // --- SHOW GRID DOTS ---
    const showGridDots = createCheckbox({
	id: 'show-grid-dots',
	label: 'Show Grid Dots',
	checked: settings.showGridDots,
	onChange: checked => dispatch('TOGGLE_GRID_DOTS', { show: checked })
    });
    content.appendChild(createControlGroup('', showGridDots));
    
    // --- SHOW CENTER DOTS ---
    const showCenterDots = createCheckbox({
	id: 'show-center-dots',
	label: 'Show Center Dots',
	checked: settings.showCenterDots,
	onChange: checked => dispatch('TOGGLE_CENTER_DOTS', { show: checked })
    });
    content.appendChild(createControlGroup('', showCenterDots));

    // --- ANIMATION SPEED SLIDER ---
    const animationSpeedSlider = createSlider({
        id: 'animation-speed-slider',
        min: 100, max: 8000, step: 200, value: settings.animationSpeed,
        onChange: speed => {
            dispatch('SET_ANIMATION_SPEED', { speed });
        }
    });
    content.appendChild(createControlGroup('Animation Speed', animationSpeedSlider));

    // --- ANIMATION STYLE DROPDOWN ---
    const animationStyleDropdown = createDropdown({
        id: 'animation-style-dropdown',
        options: [
            { value: 'jagged', label: 'Jagged' },
            { value: 'curved', label: 'Curved' }
        ],
        defaultValue:  settings.animationStyle,
        onChange: style => {
            dispatch('SET_ANIMATION_STYLE', { style });
        }
    });
    content.appendChild(createControlGroup('Animation Style', animationStyleDropdown));

    // --- CONTROL BUTTONS ---

    
    // Random Mirrors button
    const randomMirrorsBtn = createButton({
	id: 'random-mirrors-btn',
	text: 'Randomize',
	onClick: () => {
	    // dispatch the "Random" action to randomize interior mirrors
	    dispatch('RANDOM');
	}
    });
    content.appendChild(randomMirrorsBtn);
    
    const resetButton = createButton({
	id: 'btn-reset',
	text: 'Reset',
	onClick: () => dispatch('RESET')
    });
    content.appendChild(resetButton);
    
    const nextCurveButton = createButton({
	id: 'btn-next',
	text: 'Next Curve',
	onClick: () => dispatch('NEXT_CURVE')
    });
    content.appendChild(nextCurveButton);

    const allCurveButton = createButton({
	id: 'btn-next',
	text: 'All Curves',
	onClick: () => dispatch('ALL_CURVES')
    });
    content.appendChild(allCurveButton);

    
    // --- CLICK HANDLER ---
    function setupCanvasClickHandler(canvas) {
	// Add click event listener to the canvas
	canvas.addEventListener('click', handleCanvasClick);
    }

    function handleCanvasClick(event) {
	// Get canvas and its dimensions
	const canvas = event.target;
	const rect = canvas.getBoundingClientRect();
	
	// Calculate click position relative to canvas
	const x = event.clientX - rect.left;
	const y = event.clientY - rect.top;
	
	// Convert to grid coordinates (need to match calculations from drawScreen)
	const width = canvas.width;
	const height = canvas.height;
	
	// Get current grid state
	const state = window.getState(); // Assuming getState is accessible
	if (!state || !state.grid) return;
	
	const grid = state.grid;
	
	// Calculate the same grid layout parameters as in drawScreen
	const minDimension = Math.min(width, height);
	const padding = minDimension * 0.05;
	const drawableWidth = width - (padding * 2);
	const drawableHeight = height - (padding * 2);
	
	const cellSize = Math.min(drawableWidth / grid.cols, drawableHeight / grid.rows);
	const cellW = cellSize;
	const cellH = cellSize;
	
	const offsetX = padding + (drawableWidth - (cellSize * grid.cols)) / 2;
	const offsetY = padding + (drawableHeight - (cellSize * grid.rows)) / 2;
	
	// Adjust coordinates to account for the grid offset
	const gridX = x - offsetX;
	const gridY = y - offsetY;
	
	// Find the closest grid line
	// For each point, check distance to horizontal and vertical lines
	
	// Convert to grid cell coordinates
	const cellCol = Math.floor(gridX / cellW);
	const cellRow = Math.floor(gridY / cellH);
	
	// Position within the cell (0-1)
	const cellXPos = (gridX % cellW) / cellW;
	const cellYPos = (gridY % cellH) / cellH;
	
	// Proximity threshold (how close to the line)
	const threshold = 0.15;
	
	let gridLineId = null;
	
	// Check if we're close to a horizontal line
	if (cellYPos < threshold) {
            // Close to the top horizontal line
            gridLineId = grid.generateGridLineId('h', cellRow, cellCol);
	} else if (cellYPos > (1 - threshold)) {
            // Close to the bottom horizontal line
            gridLineId = grid.generateGridLineId('h', cellRow + 1, cellCol);
	}
	// Check if we're close to a vertical line
	else if (cellXPos < threshold) {
            // Close to the left vertical line
            gridLineId = grid.generateGridLineId('v', cellRow, cellCol);
	} else if (cellXPos > (1 - threshold)) {
            // Close to the right vertical line
            gridLineId = grid.generateGridLineId('v', cellRow, cellCol + 1);
	}
	
	// If we found a grid line, toggle its mirror state
	if (gridLineId && grid.getGridLine(gridLineId)) {
            window.dispatch('TOGGLE_MIRROR', { gridLineId });
	}
    }

    // --- CANVAS RESIZE & DRAW ---
    function resizeCanvas() {
	// Set canvas to the size of its container
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	dispatch('REDRAW');
    }
    
    // Listen for window resize - but don't add another event handler here
    // since init.js will handle it
    
    // Execute resize immediately
    resizeCanvas();
}
