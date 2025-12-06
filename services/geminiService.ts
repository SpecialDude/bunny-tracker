
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI SDK
// The API key is obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIResponse {
  text: string;
  groundingUrls?: string[];
}

/**
 * Uses gemini-2.5-flash for fast, cost-effective farm assistance.
 * It receives a constructed context of the farm's current state.
 */
export const askFarmAssistant = async (
  prompt: string,
  context: string
): Promise<AIResponse> => {
  if (!process.env.API_KEY) {
    return { text: "Configuration Error: Gemini API Key is missing. Please set process.env.API_KEY." };
  }

  try {
    const fullPrompt = `
      SYSTEM INSTRUCTION:
      You are an expert Rabbit Farm Management Consultant for "BunnyTrack".
      
      CURRENT FARM DATA (Real-time Snapshot):
      ${context}
      
      USER QUESTION:
      ${prompt}
      
      GUIDELINES:
      1. Use the "Current Farm Data" provided above to answer specific questions.
      2. If asking about deliveries, check the "Upcoming Deliveries" section.
      3. If asking about weaning, check the "Weaning Candidates" section.
      4. If asking about finances, use the calculated totals provided.
      5. Keep answers concise, professional, and helpful.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      // No thinkingConfig needed for Flash, it is fast by default.
    });

    return {
      text: response.text || "I couldn't generate a response at this time."
    };

  } catch (error) {
    console.error("Error calling Gemini Farm Assistant:", error);
    return { text: "Sorry, I encountered an error while analyzing your farm data." };
  }
};

/**
 * Uses gemini-2.5-flash with Google Search grounding for real-time market data or vet advice.
 */
export const searchWeb = async (query: string): Promise<AIResponse> => {
  if (!process.env.API_KEY) {
    return { text: "Configuration Error: Gemini API Key is missing." };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const urls: string[] = [];

    groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
            urls.push(chunk.web.uri);
        }
    });

    return {
      text: response.text || "No results found.",
      groundingUrls: Array.from(new Set(urls))
    };

  } catch (error) {
    console.error("Error calling Gemini Search:", error);
    return { text: "Sorry, I encountered an error searching the web." };
  }
};