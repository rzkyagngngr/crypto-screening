const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const ngrok = require('ngrok');
const coinRoutes = require('./routes/coinRoutes');
const newReleasedCoinRoutes = require('./routes/newReleasedCoinRoutes');
const icoCoinRoutes = require('./routes/icoCoinRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const whatsappController = require('./controllers/whatsappController');
const whatsappService = require('./services/whatsappService'); // Pastikan ini diimpor
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

async function sendRestartNotification(client, ngrokUrl) {
  const target = process.env.WHATSAPP_GROUP_ID; // Kirim ke grup yang ditentukan di .env
  const message = `*Server Restart Notification*\n\nServer telah direstart pada ${new Date().toLocaleString('id-ID')}.\nAkses halaman di: ${ngrokUrl || 'http://localhost:' + port}`;

  try {
    await whatsappService.sendMessage(target, message);
    console.log('Restart notification sent to WhatsApp');
  } catch (error) {
    console.error('Failed to send restart notification:', error.message);
  }
}

async function startServer() {
  try {
    console.log('Menghubungkan ke MongoDB...');
    await mongoose.connect(
      process.env.MONGO_URI,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Connected to MongoDB Atlas (cryptoDB)');

    console.log('Memulai inisiasi WhatsApp dan setup routes...');
    await whatsappRoutes.setupWhatsAppRoutes();
    console.log('WhatsApp routes setup completed');

    app.use(express.json());
    app.use('/api', coinRoutes);
    app.use('/api', newReleasedCoinRoutes);
    app.use('/api', icoCoinRoutes);

    cron.schedule('*/30 * * * *', async () => {
      console.log('Running scheduled screenTop50Coins...');
      await whatsappController.formatScreenTop50CoinsMessage(process.env.WHATSAPP_GROUP_ID);
    });
    console.log('Scheduled screenTop50Coins every 30 minutes');

    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('Running scheduled ico-potential...');
        const message = '*ICO Potential Update* (Setiap 6 jam)\n\n*(Data ICO belum diformat, tambahkan logika di sini)*';
        await whatsappService.sendMessage(process.env.WHATSAPP_GROUP_ID, message);
        console.log('ico-potential message sent to WhatsApp group');
      } catch (error) {
        console.error('Error in scheduled ico-potential:', error.message);
      }
    });
    console.log('Scheduled ico-potential every 6 hours');

    cron.schedule('0 3-23/6 * * *', async () => {
      console.log('Running scheduled new-coins-potential...');
      await whatsappController.formatNewCoinsPotentialMessage(process.env.WHATSAPP_GROUP_ID);
    });
    console.log('Scheduled new-coins-potential every 6 hours (offset 3 hours)');

    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    // Inisiasi WhatsApp client untuk notifikasi restart
    const whatsappClient = await whatsappService.initializeClient();

    // Konfigurasi Ngrok
    let ngrokUrl = null;
    if (process.env.NGROK_ENABLED === 'true') {
      if (!process.env.NGROK_AUTH_TOKEN) {
        throw new Error('NGROK_AUTH_TOKEN is required when NGROK_ENABLED is true');
      }

      ngrokUrl = await ngrok.connect({
        proto: 'http',
        addr: port,
        authtoken: process.env.NGROK_AUTH_TOKEN,
      });

      console.log(`Ngrok tunnel active at: ${ngrokUrl}`);
    } else {
      console.log('Ngrok is disabled (NGROK_ENABLED=false)');
    }

    // Kirim notifikasi restart setelah semua siap
    await sendRestartNotification(whatsappClient, ngrokUrl);

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();