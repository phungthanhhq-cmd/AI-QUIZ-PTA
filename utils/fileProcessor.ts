import mammoth from 'mammoth';

/**
 * Converts a File object to a Base64 string suitable for Gemini API.
 */
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extracts raw text from a DOCX file.
 */
export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error(`Không thể đọc file Word: ${file.name}`);
  }
};

/**
 * Validates if the file type is supported.
 */
export const isSupportedFile = (file: File): boolean => {
  const supportedTypes = [
    'image/png', 
    'image/jpeg', 
    'image/webp', 
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
  ];
  return supportedTypes.includes(file.type);
};

export const getFileIconName = (fileName: string): string => {
  if (fileName.endsWith('.pdf')) return 'file-text';
  if (fileName.match(/\.(jpg|jpeg|png|webp)$/)) return 'image';
  if (fileName.match(/\.(doc|docx)$/)) return 'file-type-2';
  return 'file';
};