import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Key, Eye, EyeOff, Save, X } from 'lucide-react';

export const ApiKeyModal = () => {
  const { config, setConfig, setSettingsOpen } = useAppStore();
  const [inputKey, setInputKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState('');

  const isMandatory = !config.apiKey;

  useEffect(() => {
    if (config.apiKey) setInputKey(config.apiKey);
  }, [config.apiKey]);

  const handleSave = () => {
    if (!inputKey.trim()) {
       setError('Please enter an API Key');
       return;
    }
    // Simple client-side validation pattern
    if (!inputKey.trim().startsWith('AIza')) {
       setError('Invalid API Key format (usually starts with AIza)');
       return;
    }
    setConfig({ apiKey: inputKey.trim() });
    setSettingsOpen(false);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {!isMandatory && (
            <button 
                onClick={() => setSettingsOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
                <X className="w-5 h-5" />
            </button>
        )}
        
        <div className="p-6">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-500/10 rounded-full">
                    <Key className="w-8 h-8 text-blue-500" />
                </div>
            </div>
            
            <h2 className="text-xl font-bold text-center text-white mb-2">
                {isMandatory ? 'Welcome to Script Factory' : 'API Settings'}
            </h2>
            <p className="text-center text-gray-400 text-sm mb-6">
                {isMandatory 
                  ? 'To get started, please enter your Google Gemini API Key. Your key is stored securely in your browser\'s local storage.' 
                  : 'Update your Gemini API Key below.'}
            </p>

            <div className="space-y-4">
                <div className="relative">
                    <input 
                        type={isVisible ? "text" : "password"} 
                        value={inputKey}
                        onChange={(e) => { setInputKey(e.target.value); setError(''); }}
                        placeholder="Paste your API Key here..."
                        className="w-full bg-black/50 border border-gray-700 rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                    >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <button 
                    onClick={handleSave}
                    disabled={!inputKey}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" /> Save API Key
                </button>
                
                <div className="text-center pt-2">
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline"
                    >
                        Get a Gemini API Key →
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};