import { create } from 'zustand';
import { ProcessedNews, Language, AppConfig } from '../types';
import { dbService } from '../services/db';

interface AppState {
  config: AppConfig;
  processedNews: ProcessedNews[];
  isFetchingNews: boolean;
  selectedNewsIds: number[];
  isSettingsOpen: boolean;
  
  setConfig: (config: Partial<AppConfig>) => void;
  setLanguage: (lang: Language) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  
  // Selection
  toggleNewsSelection: (id: number) => void;
  selectAllNews: () => void;
  deselectAllNews: () => void;

  // Pipeline Actions
  addLog: (id: number, message: string) => void;
  updateNewsStatus: (id: number, status: ProcessedNews['status'], step?: ProcessedNews['currentStep']) => void;
  updateNewsData: (id: number, data: Partial<ProcessedNews>) => void;
  
  setProcessedNews: (news: ProcessedNews[]) => void;
  setIsFetchingNews: (isFetching: boolean) => void;
  
  // Init
  loadFromDB: () => Promise<void>;
  resetAll: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: {
    language: 'English',
    autoRetry: true,
    mockMode: false,
    apiKey: localStorage.getItem('gemini_api_key') || '',
  },
  processedNews: [],
  isFetchingNews: false,
  selectedNewsIds: [],
  isSettingsOpen: false,

  setConfig: (newConfig) => set((state) => {
    // Persist API Key to local storage
    if (newConfig.apiKey !== undefined) {
      localStorage.setItem('gemini_api_key', newConfig.apiKey);
    }
    return { config: { ...state.config, ...newConfig } };
  }),
  
  setLanguage: (language) => set((state) => ({ config: { ...state.config, language } })),
  
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  toggleNewsSelection: (id) => set((state) => {
    const isSelected = state.selectedNewsIds.includes(id);
    return {
      selectedNewsIds: isSelected 
        ? state.selectedNewsIds.filter(idx => idx !== id)
        : [...state.selectedNewsIds, id]
    };
  }),
  
  selectAllNews: () => set((state) => ({ 
    selectedNewsIds: state.processedNews.map(n => n.id) 
  })),

  deselectAllNews: () => set({ selectedNewsIds: [] }),

  addLog: (id, message) => {
    set((state) => ({
      processedNews: state.processedNews.map((item) =>
        item.id === id ? { ...item, logs: [...item.logs, `[${new Date().toLocaleTimeString()}] ${message}`] } : item
      ),
    }));
  },

  updateNewsStatus: (id, status, step) => {
    set((state) => ({
      processedNews: state.processedNews.map((item) =>
        item.id === id ? { ...item, status, ...(step ? { currentStep: step } : {}) } : item
      ),
    }));
    // Sync to DB
    const item = get().processedNews.find(n => n.id === id);
    if (item) dbService.saveNews(item);
  },

  updateNewsData: (id, data) => {
    set((state) => ({
      processedNews: state.processedNews.map((item) =>
        item.id === id ? { ...item, ...data } : item
      ),
    }));
    const item = get().processedNews.find(n => n.id === id);
    if (item) dbService.saveNews(item);
  },

  setProcessedNews: (news) => {
    set({ processedNews: news });
    news.forEach(n => dbService.saveNews(n));
  },
  
  setIsFetchingNews: (isFetching) => set({ isFetchingNews: isFetching }),

  loadFromDB: async () => {
    const news = await dbService.getAllNews();
    // sort by date desc
    news.sort((a, b) => b.createdAt - a.createdAt);
    set({ processedNews: news });
  },
  
  resetAll: async () => {
    await dbService.clearAll();
    set({ processedNews: [], selectedNewsIds: [] });
  }
}));