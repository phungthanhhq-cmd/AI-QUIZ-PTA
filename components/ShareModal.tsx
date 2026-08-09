import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { createShortQuizUrl } from '../utils/shareUtils';
import { Share2, Copy, Check, ExternalLink, X, CheckCircle, Globe, Lock, Smartphone, HelpCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  subject?: string;
  grade?: string;
  lessonName?: string;
  onOpenStudentView: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  questions,
  subject,
  grade,
  lessonName,
  onOpenStudentView
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [publicShareableUrl, setPublicShareableUrl] = useState<string>('');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  const quizTitle = lessonName?.trim()
    ? `${subject || 'Môn học'} Lớp ${grade || ''}: ${lessonName.trim()}`
    : `Bài tập ôn tập ${subject || ''} Lớp ${grade || ''}`;

  useEffect(() => {
    let isMounted = true;
    if (isOpen && questions && questions.length > 0) {
      createShortQuizUrl(quizTitle, questions, subject, grade).then((url) => {
        if (isMounted) {
          setShareableUrl(url);

          // If current environment is Dev (ais-dev-), also create the Public (ais-pre-) link
          if (url.includes('ais-dev-')) {
            setIsDevMode(true);
            setPublicShareableUrl(url.replace('ais-dev-', 'ais-pre-'));
          } else {
            setIsDevMode(false);
            setPublicShareableUrl(url);
          }
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, quizTitle, questions, subject, grade]);

  if (!isOpen || !questions || questions.length === 0) return null;

  const handleCopy = async (urlToCopy: string, isPublicBtn: boolean) => {
    if (!urlToCopy) return;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      if (isPublicBtn) {
        setCopiedPublic(true);
        setTimeout(() => setCopiedPublic(false), 2500);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error("Failed to copy share link", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 border border-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center shadow-inner">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Xuất Link làm bài cho Học sinh</h3>
            <p className="text-xs text-slate-500">Mọi thiết bị (Điện thoại, iPad, Máy tính) & Mọi tài khoản email</p>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-slate-800 text-sm truncate max-w-[280px]">{quizTitle}</p>
            <p className="text-slate-500 mt-0.5">{questions.length} câu hỏi trắc nghiệm</p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Sẵn sàng
          </span>
        </div>

        {/* Public Link Box (Primary for Students) */}
        <div className="space-y-2 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" />
              Link Công Khai (Gửi cho Học sinh / Mọi email):
            </label>
            <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
              Khuyên dùng
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Link này không yêu cầu quyền riêng tư. Học sinh mở trên điện thoại, máy tính hay bất kỳ tài khoản email nào cũng vào làm bài được ngay.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono select-all outline-none truncate">
              {publicShareableUrl || shareableUrl}
            </div>
            <button
              onClick={() => handleCopy(publicShareableUrl || shareableUrl, true)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md active:scale-95 flex-shrink-0 ${
                copiedPublic
                  ? 'bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
              }`}
            >
              {copiedPublic ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedPublic ? "Đã chép" : "Sao chép Link"}
            </button>
          </div>
        </div>

        {/* Explanatory Note for 403 & 404 Errors */}
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            Giải thích nguyên nhân lỗi 403 / 404:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 pl-1">
            <li>
              <strong>Lỗi 403 (Forbidden):</strong> Xảy ra khi gửi nhầm link chứa <code>ais-dev-</code> (link chỉnh sửa cá nhân của giáo viên). Tài khoản khác mở link dev sẽ bị Google chặn.
            </li>
            <li>
              <strong>Giải pháp:</strong> Dùng nút <strong>"Sao chép Link"</strong> (màu xanh lá) ở trên. Link chứa toàn bộ dữ liệu bài tập đã nén, học sinh mở trên iOS, Android, PC đều vào thẳng bài thi không cần đăng nhập!
            </li>
          </ul>
        </div>

        {/* Features callout */}
        <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <p>Hỗ trợ đầy đủ màn hình điện thoại (iOS/Android), máy tính bảng và laptop/PC.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <p>Tự động chấm điểm, tính thời gian làm bài và hiển thị lời giải chi tiết ngay sau khi học sinh bấm nộp bài.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              onClose();
              onOpenStudentView();
            }}
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <ExternalLink className="w-4 h-4" /> Thử giao diện làm bài
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShareModal;

