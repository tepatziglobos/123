import {GoogleGenAI, Type} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface OCRResult {
  content: string;
  options?: string[];
  originalAnswer?: string;
  standardAnswer?: string;
  knowledgePoint: string;
  subject: string;
}

export interface SimilarQuestion {
  id: string;
  content: string;
  answer: string;
  explanation: string;
  commonMistakes: string;
}

export async function recognizeQuestion(base64Image: string): Promise<OCRResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this image of a wrong question. 
    1. Extract the question text.
    2. Extract options if it's a multiple choice question.
    3. Identify any handwritten original answer by the user if visible.
    4. Provide the standard correct answer.
    5. Identify the core knowledge point (e.g., "Quadratic Equation", "Present Perfect Tense").
    6. Identify the subject (e.g., "Math", "English", "Physics").
    
    Return the result in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/png" } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          originalAnswer: { type: Type.STRING },
          standardAnswer: { type: Type.STRING },
          knowledgePoint: { type: Type.STRING },
          subject: { type: Type.STRING }
        },
        required: ["content", "knowledgePoint", "subject"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateSimilarQuestions(
  originalContent: string, 
  knowledgePoint: string, 
  subject: string
): Promise<SimilarQuestion[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Based on the following original question and its knowledge point, generate 3 similar "举一反三" (learn from one example and infer the rest) questions.
    
    Original Question: ${originalContent}
    Knowledge Point: ${knowledgePoint}
    Subject: ${subject}
    
    Requirements:
    1. The questions should cover different angles or variations of the same knowledge point.
    2. Difficulty should be similar to the original.
    3. Each question must have a correct answer.
    4. Each question must have an explanation that specifically highlights common mistakes (易错点).
    
    Return the result as an array of 3 objects in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            content: { type: Type.STRING },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            commonMistakes: { type: Type.STRING }
          },
          required: ["content", "answer", "explanation", "commonMistakes"]
        }
      }
    }
  });

  const questions = JSON.parse(response.text || "[]");
  return questions.map((q: any, index: number) => ({
    ...q,
    id: q.id || `sim-${Date.now()}-${index}`
  }));
}
