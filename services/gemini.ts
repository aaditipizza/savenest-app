
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getSmartSuggestions = async (totalSavings: number, goals: string[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User has saved ₹${totalSavings}. Their goals are: ${goals.join(", ")}. 
      Provide 3 short, catchy, and encouraging saving tips for a Gen Z user. 
      Format as a JSON array of strings. Keep them under 15 words each.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini suggestion error:", error);
    return [
      "Skip that extra coffee today and watch your pig grow! ☕",
      "Small drops make a mighty ocean. Keep saving! ✨",
      "Your dream goal is closer than you think. Stay consistent! 🔥"
    ];
  }
};
