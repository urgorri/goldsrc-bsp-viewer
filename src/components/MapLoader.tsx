import React, { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

export interface MapLoaderProps {
    onLoad: (bsp: File, wads: File[], fgds: File[]) => void;
    status: string;
}

export const MapLoader: React.FC<MapLoaderProps> = ({ onLoad, status }) => {
    const [bspFile, setBspFile] = useState<File | null>(null);
    const [wadFiles, setWadFiles] = useState<File[]>([]);
    const [fgdFiles, setFgdFiles] = useState<File[]>([]);

    const handleLoad = () => {
        if (bspFile) {
            onLoad(bspFile, wadFiles, fgdFiles);
        }
    };

    return (
        <div className="w-80 bg-zinc-950 border border-white/10 rounded shadow-2xl overflow-hidden flex flex-col font-mono">
            <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Load Map Resources</span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-blue-500 rounded-full" />
                        BSP File (Geometry)
                    </label>
                    <div className="relative group">
                        <input
                            type="file"
                            accept=".bsp"
                            onChange={(e) => setBspFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`py-2 px-3 border border-dashed rounded transition-colors flex items-center justify-between ${
                            bspFile ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 group-hover:border-white/20'
                        }`}>
                            <span className={`text-[10px] truncate pr-4 ${bspFile ? 'text-blue-300' : 'text-zinc-500'}`}>
                                {bspFile ? bspFile.name : 'Select .bsp file...'}
                            </span>
                            {bspFile ? <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" /> : <Upload className="w-3 h-3 text-zinc-600 shrink-0" />}
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                        WAD Files (Textures)
                    </label>
                    <div className="relative group">
                        <input
                            type="file"
                            multiple
                            accept=".wad"
                            onChange={(e) => setWadFiles(Array.from(e.target.files || []))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`py-2 px-3 border border-dashed rounded transition-colors flex items-center justify-between ${
                            wadFiles.length > 0 ? 'border-zinc-500/50 bg-white/5' : 'border-white/10 group-hover:border-white/20'
                        }`}>
                            <span className={`text-[10px] truncate pr-4 ${wadFiles.length > 0 ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {wadFiles.length > 0 ? `${wadFiles.length} files selected` : 'Select .wad files...'}
                            </span>
                            <Upload className="w-3 h-3 text-zinc-600 shrink-0" />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-zinc-500 rounded-full" />
                        FGD Files (Entities)
                    </label>
                    <div className="relative group">
                        <input
                            type="file"
                            multiple
                            accept=".fgd"
                            onChange={(e) => setFgdFiles(Array.from(e.target.files || []))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`py-2 px-3 border border-dashed rounded transition-colors flex items-center justify-between ${
                            fgdFiles.length > 0 ? 'border-zinc-500/50 bg-white/5' : 'border-white/10 group-hover:border-white/20'
                        }`}>
                            <span className={`text-[10px] truncate pr-4 ${fgdFiles.length > 0 ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {fgdFiles.length > 0 ? `${fgdFiles.length} files selected` : 'Select .fgd files...'}
                            </span>
                            <Upload className="w-3 h-3 text-zinc-600 shrink-0" />
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                    <button
                        onClick={handleLoad}
                        disabled={!bspFile || status === "Loading..."}
                        className={`w-full py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                            bspFile && status !== "Loading..."
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                    >
                        {status === "Loading..." ? "Processing Map..." : "Initialize Engine"}
                    </button>
                    {status !== "Waiting for map..." && (
                        <div className="flex items-center justify-center gap-2 py-1">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === "Load Error" ? "bg-red-500" : "bg-green-500"}`} />
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">{status}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
