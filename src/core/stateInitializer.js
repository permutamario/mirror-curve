// File src/core/stateIntializer.js

// This is what initializes the state with default information
// Do not touch the state manager
// Only change the initial state here


import { emit } from './eventEmitter.js';
import { Grid } from '../logic/grid.js';


export function initalizeState(){


    //Default Settings

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

    /*
     * End default settings
     *
     *
     *
     */
