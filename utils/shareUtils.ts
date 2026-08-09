import { QuizQuestion } from '../types';
import LZString from 'lz-string';

export interface SharedQuizPackage {
  title: string;
  questions: QuizQuestion[];
  subject?: string;
  grade?: string;
  isSharedLink?: boolean;
}

// Compact minified question format to keep URLs small as fallback
interface CompactOption {
  k: string;
  t: string;
}

interface CompactQuestion {
  i: number;
  q: string;
  o: CompactOption[];
  a: string;
  l?: string;
  e?: string;
}

interface CompactQuizPackage {
  t: string;
  s?: string;
  g?: string;
  q: CompactQuestion[];
}

/**
 * Creates a ultra-short URL via backend API (/api/share)
 */
export async function createShortQuizUrl(
  title: string,
  questions: QuizQuestion[],
  subject?: string,
  grade?: string
): Promise<string> {
  // Always use the current window origin & path with compressed hash parameters
  // This guarantees 100% compatibility across all browsers, mobile devices, and computers
  // without needing external database servers or hitting 404/403 domain errors.
  return encodeQuizToUrlFallback(title, questions, subject, grade);
}

function encodeQuizToUrlFallback(
  title: string,
  questions: QuizQuestion[],
  subject?: string,
  grade?: string
): string {
  try {
    const compact: CompactQuizPackage = {
      t: title,
      s: subject,
      g: grade,
      q: questions.map(q => ({
        i: q.id,
        q: q.question_content,
        o: q.options.map(opt => ({ k: opt.key, t: opt.text })),
        a: q.correct_answer,
        l: q.level,
        e: q.explanation
      }))
    };

    const jsonStr = JSON.stringify(compact);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    
    // Use window.location.origin + window.location.pathname
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#quiz=${compressed}`;
  } catch (err) {
    console.error("Failed to encode quiz fallback URL", err);
    return "";
  }
}

/**
 * Decodes quiz package from current URL (supports short code, compressed hash, search params)
 */
export async function decodeQuizFromUrl(): Promise<SharedQuizPackage | null> {
  try {
    const hash = window.location.hash;
    const search = window.location.search;

    let shortCode = '';
    
    // Check #q=CODE or ?q=CODE
    if (hash.includes('q=')) {
      shortCode = hash.split('q=')[1]?.split('&')[0];
    } else if (search.includes('q=')) {
      const urlParams = new URLSearchParams(search);
      shortCode = urlParams.get('q') || '';
    }

    if (shortCode) {
      try {
        const res = await fetch(`/api/share/${shortCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.questions)) {
            return {
              title: data.title,
              questions: data.questions,
              subject: data.subject,
              grade: data.grade,
              isSharedLink: true
            };
          }
        }
      } catch (err) {
        console.error("Failed to fetch shared quiz by code", err);
      }
    }

    // Fallback check #quiz=COMPRESSED_DATA
    let rawParam = '';
    if (hash.includes('quiz=')) {
      rawParam = hash.split('quiz=')[1]?.split('&')[0];
    } else if (search.includes('quiz=')) {
      const urlParams = new URLSearchParams(search);
      rawParam = urlParams.get('quiz') || '';
    }

    if (!rawParam) return null;

    let jsonStr = '';
    const decompressed = LZString.decompressFromEncodedURIComponent(rawParam);
    if (decompressed) {
      jsonStr = decompressed;
    } else {
      const base64 = decodeURIComponent(rawParam);
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonStr = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed && Array.isArray(parsed.q)) {
      const compact = parsed as CompactQuizPackage;
      return {
        title: compact.t,
        subject: compact.s,
        grade: compact.g,
        isSharedLink: true,
        questions: compact.q.map(cq => ({
          id: cq.i,
          question_content: cq.q,
          options: cq.o.map(co => ({ key: co.k, text: co.t })),
          correct_answer: cq.a,
          level: cq.l || 'Nhận biết',
          explanation: cq.e
        }))
      };
    }

    if (parsed && Array.isArray(parsed.questions)) {
      return {
        ...parsed,
        isSharedLink: true
      } as SharedQuizPackage;
    }

    return null;
  } catch (err) {
    console.error('Failed to decode quiz from URL', err);
    return null;
  }
}
