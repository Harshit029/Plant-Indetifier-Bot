import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { messages } from './messageTemplates.js';
import { GeminiService } from './geminiService.js';
import { formatPlantInfo } from './formatHelper.js';

const bot = new TelegramBot(config.telegramToken, { polling: true });
const geminiService = new GeminiService();

// Welcome message
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
});

// Handle incoming photos
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1]; // Get the highest quality photo

  try {
    // Send processing message
    await bot.sendMessage(chatId, messages.processing, { parse_mode: 'Markdown' });

    // Get photo buffer
    const photoData = await bot.getFile(photo.file_id);
    const response = await fetch(`https://api.telegram.org/file/bot${config.telegramToken}/${photoData.file_path}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const photoBuffer = Buffer.from(await response.arrayBuffer());

    // Add size check
    if (photoBuffer.length > 4 * 1024 * 1024) { // 4MB limit
      throw new Error('Image size too large. Please send a smaller image.');
    }

    // Identify plant using Gemini
    const plantInfo = await geminiService.identifyPlant(photoBuffer);
    
    if (!plantInfo) {
      throw new Error('No plant information received from the API');
    }
    
    // Format and send response
    const formattedInfo = formatPlantInfo(plantInfo);
    await bot.sendMessage(chatId, formattedInfo, { 
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id 
    });
  } catch (error) {
    console.error('Error processing image:', error);
    
    // More specific error messages
    let errorMessage = messages.error;
    if (error.message.includes('quota')) {
      errorMessage = "⚠️ Service temporarily unavailable. Please try again later.";
    } else if (error.message.includes('size too large')) {
      errorMessage = "⚠️ Image is too large. Please send a smaller image (under 4MB).";
    } else if (error.message.includes('invalid')) {
      errorMessage = "⚠️ Invalid image format. Please try a different image.";
    }
    
    await bot.sendMessage(chatId, errorMessage);
  }
});

// Handle text messages
bot.on('message', (msg) => {
  if (!msg.photo) {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, messages.noImage);
  }
});

console.log('Plant Identifier Bot is running...');