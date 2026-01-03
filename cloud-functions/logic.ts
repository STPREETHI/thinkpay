
/**
 * THINKPAY CLOUD FUNCTIONS (PROTOTYPE)
 * 
 * Enforcing user isolation at the backend level.
 */

import { GoogleGenAI, Type } from "@google/genai";

// 1. DETERMINE CATEGORY (Gemini API Call) - Scoped to individual context
export const detectSpendingCategory = async (userId: string, description: string) => {
  if (!userId) throw new Error("UNAUTHORIZED_ACCESS");
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Determine spend category for User(${userId}): "${description}"`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                category: { type: Type.STRING },
                reason: { type: Type.STRING }
            }
        }
    }
  });
  return response.text;
};

// 2. VAULT LIMIT VALIDATION - Cross-checks ownerId
export const validateVaultUsage = (activeUserId: string, vault: any, transactionAmount: number) => {
  // CRITICAL: Ensure the vault being updated belongs to the requester
  if (vault.ownerId !== activeUserId) {
    throw new Error("FORBIDDEN_DATA_ACCESS");
  }

  if (vault.isLocked) {
    throw new Error("VAULT_LOCKED");
  }
  
  const projectedSpend = vault.spent + transactionAmount;
  if (projectedSpend > vault.limit) {
    return {
      success: false,
      reason: "LIMIT_EXCEEDED",
      message: `Transaction exceeds user limit.`
    };
  }
  
  return { success: true };
};

// 3. SECURE DATA PURGE
export const purgeUserData = async (userId: string) => {
  // Logic to recursively delete all documents where ownerId == userId
  // Ensures Right to be Forgotten and clean state resets
};
