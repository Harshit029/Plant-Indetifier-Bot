// Open messageTemplates.js and update the welcome message:
export const messages = {
  welcome: `🌿 *Welcome to Plantiya Bot!*\n\nI can help you:\n1. Identify plants\n2. Diagnose plant diseases\n\nUse these commands:\n/identify - Identify a plant\n/disease - Check for plant diseases\n\nOr simply send a photo and I'll ask what you'd like to know!`,
  processing: "🔍 Analyzing your image...",
  error: "❌ Sorry, I couldn't process that image. Please try sending another clear photo.",
  noImage: "Please send me a photo of a plant to analyze!",
  quotaExceeded: "⚠️ Service temporarily unavailable. Please try again later.",
  imageTooLarge: "⚠️ Image is too large. Please send a smaller image (under 4MB).",
  invalidFormat: "⚠️ Invalid image format. Please try a different image.",
  askMode: "What would you like to know about this plant?\n\n1. 🌿 Plant Identification\n2. 🔬 Disease Diagnosis",
  invalidChoice: "Please select either 1 for Plant Identification or 2 for Disease Diagnosis."
};
