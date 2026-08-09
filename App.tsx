import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { QuizConfig, QuizQuestion, BloomLevel, HistoryItem } from './types';
import ConfigPanel from './components/ConfigPanel';
import QuizCard from './components/QuizCard';
import HistoryModal from './components/HistoryModal';
import ShareModal from './components/ShareModal';
import ApiKeyModal, { getUserApiKey } from './components/ApiKeyModal';
import StudentQuizView from './components/StudentQuizView';
import { generateQuizFromContent } from './services/geminiService';
import { decodeQuizFromUrl, SharedQuizPackage } from './utils/shareUtils';
import { Download, History, BrainCircuit, Copy, Check, Share2, Key, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<QuizConfig>({
    level: "THPT",
    subject: "Toán",
    grade: "12",
    questionCount: 10,
    bloomLevels: [BloomLevel.KNOWLEDGE, BloomLevel.COMPREHENSION],
    optionCount: 4,
    isTrueFalse: false,
    sourceText: "",
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  
  // New state for modals and student mode
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [studentQuizPackage, setStudentQuizPackage] = useState<SharedQuizPackage | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Check if opening via share link
    decodeQuizFromUrl().then((initialPkg) => {
      if (initialPkg) {
        setStudentQuizPackage(initialPkg);
      }
    });

    const handleHashChange = () => {
      decodeQuizFromUrl().then((pkg) => {
        setStudentQuizPackage(pkg);
      });
    };

    window.addEventListener('hashchange', handleHashChange);

    const saved = localStorage.getItem('quizHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // --- Handlers ---
  const handleGenerate = async () => {
    if (files.length === 0 && !config.sourceText?.trim() && !config.lessonName?.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedQuiz(null);

    try {
      const questions = await generateQuizFromContent(files, config);
      
      // Ensure unique IDs for React keys and deletion logic
      const questionsWithUniqueIds = questions.map((q, index) => ({
        ...q,
        id: Date.now() + index
      }));
      
      setGeneratedQuiz(questionsWithUniqueIds);
      
      // Save to history
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: config.lessonName?.trim() 
          ? `${config.subject} Lớp ${config.grade}: ${config.lessonName.trim()}`
          : `${config.subject} - Lớp ${config.grade}`,
        questions: questionsWithUniqueIds
      };
      
      const newHistory = [newHistoryItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('quizHistory', JSON.stringify(newHistory));

    } catch (err: any) {
      const errMsg = err.message || "Đã xảy ra lỗi không xác định.";
      setError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = (id: number) => {
    if (!generatedQuiz) return;
    
    const updatedQuiz = generatedQuiz.filter(q => q.id !== id);
    setGeneratedQuiz(updatedQuiz);
  };

  const handleUpdateQuestion = (updatedQuestion: QuizQuestion) => {
    if (!generatedQuiz) return;
    const updatedQuiz = generatedQuiz.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
    setGeneratedQuiz(updatedQuiz);
  };

  const handleExportExcel = () => {
    if (!generatedQuiz) return;

    const exportData = generatedQuiz.map(q => {
      const row: any = {
        "ID": q.id,
        "Câu hỏi": q.question_content,
      };
      
      q.options.forEach(o => {
        row[`Đáp án ${o.key}`] = o.text;
      });
      
      row["Đáp án đúng"] = q.correct_answer;
      row["Mức độ"] = q.level;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");
    XLSX.writeFile(wb, `Quiz_${config.subject}_${Date.now()}.xlsx`);
  };

  const handleCopyJSON = async () => {
    if (!generatedQuiz) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedQuiz, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON", err);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    // Ensure unique IDs even for history items
    const sanitizedQuestions = item.questions.map((q, index) => ({
        ...q,
        id: Date.now() + index
    }));
    setGeneratedQuiz(sanitizedQuestions);
    setIsHistoryModalOpen(false);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('quizHistory', JSON.stringify(newHistory));
  };

  const exitStudentMode = () => {
    setStudentQuizPackage(null);
    if (window.location.hash.includes('quiz=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const openStudentPreview = () => {
    if (!generatedQuiz) return;
    const title = config.lessonName?.trim()
      ? `${config.subject} Lớp ${config.grade}: ${config.lessonName.trim()}`
      : `Bài tập ôn tập ${config.subject} Lớp ${config.grade}`;
    setStudentQuizPackage({
      title,
      questions: generatedQuiz,
      subject: config.subject,
      grade: config.grade
    });
  };

  // --- Render ---
  if (studentQuizPackage) {
    return (
      <StudentQuizView
        title={studentQuizPackage.title}
        questions={studentQuizPackage.questions}
        subject={studentQuizPackage.subject}
        grade={studentQuizPackage.grade}
        isSharedLink={studentQuizPackage.isSharedLink}
        onExitStudentMode={exitStudentMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      
      {/* Header - Increased Opacity */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/40 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="font-bold text-xl text-slate-800 leading-tight drop-shadow-sm">AI QUIZ</h1>
                    <p className="text-xs text-slate-600 font-bold tracking-wide">Được tạo và phát triển bởi: Phùng Thanh AI</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsApiKeyModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300/80 font-bold transition-all text-xs shadow-xs active:scale-95"
                title="Cấu hình API Key cá nhân để sử dụng ứng dụng"
              >
                <Key className="w-4 h-4 text-amber-600" />
                <span>{getUserApiKey() ? 'API Key: Đã lưu' : 'Dán API tại đây'}</span>
              </button>

              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/70 hover:bg-white/90 text-slate-800 font-semibold transition-colors border border-white/50 shadow-sm active:scale-95 backdrop-blur-sm text-xs"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Lịch sử</span>
                {history.length > 0 && (
                  <span className="bg-slate-200/80 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold shadow-inner">
                    {history.length}
                  </span>
                )}
              </button>
            </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full p-4 gap-6 h-[calc(100vh-64px)] overflow-hidden">
            
            {/* Left Panel: Config */}
            <div className="w-full md:w-[400px] flex-shrink-0 h-full overflow-hidden flex flex-col">
                <ConfigPanel 
                    config={config} 
                    setConfig={setConfig} 
                    files={files} 
                    setFiles={setFiles}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerate}
                />
            </div>

            {/* Right Panel: Results - Increased Opacity */}
            <div className="flex-1 h-full flex flex-col bg-white/85 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 overflow-hidden relative">
                
                {/* Result Header */}
                <div className="px-6 py-4 border-b border-slate-200/50 flex justify-between items-center bg-white/95 sticky top-0 z-10 backdrop-blur-md">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2 drop-shadow-sm">
                        {generatedQuiz ? (
                            <>Kết quả: <span className="text-blue-700">{generatedQuiz.length} câu hỏi</span></>
                        ) : (
                            'Khu vực hiển thị'
                        )}
                    </h2>
                    {generatedQuiz && (
                        <div className="flex flex-wrap gap-2">
                            <button 
                                onClick={() => setIsShareModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-lg shadow-purple-500/30 font-medium text-sm active:scale-95"
                            >
                                <Share2 className="w-4 h-4" /> Link làm bài cho HS
                            </button>
                            <button 
                                onClick={handleCopyJSON}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all shadow-lg font-medium text-sm backdrop-blur-sm
                                    ${isCopied 
                                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
                                    }
                                `}
                            >
                                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                                {isCopied ? "Đã sao chép" : "Copy sang giáo viên đổi mới"}
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-500/30 font-medium text-sm"
                            >
                                <Download className="w-4 h-4" /> Xuất Excel
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {error && (
                        <div className="bg-red-50/95 border-2 border-red-200 text-red-800 p-6 rounded-2xl shadow-xl animate-in slide-in-from-top-2 space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-red-100 rounded-xl text-red-600 font-bold">⚠️</div>
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-red-900 mb-1">Thông báo</h3>
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-red-800">{error}</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-red-200/60 flex items-center justify-between flex-wrap gap-2">
                              <button
                                onClick={handleGenerate}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 active:scale-95"
                              >
                                <RefreshCw className="w-4 h-4" /> Thử lại ngay
                              </button>
                              <button
                                onClick={() => setIsApiKeyModalOpen(true)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <Key className="w-4 h-4 text-slate-500" /> Cấu hình API Key (Nếu cần)
                              </button>
                            </div>
                        </div>
                    )}

                    {!generatedQuiz && !isGenerating && !error && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/60">
                                <BrainCircuit className="w-10 h-10 opacity-60 text-slate-600" />
                            </div>
                            <p className="text-lg font-bold text-slate-700 drop-shadow-sm">Sẵn sàng tạo câu hỏi</p>
                            <p className="text-sm mt-2 max-w-md text-center text-slate-600 font-medium">Tải lên tài liệu ở bảng bên trái và nhấn "Tạo Quiz Ngay" để bắt đầu.</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="relative mb-8">
                                <div className="w-20 h-20 border-4 border-white/50 rounded-full"></div>
                                <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-lg"></div>
                            </div>
                            <p className="text-lg font-bold text-slate-800 mb-2 drop-shadow-sm">Đang phân tích tài liệu...</p>
                            <p className="text-slate-600 text-sm font-medium">AI đang soạn thảo câu hỏi theo chuẩn GDPT 2018</p>
                        </div>
                    )}

                    {generatedQuiz && (
                        <div className="max-w-4xl mx-auto pb-10 space-y-6">
                            {generatedQuiz.map((q, idx) => (
                                <QuizCard 
                                    key={q.id} // Use ID instead of index for safer deletion rendering
                                    question={q} 
                                    index={idx} 
                                    onDelete={handleDeleteQuestion}
                                    onUpdate={handleUpdateQuestion}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
      </main>
      
      <HistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onSelect={loadHistoryItem}
        onDelete={deleteHistoryItem}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        questions={generatedQuiz || []}
        subject={config.subject}
        grade={config.grade}
        lessonName={config.lessonName}
        onOpenStudentView={openStudentPreview}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
};

export default App;