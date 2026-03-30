import { useReducer, useEffect, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  AppContext,
  appReducer,
  initialAppState,
  type Place,
} from './state/appState';
import {
  SessionContext,
  sessionReducer,
  initialSessionState,
} from './state/sessionState';
import {
  GenesisContext,
  genesisReducer,
  initialGenesisState,
} from './state/genesisState';
import { NavigationBar } from './ui/NavigationBar';
import { SyncIndicator } from './ui/SyncIndicator';
import { SetupFlow } from './ui/SetupFlow';
import { Circle } from './places/Circle';
import { Evoke } from './places/Evoke';
import { Chronicles } from './places/Chronicles';
import { Seals } from './places/Seals';
import { PlaceTransition } from './ritual/transitions/PlaceTransition';
import { DebugPanel } from './ui/DebugPanel';
import { backgroundNoise } from './audio/BackgroundNoise';
import { ambientEvents } from './audio/Ambient';

function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [session, sessionDispatch] = useReducer(sessionReducer, initialSessionState);
  const [genesis, genesisDispatch] = useReducer(genesisReducer, initialGenesisState);
  const [ready, setReady] = useState(false);

  // Check initial state on mount
  useEffect(() => {
    (async () => {
      try {
        const hasKey = await invoke<boolean>('has_api_key');
        dispatch({ type: 'SET_HAS_API_KEY', value: hasKey });
      } catch {
        // Not authenticated yet — expected
      }
      try {
        const hasGrimoire = await invoke<boolean>('grimoire_exists');
        dispatch({ type: 'SET_HAS_GRIMOIRE', value: hasGrimoire });
      } catch {
        // Expected before auth
      }
    })();
  }, []);

  const handleSetupComplete = useCallback(async () => {
    dispatch({ type: 'SET_AUTH', status: 'authenticated' });
    dispatch({ type: 'SET_HAS_API_KEY', value: true });
    dispatch({ type: 'SET_HAS_GRIMOIRE', value: true });

    // Start full soundscape
    backgroundNoise.start();
    ambientEvents.start();

    // Load demon list
    try {
      const demons = await invoke<Array<{ name: string; rank: string }>>('list_demons');
      dispatch({ type: 'SET_DEMONS', demons });
    } catch (e) {
      console.error('Failed to load demons:', e);
    }

    setReady(true);
  }, []);

  const handleNavigate = useCallback((place: Place) => {
    dispatch({ type: 'NAVIGATE', place });
  }, []);

  // Setup flow (not authenticated)
  if (!ready) {
    return (
      <AppContext.Provider value={{ state, dispatch }}>
        <SessionContext.Provider value={{ state: session, dispatch: sessionDispatch }}>
          <GenesisContext.Provider value={{ state: genesis, dispatch: genesisDispatch }}>
            <div style={rootStyle}>
              <SetupFlow
                hasApiKey={state.hasApiKey}
                hasGrimoire={state.hasGrimoire}
                onComplete={handleSetupComplete}
              />
            </div>
          </GenesisContext.Provider>
        </SessionContext.Provider>
      </AppContext.Provider>
    );
  }

  // Main app
  const PlaceComponent = {
    circle: Circle,
    evoke: Evoke,
    chronicles: Chronicles,
    seals: Seals,
  }[state.currentPlace];

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <SessionContext.Provider value={{ state: session, dispatch: sessionDispatch }}>
        <GenesisContext.Provider value={{ state: genesis, dispatch: genesisDispatch }}>
          <div style={rootStyle}>
            <SyncIndicator status={state.syncStatus} />
            <DebugPanel />
            <div style={{
              flex: 1,
              overflow: 'hidden',
              paddingBottom: '52px', // space for nav bar
              position: 'relative',
            }}>
              <PlaceTransition placeKey={state.currentPlace}>
                <PlaceComponent />
              </PlaceTransition>
            </div>
            <NavigationBar
              currentPlace={state.currentPlace}
              onNavigate={handleNavigate}
              sessionActive={state.sessionActive}
            />
          </div>
        </GenesisContext.Provider>
      </SessionContext.Provider>
    </AppContext.Provider>
  );
}

const rootStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  backgroundColor: '#000',
  display: 'flex',
  flexDirection: 'column',
  color: '#999',
  fontFamily: '"SF Mono", "Fira Code", monospace',
  overflow: 'hidden',
};

export default App;
