import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from './config.js';

export class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    // Updated to use gemini-1.5-flash model
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async identifyPlant(imageData) {
    try {
      const prompt = `
        You are a plant identification expert. Please analyze this image and provide:
        1. Common Name
        2. Scientific Name
        3. Plant Type
        4. Care Level
        5. Brief Description
        6. Care Tips
        
        Format the response clearly with labels for each section.
      `;
      
      // Updated image part format
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.toString("base64")
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // Add more detailed error handling
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      } else if (error.message.includes('invalid')) {
        throw new Error('Invalid image format. Please try a different image.');
      } else {
        throw new Error('Error identifying plant. Please try again.');
      }
    }
  }
}