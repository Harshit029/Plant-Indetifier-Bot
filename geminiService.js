// Open geminiService.js and replace its content with this:
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from './config.js';

export class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
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
      this.handleError(error);
    }
  }

  async identifyDisease(imageData) {
    try {
      const prompt = `
        You are an agricultural expert specializing in plant pathology. Analyze this image and provide:
        1. Disease Name
        2. Severity Level (Low/Medium/High)
        3. Symptoms Identified
        4. Cause
        5. Treatment Solutions
        6. Preventive Measures
        7. Organic Treatment Options
        8. Chemical Treatment Options (if necessary)
        9. Expected Recovery Time
        
        Format the response clearly with labels for each section. Focus on practical, 
        farmer-friendly solutions that are both effective and economical.
      `;
      
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
      this.handleError(error);
    }
  }

  handleError(error) {
    console.error('Gemini API Error:', error);
    if (error.message.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else if (error.message.includes('invalid')) {
      throw new Error('Invalid image format. Please try a different image.');
    } else {
      throw new Error('Error processing image. Please try again.');
    }
  }
}
