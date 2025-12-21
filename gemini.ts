
import { GoogleGenAI } from "@google/genai";

/**
 * AI Initialization
 * process.env.API_KEY Vercel को Environment Variables बाट प्राप्त हुन्छ।
 */
export const askGemini = async (prompt: string) => {
  // नयाँ इन्स्टेन्स बनाएर सुरक्षित तरिकाले कल गर्ने
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI सँग जडान हुन सकेन। कृपया इन्टरनेट र API Key जाँच गर्नुहोस्।";
  }
};
