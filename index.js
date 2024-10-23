// index.js
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { config } from './config.js';
import { messages } from './messageTemplates.js';
import { GeminiService } from './geminiService.js';
import { formatPlantInfo, formatDiseaseInfo } from './formatHelper.js';

// Express server setup
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Plant Identifier Bot is running...');
});

app.listen(port, () => {
  console.log(`Plant Identifier Bot is running on port ${port}`);
});

const bot = new TelegramBot(config.telegramToken, { polling: true });
const geminiService = new GeminiService();

// Store user states
const userStates = new Map();

// Welcome message for /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
});

// Set mode commands
bot.onText(/\/identify/, (msg) => {
  const chatId = msg.chat.id;
  userStates.set(chatId, 'identify');
  bot.sendMessage(chatId, "Send me a photo of the plant you'd like to identify!");
});

bot.onText(/\/disease/, (msg) => {
  const chatId = msg.chat.id;
  userStates.set(chatId, 'disease');
  bot.sendMessage(chatId, "Send me a photo of the plant you'd like to diagnose!");
});

// Handle incoming photos
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photo = msg.photo[msg.photo.length - 1];

  try {
    const currentState = userStates.get(chatId);
    
    // If no state is set, ask user what they want to know
    if (!currentState) {
      userStates.set(chatId, { 
        pending: true,
        photoId: photo.file_id
      });
      
      return bot.sendMessage(chatId, messages.askMode, {
        reply_markup: {
          keyboard: [['1. 🌿 Plant Identification', '2. 🔬 Disease Diagnosis']],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });
    }

    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, messages.processing, { parse_mode: 'Markdown' });

    // Get photo buffer
    const photoData = await bot.getFile(photo.file_id);
    const response = await fetch(`https://api.telegram.org/file/bot${config.telegramToken}/${photoData.file_path}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const photoBuffer = Buffer.from(await response.arrayBuffer());

    // Add size check
    if (photoBuffer.length > 4 * 1024 * 1024) {
      throw new Error('Image size too large');
    }

    // Process based on mode
    let result, formattedResult;
    if (currentState === 'identify') {
      result = await geminiService.identifyPlant(photoBuffer);
      formattedResult = formatPlantInfo(result);
    } else {
      result = await geminiService.diagnosePlant(photoBuffer);
      formattedResult = formatDiseaseInfo(result);
    }

    // Delete processing message and send result
    await bot.deleteMessage(chatId, processingMsg.message_id);
    await bot.sendMessage(chatId, formattedResult, {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });

    // Clear user state
    userStates.delete(chatId);

  } catch (error) {
    console.error('Error processing image:', error);
    
    let errorMessage = messages.error;
    if (error.message.includes('quota')) {
      errorMessage = messages.quotaExceeded;
    } else if (error.message.includes('size too large')) {
      errorMessage = messages.imageTooLarge;
    } else if (error.message.includes('invalid')) {
      errorMessage = messages.invalidFormat;
    }
    
    await bot.sendMessage(chatId, errorMessage);
    userStates.delete(chatId);
  }
});

// Handle user choice for pending photos
bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  const userState = userStates.get(chatId);

  if (userState?.pending && userState.photoId) {
    const choice = msg.text.charAt(0);
    
    if (choice === '1' || choice === '2') {
      const mode = choice === '1' ? 'identify' : 'disease';
      userStates.set(chatId, mode);
      
      // Simulate photo message to reuse photo handling logic
      await bot.emit('photo', {
        chat: { id: chatId },
        photo: [{ file_id: userState.photoId }],
        message_id: msg.message_id
      });
    } else {
      bot.sendMessage(chatId, messages.invalidChoice);
    }
  } else if (!msg.text.startsWith('/')) {
    bot.sendMessage(chatId, messages.noImage);
  }
});
