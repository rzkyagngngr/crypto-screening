const coinService = require('../services/coinService');
const whatsappService = require('../services/whatsappService');

const formatScreenTop50CoinsMessage = async (target) => {
  try {
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
    await whatsappService.sendMessage(target, message);
    console.log('screenTop50Coins message sent to:', target);
  } catch (error) {
    console.error('Error in formatScreenTop50CoinsMessage:', error.message);
    throw error;
  }
};

const formatNewCoinsPotentialMessage = async (target) => {
  try {
    const newCoinsData = await coinService.getNewCoinsPotential();
    let message = '*New Coins Potential Update* (Setiap 6 jam)\n\n';
    newCoinsData
      .sort((a, b) => parseFloat(b.potentialScore) - parseFloat(a.potentialScore))
      .slice(0, 3)
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
    await whatsappService.sendMessage(target, message);
    console.log('new-coins-potential message sent to:', target);
  } catch (error) {
    console.error('Error in formatNewCoinsPotentialMessage:', error.message);
    throw error;
  }
};

module.exports = {
  formatScreenTop50CoinsMessage,
  formatNewCoinsPotentialMessage,
};