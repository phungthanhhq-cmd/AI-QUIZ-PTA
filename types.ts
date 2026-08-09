export interface QuizOption {
  key: string; // A, B, C, D
  text: string;
}

export interface QuizQuestion {
  id: number;
  question_content: string;
  options: QuizOption[];
  correct_answer: string; // A, B, C, or D
  level: string; // Nhận biết, Thông hiểu, etc.
}

export enum BloomLevel {
  KNOWLEDGE = "Nhận biết",
  COMPREHENSION = "Thông hiểu",
  APPLICATION_LOW = "Vận dụng thấp",
  APPLICATION_HIGH = "Vận dụng cao"
}

export interface QuizConfig {
  level?: string;
  subject: string;
  grade: string;
  lessonName?: string;
  questionCount: number;
  bloomLevels: BloomLevel[];
  optionCount: number;
  isTrueFalse?: boolean;
  sourceText?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  questions: QuizQuestion[];
}

export type GenerationStatus = 'idle' | 'processing_file' | 'generating' | 'success' | 'error';