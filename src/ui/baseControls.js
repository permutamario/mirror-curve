// src/ui/baseControls.js
// Shared factory functions for UI components

/**
 * Create a labeled container for a form control
 * @param {string} labelText
 * @param {HTMLElement} control
 * @returns {HTMLDivElement}
 */
export function createControlGroup(labelText, control) {
  const group = document.createElement('div');
  group.className = 'control-group';

  if (labelText) {
    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = labelText;
    group.appendChild(label);
  }

  control.classList.add('control-input');
  group.appendChild(control);
  return group;
}

/**
 * Create a button element
 */
export function createButton({ id, text, onClick }) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = text;
  btn.className = 'control-button';
  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * Create a textbox (text input)
 * 
 */
export function createTextbox({ id, placeholder = '', value = '', onChange }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.placeholder = placeholder;
  input.value = value;
  input.className = 'control-textbox';
  input.addEventListener('input', e => onChange(e.target.value));
  return input;
}

/**
 * Create an integer input box (type="number", step=1)
 * @param {Object} options
 * @param {string} options.id          – element id
 * @param {number} [options.value=0]   – initial value
 * @param {number|null} [options.min]  – minimum allowed (omit for none)
 * @param {number|null} [options.max]  – maximum allowed (omit for none)
 * @param {(newVal: number) => void} options.onChange
 * @returns {HTMLInputElement}
 */
export function createInputBox({ id, value = 0, min = null, max = null, onChange }) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = id;
  input.value = String(value);
  input.step = '1';
  if (min !== null) input.min = String(min);
  if (max !== null) input.max = String(max);
  input.classList.add('control-input');
  input.addEventListener('input', e => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v)) onChange(v);
  });
  return input;
}
/**
 * Create a checkbox input
 */
export function createCheckbox({ id, label, checked = false, onChange }) {
  const container = document.createElement('div');
  container.className = 'control-checkbox';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  input.addEventListener('change', e => onChange(e.target.checked));

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = label;

  container.appendChild(input);
  container.appendChild(lbl);
  return container;
}

/**
 * Create a color picker input
 */
export function createColorPicker({ id, label, value = '#ffffff', onChange }) {
  const container = document.createElement('div');
  container.className = 'control-colorpicker';

  const lbl = document.createElement('label');
  lbl.htmlFor = id;
  lbl.textContent = label;

  const input = document.createElement('input');
  input.type = 'color';
  input.id = id;
  input.value = value;
  input.addEventListener('input', e => onChange(e.target.value));

  container.appendChild(lbl);
  container.appendChild(input);
  return container;
}

/**
 * Create a dropdown (select)
 */
export function createDropdown({ id, options, defaultValue, onChange }) {
  const select = document.createElement('select');
  select.id = id;
  select.className = 'control-select';
  
  options.forEach(opt => {
    const o = document.createElement('option');
    
    // Check if options are in object format (with value and label)
    if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
      o.value = opt.value;
      o.textContent = opt.label;
    } else {
      // Handle simpler format where options are just values
      o.value = opt;
      o.textContent = opt;
    }
    
    // Set selected if it matches the defaultValue
    if (o.value === defaultValue) {
      o.selected = true;
    }
    
    select.appendChild(o);
  });
  
  select.addEventListener('change', e => onChange(e.target.value));
  return select;
}

/**
 * Create a slider input
 */
export function createSlider({ id, min, max, step, value, onChange }) {
  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.className = 'control-slider';
  input.addEventListener('input', e => onChange(Number(e.target.value)));
  return input;
}
