const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');
const coinRoutes = require('./routes/coinRoutes');
const newReleasedCoinRoutes = require('./routes/newReleasedCoinRoutes');
const icoCoinRoutes = require('./routes/icoCoinRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const coinService = require('./services/coinService');
const whatsappService = require('./services/whatsappService');
require('dotenv').config();

const app = express();
const port = 3000;

async function startServer() {
  try {
    // Tunggu koneksi MongoDB
    await mongoose.connect(
      'mongodb://rkyagung:rkyagung@crypto1-shard-00-00.5wz7y.mongodb.net:27017,crypto1-shard-00-01.5wz7y.mongodb.net:27017,crypto1-shard-00-02.5wz7y.mongodb.net:27017/cryptoDB?ssl=true&replicaSet=atlas-34xnzw-shard-0&authSource=admin&retryWrites=true&w=majority&appName=crypto1',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Connected to MongoDB Atlas (cryptoDB)');

    // Tunggu inisiasi WhatsApp
    await whatsappService.initializeClient();
    console.log('WhatsApp initialization completed at server startup');

    // Lanjutkan setup server
    app.use(express.json());
    app.use('/api', coinRoutes);
    app.use('/api', newReleasedCoinRoutes);
    app.use('/api', icoCoinRoutes);
    app.use('/api', whatsappRoutes);

    app.use((req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-eval'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
      );
      next();
    });

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    app.get('/validate-whatsapp', async (req, res) => {
      try {
        console.log('Request ke /validate-whatsapp diterima');
        const { qrCode, status } = await whatsappService.getConnectionStatus();
        console.log('Menyiapkan render - QR Code:', qrCode, 'Status:', status);
        res.render('validate-whatsapp', { qrCode, status });
        console.log('Render selesai dikirim ke browser');
      } catch (error) {
        console.error('Error di /validate-whatsapp:', error.message);
        res.send('Error: Tidak bisa memuat halaman WhatsApp - ' + error.message);
      }
    });

    const cronInterval = parseInt(process.env.CRON_JOB_INTERVAL, 10) || 0;
    if (cronInterval > 0) {
      cron.schedule(`*/${cronInterval} * * * *`, async () => {
        try {
          console.log('Running scheduled screening...');
          await coinService.screenTop50Coins();
          console.log('Screening completed.');
        } catch (error) {
          console.error('Error in scheduled screening:', error.message);
        }
      });
      console.log(`Cron job scheduled every ${cronInterval} minutes`);
    } else {
      console.log('Cron job disabled (interval set to 0)');
    }

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
  }
}

startServer();