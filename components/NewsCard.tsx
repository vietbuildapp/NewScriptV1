import React from 'react';
import { ProcessedNews } from '../types';
import { Clock, AlertTriangle, TrendingUp, MapPin, Play, FileText, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';

interface NewsCardProps {
  item: ProcessedNews;
  onRunPipeline: (id: number) => void;
  onViewDetails: (id: number) => void;
  isSelected?: boolean;
  onToggleSelect: (id: number) => void;
}

const STEP_ORDER = ['FETCH', 'OVERVIEW', 'SCENES', 'OPTIMIZE', 'THUMBNAIL', 'DONE'];

export const NewsCard: React.FC<NewsCardProps> = ({ item, onRunPipeline, onViewDetails, isSelected, onToggleSelect }) => {
  const { sourceNews, status, currentStep } = item;
  
  const progressPercent = Math.max(0, STEP_ORDER.indexOf(currentStep)) / (STEP_ORDER.length - 1) * 100;
  
  const getStatusColor = () => {
      switch(status) {
          case 'COMPLETED': return 'border-green-500/50 bg-green-900/10';
          case 'ERROR': return 'border-red-500/50 bg-red-900/10';
          case 'PROCESSING': return 'border-blue-500/50 bg-blue-900/10';
          case 'QUEUED': return 'border-yellow-500/50 bg-yellow-900/10';
          default: return 'border-gray-700 bg-gray-800';
      }
  };

  return (
    <div 
        className={`relative border rounded-lg p-4 transition-all hover:shadow-lg cursor-pointer group ${getStatusColor()} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''}`}
        onClick={() => onViewDetails(item.id)}
    >
      {/* Checkbox Overlay */}
      <div 
        className="absolute top-4 right-4 z-10 p-2 -mt-2 -mr-2"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
      >
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-gray-800 border-gray-600 hover:border-gray-400'}`}>
            {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </div>
      </div>

      {/* Header Badge */}
      <div className="flex justify-between items-start mb-3 pr-8">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
            sourceNews.muc_do_quan_trong === 'toan_cau' ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-200'
        }`}>
            {sourceNews.muc_do_quan_trong.replace('_', ' ')}
        </span>
        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {sourceNews.thoi_gian_phat_hanh}
        </span>
      </div>

      <h3 className="text-base font-bold text-gray-100 mb-2 leading-tight line-clamp-2 pr-2">
        {sourceNews.tin_tuc}
      </h3>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
             <AlertTriangle className="w-3 h-3 text-yellow-500" />
             <span>Impact: <span className="text-gray-200">{sourceNews.tac_dong_dai}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
             <TrendingUp className="w-3 h-3 text-blue-500" />
             <span>Trend: <span className="text-gray-200">{sourceNews.xu_huong}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 col-span-2">
             <MapPin className="w-3 h-3 text-red-400" />
             <span className="truncate">{sourceNews.khu_vuc} | {sourceNews.dia_diem_nong}</span>
          </div>
      </div>
      
      {/* Progress Bar if Active */}
      {(status === 'PROCESSING' || status === 'COMPLETED') && (
        <div className="mb-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>{currentStep}</span>
                <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'}`} 
                    style={{ width: `${progressPercent}%`}}
                ></div>
            </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mt-2 border-t border-gray-700/50 pt-3">
         <div className="flex gap-2 text-gray-500">
             <FileText className={`w-4 h-4 ${item.overview ? 'text-blue-400' : ''}`} />
             <Play className={`w-4 h-4 ${item.scenes ? 'text-purple-400' : ''}`} />
             <ImageIcon className={`w-4 h-4 ${item.thumbnailPrompt ? 'text-pink-400' : ''}`} />
         </div>
         
         {status === 'IDLE' || status === 'ERROR' ? (
             <button 
                onClick={(e) => { e.stopPropagation(); onRunPipeline(item.id); }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1"
             >
                 <Play className="w-3 h-3" /> Run
             </button>
         ) : status === 'COMPLETED' ? (
             <div className="text-green-400 text-xs flex items-center gap-1">
                 <CheckCircle className="w-3 h-3" /> Done
             </div>
         ) : status === 'QUEUED' ? (
             <div className="text-yellow-500 text-xs flex items-center gap-1 animate-pulse">
                 <Loader2 className="w-3 h-3 animate-spin" /> Queued
             </div>
         ) : (
             <div className="text-blue-400 text-xs flex items-center gap-1 animate-pulse">
                 <Loader2 className="w-3 h-3 animate-spin" /> Processing...
             </div>
         )}
      </div>
    </div>
  );
};