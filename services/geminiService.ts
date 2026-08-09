import { GoogleGenAI, Type, Schema } from "@google/genai";
import { QuizConfig, QuizQuestion, BloomLevel } from "../types";
import { extractTextFromDocx } from "../utils/fileProcessor";

// Schema definition for Structured Output is now generated dynamically

const SYSTEM_INSTRUCTION = `
Bạn là một giáo viên chuyên gia của Việt Nam, am hiểu sâu sắc Chương trình Giáo dục Phổ thông 2018 (GDPT 2018).
Nhiệm vụ của bạn là tạo ra các câu hỏi trắc nghiệm khách quan từ tài liệu được cung cấp.

YÊU CẦU BẮT BUỘC:
1. Nội dung câu hỏi phải chính xác về mặt kiến thức, phù hợp với Lớp và Môn học được yêu cầu.
2. Phân loại mức độ nhận thức (Bloom) đúng theo cấu hình.
3. Sử dụng định dạng LaTeX cho TẤT CẢ các công thức toán học, đặt trong dấu $ đơn (ví dụ: $x^2$). TUYỆT ĐỐI KHÔNG dùng $$ (hai dấu $).
4. Ngôn ngữ: Tiếng Việt chuẩn mực sư phạm.
`;

/**
 * Helper function to normalize LaTeX delimiters.
 * Ensures all math blocks use single $ delimiters for compatibility.
 * Replaces $$...$$ with $...$ strictly.
 */
const normalizeMathDelimiters = (text: string): string => {
  if (!text) return "";
  
  let cleaned = text;

  // 1. Replace all double dollars $$ with single dollar $
  // Using Global Regex is cleaner and more robust than split/join
  cleaned = cleaned.replace(/\$\$/g, '$');

  // 2. Replace \[ and \] with $
  cleaned = cleaned.replace(/\\\[/g, '$').replace(/\\\]/g, '$');

  // 3. Replace \( and \) with $
  cleaned = cleaned.replace(/\\\(/g, '$').replace(/\\\)/g, '$');

  return cleaned;
};

