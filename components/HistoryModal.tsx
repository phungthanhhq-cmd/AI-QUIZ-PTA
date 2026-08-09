import React from 'react';
import { HistoryItem } from '../types';
import { X, Trash2, Clock, ChevronRight } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelect, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        // Increased opacity to bg-white/95
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/60">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg backdrop-blur-sm">
                <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">Lịch sử tạo Quiz</h3>
                <p className="text-xs text-slate-600 font-medium">Đã lưu {history.length} bài trắc nghiệm</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                    <Clock className="w-12 h-12 mb-2 opacity-50" />
                    <p className="font-medium">Chưa có lịch sử nào.</p>
                </div>
            ) : (
                history.map(item => (
                    <div 
                        key={item.id}
                        onClick={() => onSelect(item)}
                        // Increased opacity for items
                        className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/60 hover:border-primary/50 hover:shadow-lg hover:bg-white cursor-pointer transition-all relative overflow-hidden"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-primary transition-colors">
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                                    <span className="bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/50">
                                        {item.questions.length} câu hỏi
                                    </span>
                                    <span>
                                        {new Date(item.timestamp).toLocaleDateString('vi-VN')} {new Date(item.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={(e) => onDelete(e, item.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-all"
                                    title="Xóa"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-white/60 text-center backdrop-blur-sm">
            <button 
                onClick={onClose}
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
            >
                Đóng
            </button>
        </div>
      </div>
    </div>
  )
}
export default HistoryModal;