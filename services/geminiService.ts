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
  inputTokens: number,
  outputTokens: number,
  sessionId: string | null, 
  agentId: string | null
) => {
  if (!sessionId || !agentId) {
    console.log("Skipping metering: Missing sessionId or agentId");
    return;
  }
  
  // Pricing logic for Gemini 2.5 Flash (per 1 Million Tokens):
  // Input: 32.5 Cents -> 0.0000325 Cents/token
  // Output: 262.5 Cents -> 0.0002625 Cents/token
  // MuleRun Unit: 0.0001 Credit (Cent) = 1 Unit
  // So:
  // Input Unit Price: 0.0000325 * 10000 = 0.325 Units/token
  // Output Unit Price: 0.0002625 * 10000 = 2.625 Units/token

  const INPUT_PRICE_PER_TOKEN = 0.325;
  const OUTPUT_PRICE_PER_TOKEN = 2.625;

  const rawCostUnits = (inputTokens * INPUT_PRICE_PER_TOKEN) + (outputTokens * OUTPUT_PRICE_PER_TOKEN);
  
  // Apply markup: (Cost / 0.6)
  const chargeableCost = Math.ceil(rawCostUnits / 0.6);

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
    console.log(`Reported metering cost: ${chargeableCost} units (Raw: ${rawCostUnits.toFixed(4)}) for ${inputTokens} in / ${outputTokens} out.`);
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
                text: `Write a unique, very short, nostalgic, or witty handwritten-style caption (max 3-5 words) for this photo. Do not use quotes. Vary the tone (funny, sentimental, mysterious). Avoid generic phrases like "Memories" or "Good times". Random seed: ${Math.random()}`
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
    console.log("MuleRun Response:", data);
    
    // Report Cost if usage info is available
    if (data.usage) {
      const inputTokens = data.usage.prompt_tokens || 0;
      const outputTokens = data.usage.completion_tokens || 0;
      await reportCost(inputTokens, outputTokens, sessionId, agentId);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
        console.warn("API returned empty content. Full response:", data);
        return "Good vibes only"; // Changed fallback to distinguish
    }
    return content;

  } catch (error) {
    console.error("Error generating caption:", error);
    return new Date().toLocaleDateString(); // Fallback to date
  }
};