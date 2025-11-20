import { PolaroidPhoto } from "../types";

const getMuleRunClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. AI captions will be disabled.");
    return null;
  }
  return {
    apiKey,
    baseUrl: "https://api.mulerun.com/v1/chat/completions"
  };
};

export const generatePhotoCaption = async (base64Image: string): Promise<string> => {
  try {
    const client = getMuleRunClient();
    if (!client) {
        return "Just a moment...";
    }

    const response = await fetch(client.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.apiKey}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-image", // Using the supported MuleRun model from docs
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Write a very short, nostalgic, or witty handwritten-style caption (max 4-5 words) for this photo. Do not use quotes. If a person is in it, be complimentary. If it's an object, describe the vibe."
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 20
      })
    });

    if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "Memories...";

  } catch (error) {
    console.error("Error generating caption:", error);
    return new Date().toLocaleDateString(); // Fallback to date
  }
};
