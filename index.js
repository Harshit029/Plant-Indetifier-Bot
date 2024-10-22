// Open index.js and replace its content with this:
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { messages } from './messageTemplates.js';
import { GeminiService } from './geminiService.js';
import { formatPlantInfo, formatDiseaseInfo } from './formatHelper.js';
import express from 'express';
const app = express();

// Set the port from the environment variable or default to 3000
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

// Welcome message
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

    await processImage(chatId, photo.file_id, currentState);
    userStates.delete(chatId);
    
  } catch (error) {
    handleError(chatId, error);
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
      await processImage(chatId, userState.photoId, mode);
      userStates.delete(chatId);
    } else {
      bot.sendMessage(chatId, messages.invalidChoice);
    }
  } else if (!msg.photo) {
    bot.sendMessage(chatId, messages.noImage);
  }
});

async function processImage(chatId, fileId, mode) {
  await bot.sendMessage(chatId, messages.processing, { parse_mode: 'Markdown' });

  const photoData = await bot.getFile(fileId);
  const response = await fetch(
    `https://api.telegram.org/file/bot${config.telegramToken}/${photoData.file_path}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const photoBuffer = Buffer.from(await response.arrayBuffer());

  if (photoBuffer.length > 4 * 1024 * 1024) {
    throw new Error('Image size too large. Please send a smaller image.');
  }

  let result;
  if (mode === 'identify') {
    result = await geminiService.identifyPlant(photoBuffer);
    result = formatPlantInfo(result);
  } else if (mode === 'disease') {
    result = await geminiService.identifyDisease(photoBuffer);
    result = formatDiseaseInfo(result);
  }

  if (!result) {
    throw new Error('No information received from the API');
  }

  await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
}

function handleError(chatId, error) {
  console.error('Error processing image:', error);
  
  let errorMessage = messages.error;
  if (error.message.includes('quota')) {
    errorMessage = messages.quotaExceeded;
  } else if (error.message.includes('size too large')) {
    errorMessage = messages.imageTooLarge;
  } else if (error.message.includes('invalid')) {
    errorMessage = messages.invalidFormat;
  }
  
  bot.sendMessage(chatId, errorMessage);
}

console.log('Enhanced Plant Identifier Bot is running...');
