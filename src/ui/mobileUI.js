// mobileUI.js
// Mobile setup function, mirroring desktopUI structure

import {
  createButton,
  createInputBox,
  createCheckbox,
  createSlider,
  createDropdown,
  createControlGroup
} from './baseControls.js';
import { dispatch, getState } from '../core/stateManager.js';

// Debounce function to limit how often a function can fire
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

function setupMobileTouchHandlers(canvas) {
  // Add touch events for mobile
  canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
  
  // Prevent scrolling when touching the canvas
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  // Handle double-tap specially - prevent zoom
  let lastTap = 0;
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
      // Double tap detected
      e.preventDefault();
    }
    lastTap = currentTime;
  }, { passive: false });
}

function handleCanvasTouch(event) {
  // Prevent default to avoid scrolling/zooming
  event.preventDefault();
  
  // Use the first touch point
  if (event.touches.length !== 1) return;
  
  const touch = event.touches[0];
  
  // Get canvas and its dimensions
  const canvas = event.target;
  const rect = canvas.getBoundingClientRect();
  
  // Calculate touch position relative to canvas
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  
  // Convert to grid coordinates
  const width = canvas.width;
  const height = canvas.height;
  
  // Get current grid state
  const state = getState(); // Assuming getState is accessible
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
  
  // Convert to grid cell coordinates
  const cellCol = Math.floor(gridX / cellW);
  const cellRow = Math.floor(gridY / cellH);
  
  // Position within the cell (0-1)
  const cellXPos = (gridX % cellW) / cellW;
  const cellYPos = (gridY % cellH) / cellH;
  
  // Increase threshold for touch (fingers are less precise than mouse)
  const threshold = 0.2; // 20% of cell size
  
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
    // Add visual feedback for the touch
    addTouchFeedback(canvas, x, y);
    
    // Dispatch the toggle mirror action
    dispatch('TOGGLE_MIRROR', { gridLineId });
  }
}

// Add visual feedback when touching the canvas
function addTouchFeedback(canvas, x, y) {
  // Create a visual feedback element
  const feedback = document.createElement('div');
  feedback.classList.add('touch-feedback');
  feedback.style.position = 'absolute';
  feedback.style.left = `${x - 15}px`;
  feedback.style.top = `${y - 15}px`;
  feedback.style.width = '30px';
  feedback.style.height = '30px';
  feedback.style.borderRadius = '50%';
  feedback.style.backgroundColor = 'rgba(33, 133, 208, 0.5)';
  feedback.style.pointerEvents = 'none';
  feedback.style.zIndex = '10';
  feedback.style.transform = 'scale(0)';
  feedback.style.transition = 'transform 0.3s, opacity 0.3s';
  
  // Add to the canvas container
  canvas.parentElement.appendChild(feedback);
  
  // Trigger the animation
  setTimeout(() => {
    feedback.style.transform = 'scale(1)';
  }, 10);
  
  // Remove after animation
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => {
      feedback.remove();
    }, 300);
  }, 300);
}

export function setup() {
  // Add viewport meta tag if not already present
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);
  }

  // Retrieve application state
  const state = getState();
  const settings = state.settings;

  // Clear existing layout
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Create canvas container and canvas element
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  app.appendChild(canvasContainer);

  const canvas = document.createElement('canvas');
  canvas.id = 'sd-canvas';
  canvasContainer.appendChild(canvas);

  // Setup touch handling for the canvas
  setupMobileTouchHandlers(canvas);

  // --- Mobile Controls Grid ---
  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  const actions = [
    { id: 'next-line-btn', text: 'Next Line', event: 'NEXT_CURVE' },
    { id: 'all-lines-btn', text: 'All Lines', event: 'ALL_CURVES' },
    { id: 'randomize-btn', text: 'Randomize', event: 'RANDOM' },
    { id: 'reset-btn', text: 'Reset', event: 'RESET' }
  ];
  actions.forEach(({ id, text, event }) => {
    const btn = createButton({
      id,
      text,
      onClick: () => dispatch(event)
    });
    controls.appendChild(btn);
  });
  app.insertBefore(controls, canvasContainer);

  // --- Options Button ---
  const optionsBtn = createButton({
    id: 'options-button',
    text: 'Options',
    onClick: toggleModal
  });
  document.body.appendChild(optionsBtn);

  // --- Modal Overlay & Content ---
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', toggleModal);

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.addEventListener('click', e => e.stopPropagation());

  // Build your floating-tab-content container
  const content = document.createElement('div');
  content.className = 'floating-tab-content';

  // --- GRID INPUTS ---
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
    min: 100,
    max: 8000,
    step: 200,
    value: settings.animationSpeed,
    onChange: speed => dispatch('SET_ANIMATION_SPEED', { speed })
  });
  content.appendChild(createControlGroup('Animation Speed', animationSpeedSlider));

  // --- ANIMATION STYLE DROPDOWN ---
  const animationStyleDropdown = createDropdown({
    id: 'animation-style-dropdown',
    options: [
      { value: 'jagged', label: 'Jagged' },
      { value: 'curved', label: 'Curved' }
    ],
    defaultValue: settings.animationStyle,
    onChange: style => dispatch('SET_ANIMATION_STYLE', { style })
  });
  content.appendChild(createControlGroup('Animation Style', animationStyleDropdown));

  // Assemble modal
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // --- Event Handlers ---
  function toggleModal() {
    const active = overlay.classList.toggle('active');
    if (active) {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      modal.style.animationName = landscape ? 'slide-left' : 'slide-up';
    }
  }

  // --- Canvas Resize & Redraw ---
  const debouncedResize = debounce(function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    dispatch('REDRAW');
  }, 250);
  
  window.addEventListener('resize', debouncedResize);
  debouncedResize(); // Initial resize

  // Fix for handling orientation changes
  window.addEventListener('orientationchange', () => {
    // Add slight delay to ensure new dimensions are calculated correctly
    setTimeout(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      dispatch('REDRAW');
    }, 500);
  });

  // Fix for iOS viewport height issues
  function fixViewportHeight() {
    // First, set CSS variable to actual viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      // Add class for iOS-specific styling
      document.documentElement.classList.add('ios-device');
      
      // Check for notch
      if (window.screen && window.screen.height >= 812) {
        document.documentElement.classList.add('has-notch');
      }
    }
  }

  // Run on page load
  fixViewportHeight();
  
  // Run on resize
  window.addEventListener('resize', fixViewportHeight);
  
  // Fix for the "stuck" hover state on mobile
  document.addEventListener('touchend', () => {
    // Remove any hover states that might be stuck
    const hoveredElements = document.querySelectorAll(':hover');
    Array.from(hoveredElements).forEach(el => {
      el.classList.remove('hover');
      // Trigger a repaint to clear hover states
      el.style.cssText = el.style.cssText;
    });
  });
}
