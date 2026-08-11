import { useState, useRef, useEffect } from 'react'
import { ViewerCanvas, ViewerCanvasHandle } from './components/ViewerCanvas'
import { MapLoader } from './components/MapLoader'
import { FileUp, Info, ChevronDown, Layers, Box, Keyboard, X, Settings, Save } from 'lucide-react'

function App() {
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [status, setStatus] = useState("Waiting for map...");
  const [loadProgress, setLoadProgress] = useState({ percent: 0, message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [pvsEnabled, setPvsEnabled] = useState(false);
  const [showPointEntities, setShowPointEntities] = useState(true);
  const [showBrushEntities, setShowBrushEntities] = useState(true);
  const [showBrushWireframes, setShowBrushWireframes] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [aaaTriggerOpacity, setAaaTriggerOpacity] = useState(50);
  const [entityConnectionsMode, setEntityConnectionsMode] = useState<'none' | 'selected' | 'all'>('none');
  const [textureFiltering, setTextureFiltering] = useState(true);
  const [lightmapFiltering, setLightmapFiltering] = useState(true);
  const [showMapLoader, setShowMapLoader] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const viewerRef = useRef<ViewerCanvasHandle>(null);

  // Temporary local state for settings dropdown
  const [localSettings, setLocalSettings] = useState({
    pvsEnabled,
    showPointEntities,
    showBrushEntities,
    showBrushWireframes,
    showAxes,
    aaaTriggerOpacity,
    entityConnectionsMode,
    textureFiltering,
    lightmapFiltering
  });

  useEffect(() => {
    setLocalSettings({
      pvsEnabled,
      showPointEntities,
      showBrushEntities,
      showBrushWireframes,
      showAxes,
      aaaTriggerOpacity,
      entityConnectionsMode,
      textureFiltering,
      lightmapFiltering
    });
  }, [pvsEnabled, showPointEntities, showBrushEntities, showBrushWireframes, showAxes, aaaTriggerOpacity, entityConnectionsMode, textureFiltering, lightmapFiltering]);

  const handleLoadMap = async (bsp: File, wads: File[], fgds: File[]) => {
    if (viewerRef.current) {
      setStatus("Loading...");
      setIsLoading(true);
      setLoadProgress({ percent: 0, message: "Starting..." });
      try {
        await viewerRef.current.loadMap(bsp, wads, fgds);
        setStatus("Map Loaded");
        setShowMapLoader(false);
        setIsLoading(false);
      } catch (err: unknown) {
        console.error(err);
        setStatus("Load Error");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-zinc-950 overflow-hidden text-zinc-300 font-mono">
      {/* Header / Top Bar */}
      <header className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-zinc-950 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/10 rounded">
              <Box className="w-4 h-4 text-blue-500" />
            </div>
            <h1 className="text-xs font-black tracking-tighter text-zinc-100 uppercase italic">
              GoldSrc <span className="text-blue-500 not-italic">BSP</span> Viewer
            </h1>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="relative">
            <button
              onClick={() => setShowMapLoader(!showMapLoader)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider ${
                showMapLoader ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              Load Map
              <ChevronDown className={`w-3 h-3 transition-transform ${showMapLoader ? 'rotate-180' : ''}`} />
            </button>

            {showMapLoader && (
              <div className="absolute top-full left-0 mt-2 z-40">
                <MapLoader onLoad={handleLoadMap} status={status} />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                if (showMapLoader) setShowMapLoader(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider ${
                showSettings ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
              <ChevronDown className={`w-3 h-3 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
            </button>

            {showSettings && (
              <div className="absolute top-full right-0 mt-2 z-40 w-64 bg-zinc-950 border border-white/10 rounded shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3 border-b border-white/5 bg-white/5">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Global Settings</h3>
                </div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Enable PVS</span>
                    <input
                      type="checkbox"
                      checked={localSettings.pvsEnabled}
                      onChange={(e) => setLocalSettings({ ...localSettings, pvsEnabled: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Texture Filtering</span>
                    <input
                      type="checkbox"
                      checked={localSettings.textureFiltering}
                      onChange={(e) => setLocalSettings({ ...localSettings, textureFiltering: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Lightmap Filtering</span>
                    <input
                      type="checkbox"
                      checked={localSettings.lightmapFiltering}
                      onChange={(e) => setLocalSettings({ ...localSettings, lightmapFiltering: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Show Brush Entities</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showBrushEntities}
                      onChange={(e) => setLocalSettings({ ...localSettings, showBrushEntities: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer pl-4 border-l border-white/5">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Brush Wireframes</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showBrushWireframes}
                      onChange={(e) => setLocalSettings({ ...localSettings, showBrushWireframes: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Show Point Entities</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showPointEntities}
                      onChange={(e) => setLocalSettings({ ...localSettings, showPointEntities: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                  <label className="flex items-center justify-between group cursor-pointer">
                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase tracking-tight">Show Map Axes</span>
                    <input
                      type="checkbox"
                      checked={localSettings.showAxes}
                      onChange={(e) => setLocalSettings({ ...localSettings, showAxes: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">AAATrigger Opacity</span>
                      <span className="text-[10px] font-black text-blue-500">{localSettings.aaaTriggerOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={localSettings.aaaTriggerOpacity}
                      onChange={(e) => setLocalSettings({ ...localSettings, aaaTriggerOpacity: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Entity Connections</span>
                    <select
                      value={localSettings.entityConnectionsMode}
                      onChange={(e) => setLocalSettings({ ...localSettings, entityConnectionsMode: e.target.value as any })}
                      className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-[10px] font-bold text-zinc-200 outline-none focus:border-blue-600 transition-colors"
                    >
                      <option value="none">NONE</option>
                      <option value="selected">SELECTED ONLY</option>
                      <option value="all">SHOW ALL</option>
                    </select>
                  </div>
                </div>
                <div className="p-2 bg-white/5 border-t border-white/5">
                  <button
                    onClick={() => {
                      setPvsEnabled(localSettings.pvsEnabled);
                      setTextureFiltering(localSettings.textureFiltering);
                      setLightmapFiltering(localSettings.lightmapFiltering);
                      setShowBrushEntities(localSettings.showBrushEntities);
                      setShowPointEntities(localSettings.showPointEntities);
                      setShowBrushWireframes(localSettings.showBrushWireframes);
                      setShowAxes(localSettings.showAxes);
                      setAaaTriggerOpacity(localSettings.aaaTriggerOpacity);
                      setEntityConnectionsMode(localSettings.entityConnectionsMode);
                      setShowSettings(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => viewerRef.current?.resetView()}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            Reset View
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 relative bg-black">
        <ViewerCanvas
          ref={viewerRef}
          onEntitySelect={setSelectedEntity}
          onLockChange={setIsLocked}
          pvsEnabled={pvsEnabled}
          showPointEntities={showPointEntities}
          showBrushEntities={showBrushEntities}
          showBrushWireframes={showBrushWireframes}
          showAxes={showAxes}
          aaaTriggerOpacity={aaaTriggerOpacity}
          entityConnectionsMode={entityConnectionsMode}
          textureFiltering={textureFiltering}
          lightmapFiltering={lightmapFiltering}
          selectedEntity={selectedEntity}
          onProgress={(percent, message) => setLoadProgress({ percent, message })}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-500">
            <div className="w-80 space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-2 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <Box className="w-6 h-6 text-blue-500 animate-bounce" />
                  </div>
                  <h2 className="text-xl font-black italic tracking-tighter text-white">INITIALIZING ENGINE</h2>
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{loadProgress.message}</p>
              </div>

              <div className="space-y-3">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                    style={{ width: `${loadProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">System Ready: {loadProgress.percent}%</span>
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${i < (loadProgress.percent / 25) ? 'bg-blue-500' : 'bg-zinc-800'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Crosshair Overlay */}
        {isLocked && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Vertical bars */}
              <div className="absolute w-[2px] h-[10px] bg-[#ffa500] -translate-y-4" />
              <div className="absolute w-[2px] h-[10px] bg-[#ffa500] translate-y-4" />
              {/* Horizontal bars */}
              <div className="absolute w-[10px] h-[2px] bg-[#ffa500] -translate-x-4" />
              <div className="absolute w-[10px] h-[2px] bg-[#ffa500] translate-x-4" />
            </div>
          </div>
        )}

        {/* Entity Inspector Overlay */}
        {selectedEntity && (
          <aside className="absolute top-4 right-4 w-80 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-20 flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-500/10 rounded">
                  <Info className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-[11px] font-black text-white uppercase truncate tracking-tight">
                  {selectedEntity.classname}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-3 h-3 text-zinc-500" />
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">Key-Value Pairs</p>
              </div>
              <div className="space-y-3 font-mono text-[10px]">
                {Object.entries(selectedEntity).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 group">
                    <span className="text-zinc-500 text-[9px] font-bold group-hover:text-blue-400 transition-colors uppercase">{key}</span>
                    <span className="text-zinc-200 break-all bg-white/5 p-2 rounded border border-white/5 group-hover:border-white/10 transition-colors">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Status Bar - Floating inside main */}
        <footer className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3 bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-xl pointer-events-auto">
            <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
              {/*<div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />*/}
              <a href="https://github.com/urgorri" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-white tracking-widest uppercase hover:text-blue-400 transition-colors">
                CREDITS
              </a>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
              <div className="flex gap-2 items-center">
                <span className="text-zinc-600">STATUS:</span>
                <span className={status === "Load Error" ? "text-red-400" : "text-blue-400"}>{status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/10 shadow-xl pointer-events-auto text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
            <Keyboard className="w-3.5 h-3.5 text-zinc-500 mr-1" />
            <div className="flex gap-4">
              <div className="flex gap-1.5"><span className="text-white bg-white/10 px-1 rounded">WASD</span> Move</div>
              <div className="flex gap-1.5"><span className="text-white bg-white/10 px-1 rounded">SHIFT</span> 2X SPEED</div>
              <div className="flex gap-1.5"><span className="text-white bg-white/10 px-1 rounded">SPACE/CTRL</span> Vert</div>
              <div className="flex gap-1.5"><span className="text-white bg-white/10 px-1 rounded">CLICK</span> Select/Lock</div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
