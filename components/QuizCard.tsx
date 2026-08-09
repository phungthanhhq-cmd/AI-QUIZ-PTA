import React, { useState } from 'react';
import { QuizQuestion, BloomLevel } from '../types';
import MathRenderer from './MathRenderer';
import { CheckCircle, Trash2, Edit2, Save, X } from 'lucide-react';

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  onDelete: (id: number) => void;
  onUpdate?: (question: QuizQuestion) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, index, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<QuizQuestion>(question);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedQuestion);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-primary/50 p-6 mb-4 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-white text-sm font-bold px-2 py-1 rounded-md shadow-sm">
                Sửa Câu {index + 1}
            </span>
            <select 
              value={editedQuestion.level}
              onChange={(e) => setEditedQuestion({...editedQuestion, level: e.target.value})}
              className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200 outline-none"
            >
              {Object.values(BloomLevel).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button 
                type="button"
                onClick={handleSave}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-all"
                title="Lưu thay đổi"
            >
                <Save className="w-5 h-5" />
            </button>
            <button 
                type="button"
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all"
                title="Hủy"
            >
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung câu hỏi</label>
          <textarea 
            value={editedQuestion.question_content}
            onChange={(e) => setEditedQuestion({...editedQuestion, question_content: e.target.value})}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">Các đáp án (Chọn đáp án đúng)</label>
          {editedQuestion.options.map((opt, optIndex) => (
            <div key={opt.key} className="flex items-start gap-3">
              <div className="pt-2">
                <input 
                  type="radio" 
                  name={`correct_answer_${question.id}`}
                  checked={editedQuestion.correct_answer === opt.key}
                  onChange={() => setEditedQuestion({...editedQuestion, correct_answer: opt.key})}
                  className="w-4 h-4 text-primary"
                />
              </div>
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm bg-slate-100 text-slate-700 border border-slate-300">
                {opt.key}
              </span>
              <textarea 
                value={opt.text}
                onChange={(e) => {
                  const newOptions = [...editedQuestion.options];
                  newOptions[optIndex].text = e.target.value;
                  setEditedQuestion({...editedQuestion, options: newOptions});
                }}
                className="flex-grow p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none min-h-[60px]"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    // Increased opacity to bg-white/95 to make it very readable
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/60 p-6 mb-4 transition-all hover:bg-white hover:shadow-xl group relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
            <span className="bg-primary text-white text-sm font-bold px-2 py-1 rounded-md shadow-sm">
                Câu {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                {question.level}
            </span>
        </div>
        
        <div className="flex gap-1">
          {/* Edit Button */}
          <button 
              type="button"
              onClick={() => {
                setEditedQuestion(question);
                setIsEditing(true);
              }}
              className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-all"
              title="Sửa câu hỏi này"
          >
              <Edit2 className="w-5 h-5" />
          </button>
          
          {/* Delete Button */}
          <button 
              type="button"
              onClick={() => onDelete(question.id)}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
              title="Xóa câu hỏi này"
          >
              <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-6 text-lg font-medium text-slate-900 leading-relaxed drop-shadow-sm">
        <MathRenderer text={question.question_content} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((opt) => {
          const isCorrect = opt.key === question.correct_answer;
          return (
            <div 
              key={opt.key}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                isCorrect 
                  ? 'border-green-500/50 bg-green-50/80' 
                  : 'border-slate-200 hover:border-blue-400/50 bg-white/60 hover:bg-white/90'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`
                    flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-sm
                    ${isCorrect ? 'bg-green-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}
                `}>
                  {opt.key}
                </span>
                <div className="flex-grow pt-1">
                    <MathRenderer text={opt.text} className="text-slate-800 font-medium" />
                </div>
                {isCorrect && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 drop-shadow-sm" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizCard;