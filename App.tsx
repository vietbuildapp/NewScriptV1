import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { NewsCard } from './components/NewsCard';
import { ResultView } from './components/ResultView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { useAppStore } from './store/useAppStore';
import { 
  fetchNewsAnalysis, 
  generateOverview, 
  generateScenes, 
  optimizePrompts, 
  generateThumbnails 
} from './services/gemini';
import { delay } from './utils/helpers';
import { ProcessedNews } from './types';
import { CheckSquare, Square } from 'lucide-react';

// Hardcoded timing delays as per spec
const DELAY_STEP_MS = 20000;
const DELAY_NEWS_MS = 60000;
const DELAY_RETRY_MS = 15000;

function App() {
  const { 
    processedNews, 
    setProcessedNews, 
    addLog, 
    updateNewsStatus, 
    updateNewsData, 
    config, 
    loadFromDB,
    isFetchingNews,
    setIsFetchingNews,
    selectedNewsIds,
    toggleNewsSelection,
    selectAllNews,
    deselectAllNews,
    isSettingsOpen,
    setSettingsOpen
  } = useAppStore();

  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);

  useEffect(() => {
    loadFromDB();
  }, []);

  const handleFetchNews = async () => {
    if (isFetchingNews) return;
    
    if (!config.apiKey) {
        setSettingsOpen(true);
        return;
    }

    setIsFetchingNews(true);
    try {
      const newsItems = await fetchNewsAnalysis();
      const timestamp = Date.now();
      
      // Generate unique IDs using timestamp + index to prevent collision
      const newProcessed: ProcessedNews[] = newsItems.map((item, index) => ({
        id: timestamp + index,
        sourceNews: { ...item, id: timestamp + index }, // Sync ID
        status: 'IDLE',
        currentStep: 'FETCH',
        logs: [`Initial fetch completed at ${new Date().toISOString()}`],
        createdAt: timestamp
      }));
      
      // Append to fresh state
      const currentNews = useAppStore.getState().processedNews;
      setProcessedNews([...newProcessed, ...currentNews]);
    } catch (error) {
      console.error("Failed to fetch news", error);
      const errMsg = String(error);
      if (errMsg.includes('API_KEY_MISSING')) {
          setSettingsOpen(true);
      } else {
          alert("Failed to fetch news. Check logs or verify API Key quota.");
      }
    } finally {
      setIsFetchingNews(false);
    }
  };

  const runPipelineForItem = async (id: number) => {
    // Check key before running
    if (!useAppStore.getState().config.apiKey) {
        setSettingsOpen(true);
        return;
    }

    // CRITICAL FIX: Always fetch the latest item state directly from the store
    // This prevents stale closure issues when running in a long loop
    const item = useAppStore.getState().processedNews.find(p => p.id === id);
    
    console.log(`Starting pipeline for ID: ${id}`, item); // Debug log

    if (!item) {
        console.error(`Item with ID ${id} not found in store.`);
        return;
    }

    // Helper for steps
    const runStep = async <T,>(
        stepName: ProcessedNews['currentStep'], 
        action: () => Promise<T>, 
        onSuccess: (data: T) => void
    ) => {
        updateNewsStatus(id, 'PROCESSING', stepName);
        addLog(id, `Starting ${stepName}...`);
        
        try {
            const data = await action();
            onSuccess(data);
            addLog(id, `Finished ${stepName}. Waiting ${DELAY_STEP_MS/1000}s...`);
            await delay(DELAY_STEP_MS);
            return true;
        } catch (error) {
            console.error(`Error in ${stepName}`, error);
            addLog(id, `Error in ${stepName}: ${String(error)}`);
            
            if (String(error).includes('API_KEY_MISSING')) {
                setSettingsOpen(true);
                updateNewsStatus(id, 'ERROR');
                return false;
            }
            
            if (config.autoRetry) {
                 addLog(id, `Retrying ${stepName} in ${DELAY_RETRY_MS/1000}s...`);
                 await delay(DELAY_RETRY_MS);
                 try {
                     const retryData = await action();
                     onSuccess(retryData);
                     addLog(id, `Retry ${stepName} success.`);
                     await delay(DELAY_STEP_MS);
                     return true;
                 } catch (retryError) {
                     addLog(id, `Retry failed.`);
                     updateNewsStatus(id, 'ERROR');
                     return false;
                 }
            } else {
                updateNewsStatus(id, 'ERROR');
                return false;
            }
        }
    };

    // 1. Overview
    // Always re-fetch item to ensure we have the latest data for sourceNews
    const currentItemStart = useAppStore.getState().processedNews.find(p => p.id === id);
    if (!currentItemStart) return;

    const success1 = await runStep(
        'OVERVIEW', 
        () => generateOverview(currentItemStart.sourceNews, config.language), 
        (data) => updateNewsData(id, { overview: data })
    );
    if (!success1) {
        updateNewsStatus(id, 'ERROR');
        return;
    }

    // 2. Scenes (Batched)
    const currentItemAfterOverview = useAppStore.getState().processedNews.find(p => p.id === id);
    if (!currentItemAfterOverview?.overview) {
        addLog(id, "Overview missing, aborting scenes.");
        updateNewsStatus(id, 'ERROR');
        return;
    }

    const success2 = await runStep(
        'SCENES',
        () => generateScenes(
          currentItemAfterOverview.overview!, 
          config.language,
          (msg) => addLog(id, msg) // Pass logger callback
        ),
        (data) => updateNewsData(id, { scenes: data })
    );
    if (!success2) {
        updateNewsStatus(id, 'ERROR');
        return;
    }

    // 3. Prompt Optimization
    const currentItemAfterScenes = useAppStore.getState().processedNews.find(p => p.id === id);
    if (!currentItemAfterScenes?.scenes) {
        addLog(id, "Scenes missing, aborting optimization.");
        updateNewsStatus(id, 'ERROR');
        return;
    }

    const success3 = await runStep(
        'OPTIMIZE',
        () => optimizePrompts(currentItemAfterScenes.scenes!),
        (data) => {
            // Merge optimized prompts back into scenes
            const updatedScenes = currentItemAfterScenes.scenes!.map(scene => {
                const optimized = data.find((o: any) => o.scene === scene.scene);
                return optimized ? { 
                    ...scene, 
                    optimizedImagePrompt: optimized.optimizedImagePrompt, 
                    optimizedVideoPrompt: optimized.optimizedVideoPrompt 
                } : scene;
            });
            updateNewsData(id, { scenes: updatedScenes });
        }
    );
    if (!success3) {
        updateNewsStatus(id, 'ERROR');
        return;
    }

    // 4. Thumbnails
    const currentItemFinal = useAppStore.getState().processedNews.find(p => p.id === id);
    if (!currentItemFinal) return;

    const success4 = await runStep(
        'THUMBNAIL',
        () => generateThumbnails(currentItemFinal.sourceNews),
        (data) => updateNewsData(id, { thumbnailPrompt: data })
    );
    if (!success4) {
        updateNewsStatus(id, 'ERROR');
        return;
    }

    updateNewsStatus(id, 'COMPLETED', 'DONE');
    addLog(id, "Pipeline Completed Successfully.");
  };

  const handleBatchRun = async () => {
      // Check Key first
      if (!useAppStore.getState().config.apiKey) {
          setSettingsOpen(true);
          return;
      }

      // Get fresh state for selection
      const state = useAppStore.getState();
      const selectedIds = state.selectedNewsIds;
      
      const targetIds = selectedIds.length > 0 
        ? selectedIds 
        : state.processedNews.filter(p => p.status === 'IDLE').slice(0, 10).map(p => p.id);

      console.log("Starting batch run for IDs:", targetIds);

      if (targetIds.length === 0) {
          alert("No items selected or available to run.");
          return;
      }

      // MARK ALL AS QUEUED IMMEDIATELY for visual feedback
      targetIds.forEach(id => {
          updateNewsStatus(id, 'QUEUED');
      });

      // NO CONFIRM BLOCKER - JUST RUN
      // if (!confirm(`Run pipeline for ${targetIds.length} items? This may take time.`)) return;

      for (let i = 0; i < targetIds.length; i++) {
          const id = targetIds[i];
          
          // Verify existence before running
          const exists = useAppStore.getState().processedNews.some(p => p.id === id);
          if (!exists) {
              console.warn(`Item ${id} no longer exists, skipping.`);
              continue;
          }

          await runPipelineForItem(id);
          
          // Delay between news items (except the last one)
          if (i < targetIds.length - 1) {
             console.log(`Waiting ${DELAY_NEWS_MS/1000}s before next item...`);
             addLog(targetIds[i], `Batch waiting ${DELAY_NEWS_MS/1000}s for next item...`);
             await delay(DELAY_NEWS_MS);
          }
      }
      
      alert("Batch run completed!");
  };

  const selectedItem = processedNews.find(p => p.id === selectedViewId);
  const showModal = isSettingsOpen || !config.apiKey;

  return (
    <div className="flex bg-[#0f1115] min-h-screen text-gray-200 font-sans">
      <Sidebar onFetchNews={handleFetchNews} onOpenSettings={() => setSettingsOpen(true)} />
      
      {showModal && <ApiKeyModal />}

      <main className="ml-64 flex-1 h-screen overflow-hidden relative">
        {selectedItem ? (
            <ResultView item={selectedItem} onBack={() => setSelectedViewId(null)} />
        ) : (
            <div className="h-full overflow-y-auto p-8">
                <header className="flex justify-between items-center mb-8 sticky top-0 bg-[#0f1115] z-10 py-4 border-b border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white">News Intelligence Feed</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {processedNews.length} items • {selectedNewsIds.length} selected • {config.language} Mode
                        </p>
                    </div>
                    <div className="flex gap-3 items-center">
                         <div className="flex gap-2 mr-4 text-sm text-gray-400">
                             <button onClick={selectAllNews} className="hover:text-white underline">Select All</button>
                             <span>/</span>
                             <button onClick={deselectAllNews} className="hover:text-white underline">Deselect</button>
                         </div>

                         <button 
                            onClick={handleBatchRun}
                            disabled={isFetchingNews}
                            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                selectedNewsIds.length > 0 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                         >
                             {selectedNewsIds.length > 0 ? `Run Selected (${selectedNewsIds.length})` : 'Run Batch (Auto)'}
                         </button>
                    </div>
                </header>

                {isFetchingNews ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         {[1,2,3].map(i => (
                             <div key={i} className="h-48 rounded-lg bg-gray-800 animate-pulse border border-gray-700"></div>
                         ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {processedNews.map(item => (
                            <NewsCard 
                                key={item.id} 
                                item={item} 
                                onRunPipeline={runPipelineForItem}
                                onViewDetails={setSelectedViewId}
                                isSelected={selectedNewsIds.includes(item.id)}
                                onToggleSelect={toggleNewsSelection}
                            />
                        ))}
                    </div>
                )}
                
                {processedNews.length === 0 && !isFetchingNews && (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                        <p className="mb-4">No news items found. Fetch some news to get started.</p>
                        <button 
                           onClick={handleFetchNews}
                           className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
                        >
                            Fetch Data
                        </button>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}

export default App;