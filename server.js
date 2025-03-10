const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const ngrok = require('ngrok');
const whatsappService = require('./services/whatsappService');
const whatsappController = require('./controllers/whatsappController');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Koneksi ke MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Inisiasi WhatsApp
    console.log('Initializing WhatsApp client...');
    const client = await whatsappService.initializeClient();

    // Listener pesan masuk
    client.onMessage(async (message) => {
      const body = message.body || '';
      const from = message.from;
      const lowerMessage = body.toLowerCase().trim();

      console.log(`Message received from ${from}: ${body}`);

      if (lowerMessage.startsWith('.screen')) {
        await whatsappController.formatScreenTop50CoinsMessage(from);
      } else if (lowerMessage.startsWith('.new')) {
        await whatsappController.formatNewCoinsPotentialMessage(from);
      } else if (body.startsWith('.')) {
        await whatsappService.sendMessage(from, 'Perintah tidak dikenali. Gunakan .screen atau .new');
      }
    });

    // Jadwal otomatis
    cron.schedule('*/30 * * * *', async () => {
      console.log('Running scheduled screenTop50Coins...');
      await whatsappController.formatScreenTop50CoinsMessage(process.env.WHATSAPP_GROUP_ID);
    });

    cron.schedule('0 3-23/6 * * *', async () => {
      console.log('Running scheduled new-coins-potential...');
      await whatsappController.formatNewCoinsPotentialMessage(process.env.WHATSAPP_GROUP_ID);
    });

    // Jalankan server HTTP
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    // Konfigurasi Ngrok
    if (process.env.NGROK_ENABLED === 'true') {
      if (!process.env.NGROK_AUTH_TOKEN) {
        throw new Error('NGROK_AUTH_TOKEN is required when NGROK_ENABLED is true');
      }

      const url = await ngrok.connect({
        proto: 'http',
        addr: port,
        authtoken: process.env.NGROK_AUTH_TOKEN,
      });

      console.log(`Ngrok tunnel active at: ${url}`);
    } else {
      console.log('Ngrok is disabled (NGROK_ENABLED=false)');
    }

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();