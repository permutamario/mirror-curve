// init.js
import { initialize as initState } from './src/core/stateManager.js';
import { setup as setupDesktop }    from './src/ui/desktopUI.js';
import { setup as setupMobile }     from './src/ui/mobileUI.js';
import { initScreenDrawer }         from './src/core/screenDrawer.js';
import { dispatch }                 from './src/core/stateManager.js';

// Keep track of whether we've initialized before
let hasInitialized = false;

/**
 * Bootstraps the Mirror-Curve application:
 * 1) Builds the UI (desktop or mobile) so <canvas> exists
 * 2) Wires up screenDrawer to listen for INITIALIZE/REDRAW
 * 3) Initializes core state (emits INITIALIZE → first paint)
 */
function initializeApp() {
    console.log("Initializing..");
    const app = document.getElementById('app');
    if (!app) {
        console.error('No #app element found in DOM');
        return;
    }

    // For first initialization only
    if (!hasInitialized) {
        //Initialize State Manager and initial State
        console.log("Setting up the state manager");
        initState();

        // Clear previous UI and rebuild controls + canvas
        app.innerHTML = '';
        
        if (window.innerWidth < 768) {
            setupMobile();
        } else {
            console.log("Detected Desktop Version");
            setupDesktop();
        }

        // Initialize the drawer
        console.log("Drawing Initial Screen");
        initScreenDrawer();
        
        // Mark as initialized
        hasInitialized = true;
    } else {
        // On subsequent resizes, just trigger a redraw
        // Get the canvas and resize it
        const canvas = document.getElementById('sd-canvas');
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            dispatch('REDRAW');
        }
    }
}

// Handle window resize without reinitializing everything
function handleResize() {
    // Only handle the resize if we've already initialized
    if (hasInitialized) {
        const canvas = document.getElementById('sd-canvas');
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            dispatch('REDRAW');
        }
    }
}

// Initialize on page load and handle resize
window.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('resize', handleResize);
