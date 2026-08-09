import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Check, Eye, EyeOff, ShieldCheck, Sparkles, X, HelpCircle, RefreshCw } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export const STORAGE_KEY_USER_API = 'user_gemini_api_key';

export const getUserApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_USER_API) || '';
};

export const setUserApiKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    localStorage.setItem(STORAGE_KEY_USER_API, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_USER_API);
  }
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getUserApiKey();
      setInputKey(existing);
      setSavedSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setError('Vui lòng nhập API Key của bạn trước khi lưu.');
      return;
    }

    if (trimmed.length < 10) {
      setError('Mã API Key không hợp lệ (quá ngắn). Vui lòng dán chính xác toàn bộ mã API Key.');
      return;
    }

    setUserApiKey(trimmed);
    setSavedSuccess(true);
    setError(null);
    if (onKeySaved) onKeySaved(trimmed);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setUserApiKey('');
    setInputKey('');
    setSavedSuccess(false);
    setError(null);
    if (onKeySaved) onKeySaved('');
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 10) return key;
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Cấu hình API Key Cá nhân</h3>
              <p className="text-xs text-slate-500">Chạy độc lập 100% trên thiết bị của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Bảo mật & Lưu trữ vĩnh viễn:</span>
          </div>
          <p className="leading-relaxed text-blue-800/90">
            Thao tác này chỉ cần thực hiện <strong>đúng 1 lần duy nhất</strong>. API Key sẽ được lưu cố định trong trình duyệt của bạn (LocalStorage), chạy hoàn toàn độc lập, không ảnh hưởng đến tài khoản hay thiết bị của người khác.
          </p>
        </div>

        {/* Guide to get API Key */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Cách lấy API Key miễn phí từ Google (20 giây):
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs"
            >
              Lấy API Key ngay <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1 pt-1">
            <li>Bấm nút <strong>"Lấy API Key ngay"</strong> ở trên để mở Google AI Studio.</li>
            <li>Đăng nhập tài khoản Gmail của bạn và chọn <strong>"Create API key"</strong>.</li>
            <li>Sao chép mã API Key (dạng <code>AQ.Ab8...</code> hoặc <code>AIzaSy...</code>) và dán vào ô bên dưới.</li>
          </ol>
        </div>

        {/* Input Form */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Dán API Key của bạn tại đây:
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Dán mã API Key của bạn (ví dụ: AQ.Ab8... hoặc AIza...)"
              className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-slate-800 font-mono outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-xs flex items-center gap-1"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium pt-1">{error}</p>
          )}

          {savedSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Đã lưu API Key thành công! Ứng dụng sẽ sử dụng API này mãi mãi về sau.
            </div>
          )}
        </div>

        {/* Current Saved Status */}
        {getUserApiKey() && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Đã lưu: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{maskKey(getUserApiKey())}</code></span>
            <button
              onClick={handleClear}
              className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold hover:underline"
            >
              Xóa API Key
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Lưu API Key
          </button>
        </div>

      </div>
    </div>
  );
};

export default ApiKeyModal;
