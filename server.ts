import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

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

// Helper to generate a random 6-character short code (e.g. "aX9k2P")
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

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
