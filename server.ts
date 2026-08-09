import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from "@google/genai";

// In-memory quiz store (maps short 6-character code to quiz package)
interface QuizStoreItem {
  id: string;
  title: string;
  subject?: string;
  grade?: string;
  questions: any[];
  createdAt: number;
}

const quizStore = new Map<string, QuizStoreItem>();

function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const SYSTEM_INSTRUCTION = `
Bạn là một giáo viên chuyên gia của Việt Nam, am hiểu sâu sắc Chương trình Giáo dục Phổ thông 2018 (GDPT 2018).
Nhiệm vụ của bạn là tạo ra các câu hỏi trắc nghiệm khách quan từ tài liệu được cung cấp.

YÊU CẦU BẮT BUỘC:
1. Nội dung câu hỏi phải chính xác về mặt kiến thức, phù hợp với Lớp và Môn học được yêu cầu.
2. Phân loại mức độ nhận thức (Bloom) đúng theo cấu hình.
3. Sử dụng định dạng LaTeX cho TẤT CẢ các công thức toán học, đặt trong dấu $ đơn (ví dụ: $x^2$). TUYỆT ĐỐI KHÔNG dùng $$ (hai dấu $).
4. Ngôn ngữ: Tiếng Việt chuẩn mực sư phạm.
`;

const normalizeMathDelimiters = (text: string): string => {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/\$\$/g, '$');
  cleaned = cleaned.replace(/\\\[/g, '$').replace(/\\\]/g, '$');
  cleaned = cleaned.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
  return cleaned;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  // API Route: Generate quiz via Gemini server-side
  app.post('/api/generate-quiz', async (req, res) => {
    try {
      const { promptText, fileParts, optionCount, isTrueFalse, userApiKey } = req.body;
      const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey) {
        return res.status(400).json({ error: 'Chưa có API Key. Vui lòng bấm "Cấu hình API Key" ở góc trên ứng dụng để nhập API Key cá nhân của bạn.' });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const optCount = optionCount || 4;
      const optionKeys = Array.from({ length: optCount }, (_, i) => String.fromCharCode(65 + i));

      const dynamicQuizSchema: Schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            question_content: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING, enum: optionKeys },
                  text: { type: Type.STRING }
                },
                required: ["key", "text"]
              }
            },
            correct_answer: { type: Type.STRING, enum: optionKeys },
            level: { type: Type.STRING },
          },
          required: ["id", "question_content", "options", "correct_answer", "level"]
        }
      };

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];

      const callModel = async (modelName: string) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [...(fileParts || []), { text: promptText }]
          },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: dynamicQuizSchema,
            temperature: 0.4,
          }
        });
      };

      let responseText: string | undefined;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          const res = await callModel(modelName);
          if (res.text) {
            responseText = res.text;
            break;
          }
        } catch (e: any) {
          console.warn(`Model ${modelName} failed on server proxy:`, e?.message || e);
          lastError = e;
        }
      }

      if (!responseText) {
        const rawErrStr = typeof lastError === 'string' ? lastError : (lastError?.message || JSON.stringify(lastError || {}));
        
        if (rawErrStr.includes('denied access') || rawErrStr.includes('PERMISSION_DENIED') || rawErrStr.includes('403')) {
          return res.status(403).json({ 
            error: 'Dự án hoặc API Key này đã bị Google tạm khóa / từ chối quyền truy cập (Lỗi 403 Permission Denied: Your project has been denied access).\n\n👉 Cách xử lý: Vui lòng bấm vào nút "API Key: Đã lưu" ở góc trên giao diện để dán một API Key mới lấy từ Google AI Studio (bằng tài khoản Gmail khác).' 
          });
        }

        if (rawErrStr.includes('API key not valid') || rawErrStr.includes('API_KEY_INVALID') || rawErrStr.includes('400')) {
          return res.status(400).json({ 
            error: 'API Key không hợp lệ hoặc bị dán sai ký tự.\n\n👉 Cách xử lý: Bấm nút "API Key" ở góc trên giao diện để kiểm tra và dán lại mã API Key chính xác từ Google AI Studio.' 
          });
        }

        if (rawErrStr.includes('RESOURCE_EXHAUSTED') || rawErrStr.includes('429')) {
          return res.status(429).json({ 
            error: 'API Key này đã đạt giới hạn gọi miễn phí trong ngày của Google (429 Too Many Requests).\n\n👉 Cách xử lý: Vui lòng đổi sang một API Key của tài khoản Gmail khác hoặc thử lại sau vài phút.' 
          });
        }

        return res.status(500).json({ error: `Không thể tạo câu hỏi từ Gemini AI: ${rawErrStr}` });
      }

      const rawQuestions = JSON.parse(responseText);

      const questions = rawQuestions.map((q: any) => {
        let processedOptions = q.options.map((opt: any) => ({
          ...opt,
          text: normalizeMathDelimiters(opt.text)
        }));

        let correctAnswerKey = q.correct_answer;

        if (!isTrueFalse) {
          const optionsWithFlag = processedOptions.map((opt: any) => ({
            ...opt,
            isCorrect: opt.key === q.correct_answer
          }));

          for (let i = optionsWithFlag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
          }

          processedOptions = optionsWithFlag.map((opt: any, index: number) => {
            const newKey = String.fromCharCode(65 + index);
            if (opt.isCorrect) {
              correctAnswerKey = newKey;
            }
            return {
              key: newKey,
              text: opt.text
            };
          });
        }

        return {
          ...q,
          question_content: normalizeMathDelimiters(q.question_content),
          options: processedOptions,
          correct_answer: correctAnswerKey
        };
      });

      return res.json({ questions });
    } catch (err: any) {
      console.error('Error generating quiz on server:', err);
      return res.status(500).json({ error: err.message || 'Lỗi khi tạo câu hỏi từ AI.' });
    }
  });

  // API Route: Save quiz and return a short code
  app.post('/api/share', (req, res) => {
    try {
      const { title, questions, subject, grade } = req.body;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Nội dung bộ câu hỏi không hợp lệ' });
      }

      let code = generateShortCode();
      while (quizStore.has(code)) {
        code = generateShortCode();
      }

      const item: QuizStoreItem = {
        id: code,
        title: title || 'Bài tập trắc nghiệm',
        subject,
        grade,
        questions,
        createdAt: Date.now()
      };

      quizStore.set(code, item);

      return res.json({ code, id: code });
    } catch (err) {
      console.error('Error saving shared quiz:', err);
      return res.status(500).json({ error: 'Không thể lưu bộ câu hỏi' });
    }
  });

  // API Route: Get quiz by short code
  app.get('/api/share/:code', (req, res) => {
    const { code } = req.params;
    const quiz = quizStore.get(code);

    if (!quiz) {
      return res.status(404).json({ error: 'Không tìm thấy bộ câu hỏi hoặc liên kết đã hết hạn' });
    }

    return res.json(quiz);
  });

  // Serve Vite in development mode or Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
