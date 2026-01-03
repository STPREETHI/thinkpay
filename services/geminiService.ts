
import { GoogleGenAI, Type } from "@google/genai";
import { VaultType, AICategorization, Transaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const detectCategory = async (description: string, amount: number): Promise<AICategorization> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize this spending: "${description}" for amount ${amount}. Choose from: Lifestyle, Food, Emergency, Business, Bills.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            suggestedVault: { type: Type.STRING },
            explanation: { type: Type.STRING, description: "Human-readable reason why this vault was chosen" }
          },
          required: ["category", "confidence", "suggestedVault", "explanation"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      category: result.category,
      confidence: result.confidence,
      suggestedVault: result.suggestedVault as VaultType,
      explanation: result.explanation
    };
  } catch (error) {
    console.error("Gemini detection error:", error);
    return {
      category: "Uncategorized",
      confidence: 0,
      suggestedVault: VaultType.LIFESTYLE,
      explanation: "Unable to process AI categorization at this time."
    };
  }
};

export const getMonthlyInsights = async (transactions: Transaction[], vaults: any[]) => {
  try {
    const historyText = transactions.slice(0, 15).map(t => `${t.merchant}: ₹${t.amount}`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these transactions: [${historyText}]. Based on vault usage: ${JSON.stringify(vaults)}. Provide 3 smart financial tips and a summary of the spending habits.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            savingsPotential: { type: Type.STRING }
          },
          required: ["tips", "summary", "savingsPotential"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { tips: ["Monitor your daily coffee spend.", "Try setting lower lifestyle limits."], summary: "Keep tracking for better insights.", savingsPotential: "₹0" };
  }
};
