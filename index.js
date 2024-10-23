// Open index.js and update the message handlers:
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
  // Send welcome message after command
  setTimeout(() => {
    bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
  }, 1000);
});

bot.onText(/\/disease/, (msg) => {
  const chatId = msg.chat.id;
  userStates.set(chatId, 'disease');
  bot.sendMessage(chatId, "Send me a photo of the plant you'd like to diagnose!");
  // Send welcome message after command
  setTimeout(() => {
    bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
  }, 1000);
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
    
    // Send welcome message after processing
    setTimeout(() => {
      bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
    }, 1000);
    
  } catch (error) {
    handleError(chatId, error);
    // Send welcome message after error
    setTimeout(() => {
      bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
    }, 1000);
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
      // Send welcome message after processing
      setTimeout(() => {
        bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
      }, 1000);
    } else {
      bot.sendMessage(chatId, messages.invalidChoice);
      // Send welcome message after invalid choice
      setTimeout(() => {
        bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
      }, 1000);
    }
  } else if (!msg.photo && !msg.text.startsWith('/')) {
    bot.sendMessage(chatId, messages.noImage);
    // Send welcome message for text messages
    setTimeout(() => {
      bot.sendMessage(chatId, messages.welcome, { parse_mode: 'Markdown' });
    }, 1000);
  }
});