export const generateQuizFromContent = async (
  files: File[],
  config: QuizConfig
): Promise<QuizQuestion[]> => {
  const optionCount = config.optionCount || 4;
  const optionKeys = Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i));

  // 1. Prepare Payload
  const fileParts = await Promise.all(
    files.map(async (file) => {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const textContent = await extractTextFromDocx(file);
        return {
          text: `--- NỘI DUNG TỪ FILE WORD: ${file.name} ---\n${textContent}\n--- HẾT FILE WORD ---`
        };
      } 
      
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve({
            inlineData: {
              data: base64String,
              mimeType: file.type
            }
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })
  );

  const levels = config.bloomLevels.length > 0 ? config.bloomLevels.join(", ") : "Tổng hợp";
  const isTrueFalse = config.optionCount === 2 && config.isTrueFalse;
  const optionInstruction = isTrueFalse 
    ? `Số đáp án mỗi câu: 2 đáp án (A và B).
    ĐẶC BIỆT YÊU CẦU DẠNG ĐÚNG/SAI:
    - Nội dung câu hỏi (question_content) phải là một mệnh đề khẳng định.
    - Đáp án A bắt buộc text là "Đúng".
    - Đáp án B bắt buộc text là "Sai".
    - correct_answer là "A" nếu mệnh đề đúng, và "B" nếu mệnh đề sai.`
    : `Số đáp án mỗi câu: ${optionCount} đáp án (từ ${optionKeys[0]} đến ${optionKeys[optionKeys.length - 1]}).`;

  const lessonInfo = config.lessonName?.trim() ? `\nTÊN BÀI HỌC / CHỦ ĐỀ ÔN TẬP: "${config.lessonName.trim()}"` : '';

  const promptText = `
    Hãy tạo ${config.questionCount} câu hỏi trắc nghiệm để học sinh ôn tập.
    Môn học: ${config.subject}.
    Lớp: ${config.grade}${config.level ? ` (${config.level})` : ''}.${lessonInfo}
    Mức độ nhận thức (Bloom): ${levels}.
    ${optionInstruction}
    
    ${config.lessonName?.trim() ? `LƯU Ý: Các câu hỏi phải bám sát chương trình học và nội dung bài học "${config.lessonName.trim()}".` : ''}
    ${fileParts.length > 0 || config.sourceText ? `Hãy phân tích nội dung từ các hình ảnh/tài liệu đính kèm hoặc văn bản dưới đây để tạo câu hỏi bám sát kiến thức:` : ''}
    ${config.sourceText ? `\nĐOẠN VĂN BẢN/NỘI DUNG NGUỒN TỪ NGƯỜI DÙNG:\n${config.sourceText}\n\n` : ''}
    Trả về kết quả dưới dạng JSON thuần túy.
  `;

  // Retrieve custom API key saved by user in browser
  const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('user_gemini_api_key') || '' : '';

  // Try calling server-side API proxy route first
  try {
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promptText,
        fileParts,
        optionCount,
        isTrueFalse,
        userApiKey
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.questions)) {
        return data.questions as QuizQuestion[];
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (apiErr: any) {
    if (apiErr?.message) throw apiErr;
    console.warn("Server API generate route unavailable, attempting client SDK fallback...", apiErr);
  }

  // Fallback: Client-side GoogleGenAI
  const apiKey = userApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa có API Key. Vui lòng bấm 'Cấu hình API Key' ở thanh công cụ góc trên để nhập API Key cá nhân của bạn.");
  }

  const ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

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

  const processResponse = (responseText: string | undefined): QuizQuestion[] => {
    if (!responseText) throw new Error("Empty response");
    
    try {
        const questions = JSON.parse(responseText) as QuizQuestion[];
        
        return questions.map(q => {
            let processedOptions = q.options.map(opt => ({
                ...opt,
                text: normalizeMathDelimiters(opt.text)
            }));

            let correctAnswerKey = q.correct_answer;

            if (!isTrueFalse) {
                const optionsWithFlag = processedOptions.map(opt => ({
                    ...opt,
                    isCorrect: opt.key === q.correct_answer
                }));

                for (let i = optionsWithFlag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
                }

                processedOptions = optionsWithFlag.map((opt, index) => {
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
    } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("AI trả về định dạng không hợp lệ. Vui lòng thử lại.");
    }
  };

  const callModel = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [...fileParts, { text: promptText }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: dynamicQuizSchema,
        temperature: 0.4,
      }
    });
  };

  let lastClientError: any = null;
  for (const modelName of modelsToTry) {
    try {
      const response = await callModel(modelName);
      if (response.text) {
        return processResponse(response.text);
      }
    } catch (err: any) {
      console.warn(`Client model ${modelName} failed:`, err?.message || err);
      lastClientError = err;
    }
  }

  const rawErrStr = typeof lastClientError === 'string' ? lastClientError : (lastClientError?.message || JSON.stringify(lastClientError || {}));

  if (rawErrStr.includes('denied access') || rawErrStr.includes('PERMISSION_DENIED') || rawErrStr.includes('403')) {
    throw new Error('Dự án hoặc API Key này đã bị Google tạm khóa / từ chối quyền truy cập (Lỗi 403 Permission Denied: Your project has been denied access).\n\n👉 Cách xử lý: Vui lòng bấm vào nút "API Key: Đã lưu" ở góc trên giao diện để dán một API Key mới lấy từ Google AI Studio (bằng tài khoản Gmail khác).');
  }

  if (rawErrStr.includes('API key not valid') || rawErrStr.includes('API_KEY_INVALID') || rawErrStr.includes('400')) {
    throw new Error('API Key không hợp lệ hoặc bị dán sai ký tự.\n\n👉 Cách xử lý: Bấm nút "API Key" ở góc trên giao diện để kiểm tra và dán lại mã API Key chính xác từ Google AI Studio.');
  }

  if (rawErrStr.includes('RESOURCE_EXHAUSTED') || rawErrStr.includes('429')) {
    throw new Error('API Key này đã đạt giới hạn gọi miễn phí trong ngày của Google (429 Too Many Requests).\n\n👉 Cách xử lý: Vui lòng đổi sang một API Key của tài khoản Gmail khác hoặc thử lại sau vài phút.');
  }

  throw new Error(`Không thể tạo câu hỏi từ Gemini AI: ${rawErrStr}`);
};