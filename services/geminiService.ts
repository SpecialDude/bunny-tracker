import { GoogleGenAI } from "@google/genai";

// Safe access to API Key
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) 
  ? process.env.API_KEY 
  : '';

// Initialize the Google GenAI SDK
const ai = new GoogleGenAI({ apiKey });

export interface AIResponse {
  text: string;
  groundingUrls?: string[];
}

/**
 * Uses gemini-3-pro-preview with Thinking capabilities for complex farm management reasoning.
 */
export const askFarmAssistant = async (
  prompt: string,
  context: string
): Promise<AIResponse> => {
  if (!apiKey) {
    return { text: "Configuration Error: Gemini API Key is missing. Please set process.env.API_KEY." };
  }

  try {
    const fullPrompt = `
      Context: You are an expert Rabbit Farm Management Consultant.
      Current Farm Context Data: ${context}
      
      User Question: ${prompt}
      
      Provide a detailed, helpful response. If calculations are needed, explain them.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 2048, 
        }
      }
    });

    return {
      text: response.text || "I couldn't generate a response at this time."
    };

  } catch (error) {
    console.error("Error calling Gemini Farm Assistant:", error);
    return { text: "Sorry, I encountered an error while thinking about your request." };
  }
};

/**
 * Uses gemini-2.5-flash with Google Search grounding for real-time market data or vet advice.
 */
export const searchWeb = async (query: string): Promise<AIResponse> => {
  if (!apiKey) {
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