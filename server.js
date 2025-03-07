const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const coinRoutes = require('./routes/coinRoutes');
const newReleasedCoinRoutes = require('./routes/newReleasedCoinRoutes');
const icoCoinRoutes = require('./routes/icoCoinRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const whatsappController = require('./controllers/whatsappController');
require('dotenv').config();

const app = express();
const port = 3000;

async function startServer() {
  try {
    console.log('Menghubungkan ke MongoDB...');
    await mongoose.connect(
      'mongodb://rkyagung:rkyagung@crypto1-shard-00-00.5wz7y.mongodb.net:27017,crypto1-shard-00-01.5wz7y.mongodb.net:27017,crypto1-shard-00-02.5wz7y.mongodb.net:27017/cryptoDB?ssl=true&replicaSet=atlas-34xnzw-shard-0&authSource=admin&retryWrites=true&w=majority&appName=crypto1',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Connected to MongoDB Atlas (cryptoDB)');

    console.log('Memulai inisiasi WhatsApp dan setup routes...');
    await whatsappRoutes.setupWhatsAppRoutes(); // Panggil setup routes
    console.log('WhatsApp routes setup completed');

    app.use(express.json());
    app.use('/api', coinRoutes);
    app.use('/api', newReleasedCoinRoutes);
    app.use('/api', icoCoinRoutes);

    // Jadwal screenTop50Coins (setiap 30 menit)
    cron.schedule('*/30 * * * *', async () => {
      console.log('Running scheduled screenTop50Coins...');
      await whatsappController.formatScreenTop50CoinsMessage(process.env.WHATSAPP_GROUP_ID);
    });
    console.log('Scheduled screenTop50Coins every 30 minutes');

    // Jadwal ico-potential (setiap 6 jam) - Placeholder
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

    // Jadwal new-coins-potential (setiap 6 jam, offset 3 jam)
    cron.schedule('0 3-23/6 * * *', async () => {
      console.log('Running scheduled new-coins-potential...');
      await whatsappController.formatNewCoinsPotentialMessage(process.env.WHATSAPP_GROUP_ID);
    });
    console.log('Scheduled new-coins-potential every 6 hours (offset 3 hours)');

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();