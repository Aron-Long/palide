import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI captions will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePhotoCaption = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAIClient();
    if (!ai) {
        return "Just a moment..."; // Fallback if no API key
    }

    // Remove the data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: "Write a very short, nostalgic, or witty handwritten-style caption (max 4-5 words) for this photo. Do not use quotes. If a person is in it, be complimentary. If it's an object, describe the vibe.",
          },
        ],
      },
    });

    return response.text?.trim() || "Memories...";
  } catch (error) {
    console.error("Error generating caption:", error);
    return new Date().toLocaleDateString(); // Fallback to date
  }
};
