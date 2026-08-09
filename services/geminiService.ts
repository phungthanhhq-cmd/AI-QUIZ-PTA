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
  // 1. Initialize Client
  
  // Use the built-in environment API Key immediately
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Lỗi hệ thống: Không tìm thấy API Key mặc định.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const optionCount = config.optionCount || 4;
  const optionKeys = Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i)); // A, B, C, D...

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

  // 2. Prepare Payload
  // Map files to either inlineData (Images/PDF) or text parts (DOCX)
  const fileParts = await Promise.all(
    files.map(async (file) => {
      // DOCX Handling: Extract Text
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const textContent = await extractTextFromDocx(file);
        return {
          text: `--- NỘI DUNG TỪ FILE WORD: ${file.name} ---\n${textContent}\n--- HẾT FILE WORD ---`
        };
      } 
      
      // Image/PDF Handling: Base64
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

  // Construct Prompt
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

  // 3. Define Models (Primary & Fallback)
  const primaryModel = 'gemini-3-pro-preview';
  const fallbackModel = 'gemini-3-flash-preview';

  const processResponse = (responseText: string | undefined): QuizQuestion[] => {
    if (!responseText) throw new Error("Empty response");
    
    try {
        const questions = JSON.parse(responseText) as QuizQuestion[];
        
        return questions.map(q => {
            // 1. Normalize math delimiters
            let processedOptions = q.options.map(opt => ({
                ...opt,
                text: normalizeMathDelimiters(opt.text)
            }));

            let correctAnswerKey = q.correct_answer;

            // 2. Shuffle options if NOT True/False to prevent "Always A" bias from LLM
            if (!isTrueFalse) {
                // Mark the correct option before shuffling
                const optionsWithFlag = processedOptions.map(opt => ({
                    ...opt,
                    isCorrect: opt.key === q.correct_answer
                }));

                // Fisher-Yates shuffle
                for (let i = optionsWithFlag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
                }

                // Re-assign keys (A, B, C, D...) and find the new key for the correct answer
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
    console.log(`Attempting generation with model: ${modelName}`);
    return await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [...fileParts, { text: promptText }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: dynamicQuizSchema,
        temperature: 0.4, // Lower temperature for more academic accuracy
      }
    });
  };

  try {
    // Attempt Primary
    try {
      const response = await callModel(primaryModel);
      return processResponse(response.text);
    } catch (primaryError) {
      console.warn(`Primary model (${primaryModel}) failed, retrying with fallback...`, primaryError);
      // Fallback
      const fallbackResponse = await callModel(fallbackModel);
      return processResponse(fallbackResponse.text);
    }
  } catch (finalError) {
    console.error("Gemini Generation Failed:", finalError);
    throw new Error("Không thể tạo câu hỏi. Vui lòng kiểm tra lại tài liệu nguồn.");
  }
};