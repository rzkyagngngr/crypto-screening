const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
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
    console.log('Menghubungkan ke MongoDB...');
    await mongoose.connect(
      'mongodb://rkyagung:rkyagung@crypto1-shard-00-00.5wz7y.mongodb.net:27017,crypto1-shard-00-01.5wz7y.mongodb.net:27017,crypto1-shard-00-02.5wz7y.mongodb.net:27017/cryptoDB?ssl=true&replicaSet=atlas-34xnzw-shard-0&authSource=admin&retryWrites=true&w=majority&appName=crypto1',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('Connected to MongoDB Atlas (cryptoDB)');

    console.log('Memulai inisiasi WhatsApp...');
    await whatsappService.initializeClient();
    console.log('WhatsApp initialization completed at server startup');

    app.use(express.json());
    app.use('/api', coinRoutes);
    app.use('/api', newReleasedCoinRoutes);
    app.use('/api', icoCoinRoutes);
    app.use('/api', whatsappRoutes);

    // Jadwal screenTop50Coins (setiap 30 menit) - Dari sebelumnya
    cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('Running scheduled screenTop50Coins...');
        const top50Coins = await coinService.screenTop50Coins();
        let message = '*Top 50 Coins Update* (Setiap 30 menit)\n\n';
        top50Coins
          .sort((a, b) => b.totalScreeningScore - a.totalScreeningScore)
          .slice(0, 5)
          .forEach((coin, index) => {
            message += `${index + 1}. *${coin.symbol}*\n`;
            message += `   Harga: _$${coin.indicators?.ema?.details?.currentPrice?.toLocaleString() || 'N/A'}_\n`;
            message += `   Skor: *${coin.totalScreeningScore || 0}*\n`;
            message += `   Sinyal: ${coin.signals.length > 0 ? coin.signals.map(s => `_${s}_`).join(', ') : '_Tidak ada_'}\n`;
            message += `   Volume: _${coin.volume?.toLocaleString() || 'N/A'}_\n`;
            message += `   Fluktuasi: ${coin.volumeFluctuation > 0 ? '*' : '~'}${coin.volumeFluctuation?.toFixed(2) || 'N/A'}%${coin.volumeFluctuation > 0 ? '*' : '~'}\n\n`;
          });
        message += '_Cek server untuk daftar lengkap!_';
        await whatsappService.sendMessage(process.env.WHATSAPP_GROUP_ID, message);
        console.log('screenTop50Coins message sent to WhatsApp group');
      } catch (error) {
        console.error('Error in scheduled screenTop50Coins:', error.message);
      }
    });
    console.log('Scheduled screenTop50Coins every 30 minutes');

    // Jadwal ico-potential (setiap 6 jam) - Placeholder
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('Running scheduled ico-potential...');
        const icoData = await coinService.getIcoPotential();
        let message = '*ICO Potential Update* (Setiap 6 jam)\n\n';
        message += '*(Data ICO belum diformat, tambahkan logika di sini)*';
        await whatsappService.sendMessage(process.env.WHATSAPP_GROUP_ID, message);
        console.log('ico-potential message sent to WhatsApp group');
      } catch (error) {
        console.error('Error in scheduled ico-potential:', error.message);
      }
    });
    console.log('Scheduled ico-potential every 6 hours');

    // Jadwal new-coins-potential (setiap 6 jam, offset 3 jam)
    cron.schedule('0 3-23/6 * * *', async () => {
      try {
        console.log('Running scheduled new-coins-potential...');
        const newCoinsData = await coinService.getNewCoinsPotential();
        let message = '*New Coins Potential Update* (Setiap 6 jam)\n\n';
        newCoinsData
          .sort((a, b) => parseFloat(b.potentialScore) - parseFloat(a.potentialScore)) // Urutkan berdasarkan skor
          .slice(0, 3) // Ambil 3 teratas
          .forEach((coin, index) => {
            const listingDate = new Date(coin.listingDate).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            message += `${index + 1}. *${coin.symbol}* (${coin.coin})\n`;
            message += `   Rilis: _${listingDate}_\n`;
            message += `   Volume: _$${coin.lastVolumeUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}_\n`;
            message += `   Skor Potensi: *${coin.potentialScore}*\n`;
            message += `   Rekomendasi: _${coin.recommendation}_\n\n`;
          });
        message += '_Cek semua di /new-coins-potential_';
        await whatsappService.sendMessage(process.env.WHATSAPP_GROUP_ID, message);
        console.log('new-coins-potential message sent to WhatsApp group');
      } catch (error) {
        console.error('Error in scheduled new-coins-potential:', error.message);
      }
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