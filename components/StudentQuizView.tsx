import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import MathRenderer from './MathRenderer';
import { CheckCircle2, XCircle, Clock, Award, RotateCcw, ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';

interface StudentQuizViewProps {
  title: string;
  questions: QuizQuestion[];
  subject?: string;
  grade?: string;
  isSharedLink?: boolean;
  onExitStudentMode?: () => void;
}

const StudentQuizView: React.FC<StudentQuizViewProps> = ({
  title,
  questions,
  subject,
  grade,
  isSharedLink = false,
  onExitStudentMode
}) => {
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Stopwatch timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && !isSubmitted) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: number, optionKey: string) => {
    if (isSubmitted) return; // Prevent change after submit
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = questions.length;

  const handleSubmit = () => {
    setIsSubmitted(true);
    setIsTimerRunning(false);
    setShowConfirmModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetake = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate score
  const correctCount = questions.reduce((acc, q) => {
    const studentAns = userAnswers[q.id];
    if (studentAns && studentAns.toUpperCase() === q.correct_answer.toUpperCase()) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const score10 = Math.round((correctCount / totalCount) * 10 * 10) / 10;

  const getEvaluation = (score: number) => {
    if (score >= 9) return { label: 'Xuất sắc!', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (score >= 7) return { label: 'Giỏi lắm!', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (score >= 5) return { label: 'Đạt yêu cầu!', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { label: 'Cần cố gắng thêm!', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  };

  const evalInfo = getEvaluation(score10);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onExitStudentMode && !isSharedLink && (
              <button
                onClick={onExitStudentMode}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                title="Quay lại giao diện tạo câu hỏi"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">AI QUIZ - LÀM BÀI ÔN TẬP</h1>
              <p className="text-xs text-slate-500 font-medium">Được tạo và phát triển bởi: Phùng Thanh AI</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-mono font-bold text-sm border border-slate-200">
              <Clock className="w-4 h-4 text-blue-600" />
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner Title */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
            <Sparkles className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
                {subject || 'Ôn tập'} {grade ? `• Lớp ${grade}` : ''}
              </span>
              <span className="bg-amber-400 text-slate-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                {totalCount} câu hỏi
              </span>
            </div>
            <h2 className="text-2xl font-bold leading-snug">{title}</h2>
          </div>
        </div>

        {/* Student Info Bar */}
        {!isSubmitted && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Họ và tên học sinh (không bắt buộc):</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lớp / Trường:</label>
              <input
                type="text"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                placeholder="Ví dụ: 12A1"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Result Summary Card (When submitted) */}
        {isSubmitted && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 animate-in fade-in slide-in-from-top-4">
            <div className="text-center space-y-3 border-b border-slate-100 pb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm border shadow-xs" className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm border ${evalInfo.color}`}>
                <Award className="w-4 h-4" />
                {evalInfo.label}
              </div>

              {studentName && (
                <p className="text-slate-600 text-sm font-medium">
                  Học sinh: <span className="font-bold text-slate-800">{studentName}</span> {studentClass ? `(${studentClass})` : ''}
                </p>
              )}

              <div className="flex justify-center items-baseline gap-1 my-2">
                <span className="text-5xl font-extrabold text-blue-600">{score10}</span>
                <span className="text-slate-400 font-bold text-xl">/ 10 điểm</span>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 pt-2">
                <div>
                  Số câu đúng: <strong className="text-emerald-600 text-base">{correctCount} / {totalCount}</strong>
                </div>
                <div>
                  Thời gian: <strong className="text-slate-800 text-base">{formatTime(elapsedSeconds)}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3 justify-center">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Làm lại bài
              </button>
              {onExitStudentMode && !isSharedLink && (
                <button
                  onClick={onExitStudentMode}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại tạo câu hỏi
                </button>
              )}
            </div>
          </div>
        )}

        {/* Question List */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const selectedKey = userAnswers[q.id];
            const isCorrect = selectedKey && selectedKey.toUpperCase() === q.correct_answer.toUpperCase();

            return (
              <div
                key={q.id || idx}
                id={`question-${q.id}`}
                className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                  isSubmitted
                    ? isCorrect
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Question Header */}
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg">
                      Câu {idx + 1}
                    </span>
                    {q.level && (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                        {q.level}
                      </span>
                    )}
                  </div>

                  {isSubmitted && (
                    <div>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Sai (Đáp án: {q.correct_answer})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Content */}
                <div className="text-base text-slate-800 font-medium mb-5 leading-relaxed">
                  <MathRenderer text={q.question_content} />
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {q.options.map((opt) => {
                    const isOptionSelected = selectedKey === opt.key;
                    const isOptionCorrect = opt.key.toUpperCase() === q.correct_answer.toUpperCase();

                    let optionStyle = 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white';
                    let badgeStyle = 'bg-slate-100 text-slate-600';

                    if (!isSubmitted) {
                      if (isOptionSelected) {
                        optionStyle = 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/30';
                        badgeStyle = 'bg-blue-600 text-white';
                      }
                    } else {
                      // Submitted state
                      if (isOptionCorrect) {
                        optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium ring-2 ring-emerald-500/30';
                        badgeStyle = 'bg-emerald-600 text-white';
                      } else if (isOptionSelected && !isOptionCorrect) {
                        optionStyle = 'border-rose-400 bg-rose-50 text-rose-950 font-medium';
                        badgeStyle = 'bg-rose-600 text-white';
                      } else {
                        optionStyle = 'border-slate-100 opacity-60 bg-slate-50/50';
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelectOption(q.id, opt.key)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 group ${optionStyle}`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${badgeStyle}`}>
                          {opt.key}
                        </span>
                        <div className="flex-1 pt-0.5 text-sm">
                          <MathRenderer text={opt.text} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation (When submitted) */}
                {isSubmitted && q.explanation && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-sm">
                    <p className="font-bold text-amber-900 mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Hướng dẫn giải:
                    </p>
                    <div className="text-amber-950 leading-relaxed">
                      <MathRenderer text={q.explanation} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Bar for Submission */}
      {!isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 py-3 px-4 shadow-2xl z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-slate-500">Tiến độ làm bài: </span>
              <span className="font-bold text-slate-800">{answeredCount} / {totalCount} câu</span>
            </div>

            <button
              onClick={() => {
                if (answeredCount < totalCount) {
                  setShowConfirmModal(true);
                } else {
                  handleSubmit();
                }
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all text-sm"
            >
              <Send className="w-4 h-4" /> Nộp bài
            </button>
          </div>
        </div>
      )}

      {/* Unfinished warning modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-slate-900">Chưa hoàn thành tất cả câu hỏi</h3>
              <p className="text-sm text-slate-600 mt-1">
                Bạn mới làm <strong className="text-blue-600">{answeredCount}/{totalCount}</strong> câu. Bạn có chắc chắn muốn nộp bài ngay không?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                Tiếp tục làm
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md"
              >
                Vẫn nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentQuizView;
