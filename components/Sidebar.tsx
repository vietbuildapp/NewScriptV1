import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Language } from '../types';
import { Globe, RefreshCw, Trash2, Settings, PlayCircle } from 'lucide-react';

const LANGUAGES: Language[] = ['English', 'German', 'French', 'Japanese', 'Korean'];

interface SidebarProps {
  onFetchNews: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onFetchNews, onOpenSettings }) => {
  const { config, setLanguage, resetAll, processedNews } = useAppStore();

  return (
    <div className="w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col p-4 fixed left-0 top-0 z-20">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-blue-400 tracking-wider flex items-center gap-2">
           <PlayCircle className="w-6 h-6" /> SCRIPT FACTORY
        </h1>
        <p className="text-xs text-gray-500 mt-1">Strategic Intelligence Pipeline</p>
      </div>

      <div className="space-y-6 flex-1">
        {/* Language Selector */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Target Language
          </label>
          <div className="relative">
            <select
              value={config.language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:border-blue-500 outline-none appearance-none"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <Globe className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onFetchNews}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Fetch News (24h)
          </button>
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-md p-3">
            <div className="text-xs text-gray-400">Items in DB</div>
            <div className="text-2xl font-mono text-white">{processedNews.length}</div>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-2">
        <button
          onClick={() => { if(confirm('Clear all data?')) resetAll(); }}
          className="w-full text-left text-xs text-red-400 hover:text-red-300 flex items-center gap-2 px-2 py-1"
        >
          <Trash2 className="w-3 h-3" /> Clear Database
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full text-left text-xs text-gray-500 hover:text-blue-400 flex items-center gap-2 px-2 py-1 transition-colors"
        >
            <Settings className="w-3 h-3" />
            Settings (API Key)
        </button>
      </div>
    </div>
  );
};