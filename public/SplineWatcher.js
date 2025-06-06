// SplineWatcher.js
// Standalone modular system for tracking Spline 3D scene loading
// Place this file in: /public/SplineWatcher.js

(function() {
  'use strict';

  console.log('SplineWatcher: Initializing...');

  // Configuration
  const CONFIG = {
    SCENE_LIST_URL: './SceneList.json',  // External scene configuration
    SPLINE_RUNTIME_URL: 'https://unpkg.com/@splinetool/runtime@latest/build/runtime.js',
    COMPONENT_DETECTION_TIMEOUT: 2000,  // How long to wait for components to register
    SCENE_LOAD_TIMEOUT: 8000,           // Max time per scene to load
    AUTO_DISCOVERY: true                 // Try to auto-discover scenes if SceneList.json fails
  };

  // State management
  const state = {
    isInitialized: false,
    runtimeLoaded: false,
    expectedScenes: [],
    discoveredComponents: new Map(),
    loadedScenes: new Set(),
    failedScenes: new Set(),
    completionCallback: null
  };

  // Main initialization
  async function initialize() {
    if (state.isInitialized) return;
    state.isInitialized = true;

    try {
      console.log('SplineWatcher: Loading configuration...');
      
      // 1. Load scene list configuration
      await loadSceneConfiguration();
      
      // 2. Setup component discovery system
      setupComponentDiscovery();
      
      // 3. Preload Spline Runtime
      await loadSplineRuntime();
      
      // 4. Start monitoring process
      startMonitoring();
      
    } catch (error) {
      console.error('SplineWatcher: Initialization failed:', error);
      notifyCompletion(false, error.message);
    }
  }

  // Load scene configuration from SceneList.json
  async function loadSceneConfiguration() {
    try {
      const response = await fetch(CONFIG.SCENE_LIST_URL);
      if (response.ok) {
        const config = await response.json();
        state.expectedScenes = config.scenes || [];
        console.log(`SplineWatcher: Loaded ${state.expectedScenes.length} expected scenes from configuration`);
      } else {
        throw new Error(`Failed to load ${CONFIG.SCENE_LIST_URL}: ${response.status}`);
      }
    } catch (error) {
      console.warn('SplineWatcher: Could not load scene configuration:', error.message);
      if (CONFIG.AUTO_DISCOVERY) {
        console.log('SplineWatcher: Falling back to auto-discovery mode');
        state.expectedScenes = [];
      } else {
        throw error;
      }
    }
  }

  // Setup component discovery system
  function setupComponentDiscovery() {
    // Create global interface for components to register
    window.SplineWatcher = {
      // Components call this when they mount
      registerComponent: (componentId, sceneId) => {
        console.log(`SplineWatcher: Component registered - ${componentId} (${sceneId})`);
        
        state.discoveredComponents.set(componentId, {
          id: componentId,
          sceneId: sceneId,
          status: 'registered',
          registeredAt: Date.now()
        });

        // Add to expected scenes if not already there
        if (!state.expectedScenes.includes(sceneId)) {
          state.expectedScenes.push(sceneId);
          console.log(`SplineWatcher: Auto-discovered scene: ${sceneId}`);
        }
      },

      // Components call this when they start loading
      updateComponentStatus: (componentId, status, progress = 0) => {
        const component = state.discoveredComponents.get(componentId);
        if (component) {
          component.status = status;
          component.progress = progress;
          component.lastUpdate = Date.now();
          console.log(`SplineWatcher: ${componentId} status: ${status} (${progress}%)`);
        }
      },

      // Components call this when scene is fully loaded
      markComponentReady: (componentId) => {
        const component = state.discoveredComponents.get(componentId);
        if (component) {
          component.status = 'ready';
          component.readyAt = Date.now();
          state.loadedScenes.add(component.sceneId);
          console.log(`SplineWatcher: Component ready - ${componentId}`);
          checkCompletion();
        }
      },

      // Components call this on error
      markComponentFailed: (componentId, error) => {
        const component = state.discoveredComponents.get(componentId);
        if (component) {
          component.status = 'failed';
          component.error = error;
          component.failedAt = Date.now();
          state.failedScenes.add(component.sceneId);
          console.warn(`SplineWatcher: Component failed - ${componentId}: ${error}`);
          checkCompletion();
        }
      }
    };
  }

  // Load Spline Runtime if not already loaded
  function loadSplineRuntime() {
    return new Promise((resolve, reject) => {
      if (window.SplineRuntime) {
        state.runtimeLoaded = true;
        console.log('SplineWatcher: Spline Runtime already available');
        resolve();
        return;
      }

      console.log('SplineWatcher: Loading Spline Runtime...');
      
      const script = document.createElement('script');
      script.src = CONFIG.SPLINE_RUNTIME_URL;
      script.async = true;

      script.onload = () => {
        state.runtimeLoaded = true;
        console.log('SplineWatcher: Spline Runtime loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('SplineWatcher: Failed to load Spline Runtime');
        reject(new Error('Spline Runtime load failed'));
      };

      document.head.appendChild(script);

      // Timeout fallback
      setTimeout(() => {
        if (!state.runtimeLoaded) {
          reject(new Error('Spline Runtime load timeout'));
        }
      }, 10000);
    });
  }

  // Start the monitoring process
  function startMonitoring() {
    console.log('SplineWatcher: Starting monitoring process...');

    // Wait for components to register themselves
    setTimeout(() => {
      const totalComponents = state.discoveredComponents.size;
      const totalExpectedScenes = state.expectedScenes.length;

      console.log(`SplineWatcher: Discovery phase complete`);
      console.log(`SplineWatcher: Found ${totalComponents} components, expecting ${totalExpectedScenes} scenes`);

      // If no components found and no expected scenes, complete immediately
      if (totalComponents === 0 && totalExpectedScenes === 0) {
        console.log('SplineWatcher: No Spline content detected, completing immediately');
        notifyCompletion(true, 'No Spline content detected');
        return;
      }

      // Start periodic check for completion
      const checkInterval = setInterval(() => {
        if (checkCompletion()) {
          clearInterval(checkInterval);
        }
      }, 500);

      // Set overall timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!state.completionCallback) {
          console.warn('SplineWatcher: Overall timeout reached, completing anyway');
          notifyCompletion(false, 'Timeout reached');
        }
      }, CONFIG.SCENE_LOAD_TIMEOUT * 2);

    }, CONFIG.COMPONENT_DETECTION_TIMEOUT);
  }

  // Check if all scenes are ready
  function checkCompletion() {
    if (state.completionCallback) return true; // Already completed

    const totalExpected = state.expectedScenes.length;
    const totalLoaded = state.loadedScenes.size;
    const totalFailed = state.failedScenes.size;
    const totalProcessed = totalLoaded + totalFailed;

    console.log(`SplineWatcher: Progress check - ${totalLoaded} loaded, ${totalFailed} failed, ${totalExpected} expected`);

    // Complete if all expected scenes are processed
    if (totalExpected > 0 && totalProcessed >= totalExpected) {
      const success = totalLoaded > 0; // Success if at least one scene loaded
      const message = success 
        ? `Completed: ${totalLoaded} loaded, ${totalFailed} failed`
        : `All scenes failed to load`;
      
      notifyCompletion(success, message);
      return true;
    }

    // Complete if no expected scenes but components are done
    if (totalExpected === 0 && state.discoveredComponents.size > 0) {
      const allComponentsDone = Array.from(state.discoveredComponents.values())
        .every(comp => comp.status === 'ready' || comp.status === 'failed');
      
      if (allComponentsDone) {
        notifyCompletion(true, 'All discovered components processed');
        return true;
      }
    }

    return false;
  }

  // Notify main loader about completion
  function notifyCompletion(success, message) {
    if (state.completionCallback) return; // Prevent double completion
    
    console.log(`SplineWatcher: ${success ? 'SUCCESS' : 'FAILED'} - ${message}`);

    // Prepare results summary
    const results = {
      success: success,
      message: message,
      runtime: state.runtimeLoaded,
      expectedScenes: state.expectedScenes.length,
      loadedScenes: state.loadedScenes.size,
      failedScenes: state.failedScenes.size,
      components: Array.from(state.discoveredComponents.values()),
      completedAt: Date.now()
    };

    // Store results for debugging
    try {
      localStorage.setItem('splineWatcherResults', JSON.stringify(results));
    } catch (e) {
      console.warn('SplineWatcher: Could not save results to localStorage');
    }

    // Dispatch custom event for main loader
    const event = new CustomEvent('splineWatcherComplete', {
      detail: results
    });
    window.dispatchEvent(event);

    // Also set global flag as fallback
    window.splineWatcherComplete = results;
    
    state.completionCallback = results;
  }

  // Public API for main loader
  window.SplineWatcher = window.SplineWatcher || {};
  window.SplineWatcher.initialize = initialize;
  window.SplineWatcher.getStatus = () => ({
    initialized: state.isInitialized,
    runtimeLoaded: state.runtimeLoaded,
    expectedScenes: state.expectedScenes.length,
    discoveredComponents: state.discoveredComponents.size,
    loadedScenes: state.loadedScenes.size,
    failedScenes: state.failedScenes.size
  });

  // Auto-initialize when script loads
  console.log('SplineWatcher: Script loaded, auto-initializing...');
  initialize().catch(error => {
    console.error('SplineWatcher: Auto-initialization failed:', error);
  });

})();