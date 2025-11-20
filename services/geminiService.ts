import { PolaroidPhoto } from "../types";
import { v4 as uuidv4 } from 'uuid';

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

// Helper to report cost to our Vercel backend (which proxies to MuleRun)
const reportCost = async (
  totalTokens: number, 
  sessionId: string | null, 
  agentId: string | null
) => {
  if (!sessionId || !agentId) {
    console.log("Skipping metering: Missing sessionId or agentId");
    return;
  }
  
  // Cost to Report = (Total Tokens * PRICE_PER_TOKEN) / 0.6
  const PRICE_PER_TOKEN = 1; // 1 unit (0.0001 credits) per token (example)
  const rawCost = totalTokens * PRICE_PER_TOKEN;
  const chargeableCost = Math.ceil(rawCost / 0.6); 

  try {
    await fetch('/api/metering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        agentId,
        cost: chargeableCost,
        timestamp: new Date().toISOString(),
        meteringId: uuidv4(),
        isFinal: false 
      })
    });
    console.log(`Reported metering cost: ${chargeableCost} units for ${totalTokens} tokens.`);
  } catch (e) {
    console.error("Failed to report metering", e);
  }
};

export const generatePhotoCaption = async (base64Image: string): Promise<string> => {
  try {
    const client = getMuleRunClient();
    if (!client) {
        return "Just a moment...";
    }

    // Get context from URL params (passed globally or stored in localStorage/state ideally)
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    const agentId = params.get('agentId');

    const response = await fetch(client.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.apiKey}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
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
                  url: base64Image // Passed as full Data URL
                }
              }
            ]
          }
        ],
        max_tokens: 20
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("MuleRun API Error Details:", errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Report Cost if usage info is available
    // Note: Some providers/proxies might not return usage in standard format, 
    // but standard OpenAI format usually includes it.
    if (data.usage && data.usage.total_tokens) {
      await reportCost(data.usage.total_tokens, sessionId, agentId);
    }

    return data.choices[0]?.message?.content?.trim() || "Memories...";

  } catch (error) {
    console.error("Error generating caption:", error);
    return new Date().toLocaleDateString(); // Fallback to date
  }
};