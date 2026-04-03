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
import { TempleGate } from './ui/TempleGate';
import { Circle } from './places/Circle';
import { Evoke } from './places/Evoke';
import { Chronicles } from './places/Chronicles';
import { Seals } from './places/Seals';
import { PlaceTransition } from './ritual/transitions/PlaceTransition';
import { DebugPanel } from './ui/DebugPanel';
import { AuthRecovery } from './ui/AuthRecovery';
import { backgroundNoise } from './audio/BackgroundNoise';
import { ambientEvents } from './audio/Ambient';

interface TempleInfo {
  id: string;
  name: string;
  created_at: string;
  demon_count: number;
}

type AppPhase = 'setup' | 'temple-gate' | 'grimoire-deploy' | 'ready';

function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [session, sessionDispatch] = useReducer(sessionReducer, initialSessionState);
  const [genesis, genesisDispatch] = useReducer(genesisReducer, initialGenesisState);
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [temples, setTemples] = useState<TempleInfo[]>([]);

  // Check initial state on mount
  useEffect(() => {
    (async () => {
      try {
        const hasKey = await invoke<boolean>('has_api_key');
        dispatch({ type: 'SET_HAS_API_KEY', value: hasKey });
      } catch {
        // Not authenticated yet — expected
      }
    })();
  }, []);

  // After auth + API key setup, initialize temples and go to temple gate
  const handleSetupComplete = useCallback(async () => {
    dispatch({ type: 'SET_AUTH', status: 'authenticated' });
    dispatch({ type: 'SET_HAS_API_KEY', value: true });

    try {
      const templeList = await invoke<TempleInfo[]>('init_temples');
      setTemples(templeList);
      setPhase('temple-gate');
    } catch (e) {
      console.error('Failed to init temples:', e);
      setPhase('temple-gate');
    }
  }, []);

  // Temple selected — check if grimoire exists, proceed accordingly
  const handleTempleSelected = useCallback(async (_templeId: string, hasGrimoire: boolean) => {
    if (!hasGrimoire) {
      setPhase('grimoire-deploy');
    } else {
      await enterGrimoire();
    }
  }, []);

  // Temple destroyed — remove from list
  const handleTempleDestroyed = useCallback((templeId: string) => {
    setTemples(prev => prev.filter(t => t.id !== templeId));
  }, []);

  // New temple created — add to list and auto-select
  const handleTempleCreated = useCallback(async (temple: TempleInfo) => {
    setTemples(prev => [...prev, temple]);
    // Auto-select the new temple
    await invoke('select_temple', { templeId: temple.id });
    // New temple needs grimoire
    setPhase('grimoire-deploy');
  }, []);

  // Grimoire deployed — enter the grimoire
  const handleGrimoireDeployed = useCallback(async () => {
    dispatch({ type: 'SET_HAS_GRIMOIRE', value: true });
    await enterGrimoire();
  }, []);

  // Common entry point into the main app
  const enterGrimoire = useCallback(async () => {
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

    setPhase('ready');
  }, []);

  const handleNavigate = useCallback((place: Place) => {
    dispatch({ type: 'NAVIGATE', place });
  }, []);

  // Providers wrapper
  const providers = (children: React.ReactNode) => (
    <AppContext.Provider value={{ state, dispatch }}>
      <SessionContext.Provider value={{ state: session, dispatch: sessionDispatch }}>
        <GenesisContext.Provider value={{ state: genesis, dispatch: genesisDispatch }}>
          <div style={rootStyle}>
            {children}
          </div>
        </GenesisContext.Provider>
      </SessionContext.Provider>
    </AppContext.Provider>
  );

  // Setup flow (auth + API key)
  if (phase === 'setup') {
    return providers(
      <SetupFlow
        hasApiKey={state.hasApiKey}
        onComplete={handleSetupComplete}
      />
    );
  }

  // Temple gate
  if (phase === 'temple-gate') {
    return providers(
      <TempleGate
        temples={temples}
        onSelect={handleTempleSelected}
        onCreated={handleTempleCreated}
        onDestroyed={handleTempleDestroyed}
      />
    );
  }

  // Grimoire deploy for new temple
  if (phase === 'grimoire-deploy') {
    return providers(
      <SetupFlow
        hasApiKey={true}
        grimoireOnly
        onComplete={handleGrimoireDeployed}
      />
    );
  }

  // Main app
  const PlaceComponent = {
    circle: Circle,
    evoke: Evoke,
    chronicles: Chronicles,
    seals: Seals,
  }[state.currentPlace];

  return providers(
    <>
      <SyncIndicator status={state.syncStatus} />
      <DebugPanel />
      <AuthRecovery />
      <div style={{
        flex: 1,
        overflow: 'hidden',
        paddingBottom: '52px',
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
    </>
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
