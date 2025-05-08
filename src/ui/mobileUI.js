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

export function setup() {
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
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    dispatch('REDRAW');
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}
