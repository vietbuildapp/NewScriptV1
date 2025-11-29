import React, { useState } from 'react';
import { ProcessedNews } from '../types';
import { Download, Copy, ChevronLeft, Film, Image as ImageIcon, AlignLeft, Code, FileDown } from 'lucide-react';

interface ResultViewProps {
  item: ProcessedNews;
  onBack: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ item, onBack }) => {
  // New tab order: OVERVIEW -> JSON -> SCENES -> THUMBNAILS -> LOGS
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'JSON' | 'SCENES' | 'PROMPTS' | 'LOGS'>('OVERVIEW');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full_script_${item.id}.json`;
    a.click();
  };

  const downloadScenesOnly = () => {
    if (!item.scenes) return;
    const blob = new Blob([JSON.stringify(item.scenes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenes_only_${item.id}.json`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
                <h2 className="text-lg font-bold text-white line-clamp-1 max-w-xl">{item.sourceNews.tieu_de_video || item.sourceNews.tin_tuc}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-blue-400">{item.status}</span>
                    <span>ID: {item.id}</span>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => copyToClipboard(JSON.stringify(item, null, 2))} className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded">
                <Copy className="w-4 h-4" />
            </button>
            <button onClick={downloadJson} title="Download Full JSON" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">
                <Download className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900/50 backdrop-blur overflow-x-auto">
          {[
              { id: 'OVERVIEW', icon: AlignLeft, label: 'Overview' },
              { id: 'JSON', icon: Code, label: 'Raw JSON' },
              { id: 'SCENES', icon: Film, label: 'Scenes' },
              { id: 'PROMPTS', icon: ImageIcon, label: 'Thumbnails' },
              { id: 'LOGS', icon: AlignLeft, label: 'Logs' },
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                  <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-950/50">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-blue-400 font-mono text-xs uppercase mb-4">Strategic Overview</h3>
                    <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
                        {item.overview || "Overview not generated yet."}
                    </p>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-purple-400 font-mono text-xs uppercase mb-4">Source Intelligence</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <span className="text-gray-500 block">Analysis:</span>
                            {item.sourceNews.phan_tich_tac_dong}
                        </div>
                        <div>
                            <span className="text-gray-500 block">Key Figures:</span>
                            {item.sourceNews.nhan_vat_chinh?.join(", ")}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* JSON TAB (Moved Before Scenes) */}
        {activeTab === 'JSON' && (
            <div className="max-w-5xl mx-auto">
                <div className="bg-gray-800/50 p-2 rounded-t flex justify-between items-center border-b border-gray-800">
                    <span className="text-xs text-gray-400 font-mono">Full Data Structure</span>
                    <button onClick={() => copyToClipboard(JSON.stringify(item, null, 2))} className="text-blue-400 text-xs hover:underline">Copy Raw</button>
                </div>
                <pre className="bg-black text-green-400 p-4 rounded-b text-xs font-mono overflow-auto max-h-[80vh] border border-gray-800 border-t-0">
                    {JSON.stringify(item, null, 2)}
                </pre>
            </div>
        )}

        {/* SCENES TAB */}
        {activeTab === 'SCENES' && (
            <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gray-400 text-sm font-mono uppercase">
                        Script Breakdown ({item.scenes?.length || 0} scenes)
                    </h3>
                    {item.scenes && item.scenes.length > 0 && (
                        <button 
                            onClick={downloadScenesOnly}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs transition-colors shadow shadow-blue-900/50"
                        >
                            <FileDown className="w-3.5 h-3.5" /> Download Scenes JSON
                        </button>
                    )}
                </div>

                {item.scenes?.map((scene, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col md:flex-row">
                        <div className="bg-gray-900 p-4 w-full md:w-16 flex items-center justify-center border-r border-gray-700 font-mono text-xl font-bold text-gray-500">
                            #{scene.scene}
                        </div>
                        <div className="p-4 flex-1 space-y-3">
                            <div className="flex justify-between">
                                <p className="text-white font-medium">{scene.description}</p>
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 h-fit">{scene.feasibilityLevel}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-2">
                                <div className="bg-gray-900/50 p-3 rounded">
                                    <span className="text-purple-400 font-mono text-xs block mb-1">VOICE OVER</span>
                                    <p className="text-gray-300 italic">"{scene.voiceOver}"</p>
                                </div>
                                <div className="bg-gray-900/50 p-3 rounded">
                                    <span className="text-green-400 font-mono text-xs block mb-1">VISUAL & AUDIO</span>
                                    <p className="text-gray-400">Vis: {scene.visualEffect}</p>
                                    <p className="text-gray-400">Aud: {scene.audioEffect}</p>
                                </div>
                            </div>
                            
                            <div className="mt-2 border-t border-gray-700 pt-2">
                                <details className="group">
                                    <summary className="text-xs text-blue-400 cursor-pointer list-none flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3" /> Show Prompts (English)
                                    </summary>
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-500/30">
                                        <div>
                                            <span className="text-[10px] uppercase text-gray-500">Image Prompt</span>
                                            <p className="text-xs text-gray-300 font-mono bg-black/30 p-2 rounded">
                                                {scene.optimizedImagePrompt || scene.imagePrompt}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase text-gray-500">Video Prompt</span>
                                            <p className="text-xs text-gray-300 font-mono bg-black/30 p-2 rounded">
                                                {scene.optimizedVideoPrompt || scene.videoPrompt}
                                            </p>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                ))}
                {(!item.scenes || item.scenes.length === 0) && (
                    <div className="text-center text-gray-500 py-10 border border-dashed border-gray-800 rounded-lg">
                        <Film className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        No scenes generated yet.
                    </div>
                )}
            </div>
        )}
        
        {/* THUMBNAILS TAB */}
        {activeTab === 'PROMPTS' && (
             <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                     <div className="aspect-[9/16] bg-black/50 rounded mb-4 flex items-center justify-center text-gray-600">
                         9:16 Preview Placeholder
                     </div>
                     <h4 className="text-white font-bold mb-2">TikTok / Reels (9:16)</h4>
                     <p className="text-xs text-gray-400 font-mono bg-black p-3 rounded h-40 overflow-auto">
                         {item.thumbnailPrompt?.tiktok_9_16 || "Pending..."}
                     </p>
                 </div>
                 <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                     <div className="aspect-video bg-black/50 rounded mb-4 flex items-center justify-center text-gray-600">
                         16:9 Preview Placeholder
                     </div>
                     <h4 className="text-white font-bold mb-2">YouTube (16:9)</h4>
                     <p className="text-xs text-gray-400 font-mono bg-black p-3 rounded h-40 overflow-auto">
                         {item.thumbnailPrompt?.youtube_16_9 || "Pending..."}
                     </p>
                 </div>
             </div>
        )}
        
        {/* LOGS TAB */}
        {activeTab === 'LOGS' && (
            <div className="max-w-3xl mx-auto bg-black rounded p-4 border border-gray-800 font-mono text-xs">
                {item.logs.map((log, i) => (
                    <div key={i} className="py-1 border-b border-gray-900 text-gray-400">
                        {log}
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};
