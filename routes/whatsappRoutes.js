const whatsappService = require('../services/whatsappService');
const whatsappController = require('../controllers/whatsappController');

const setupWhatsAppRoutes = async () => {
  try {
    const client = await whatsappService.initializeClient();

    // Mendengarkan pesan masuk menggunakan onMessage
    client.onMessage(async (message) => {
      try {
        const body = message.body || ''; // Isi pesan
        const from = message.from; // Nomor pengirim
        const lowerMessage = body.toLowerCase().trim();

        console.log(`Message received from ${from}: ${body}`);

        if (lowerMessage.startsWith('.screen')) {
          await whatsappController.formatScreenTop50CoinsMessage(from);
        } else if (lowerMessage.startsWith('.new')) {
          await whatsappController.formatNewCoinsPotentialMessage(from);
        } else if (body.startsWith('.')) {
          await whatsappService.sendMessage(from, 'Perintah tidak dikenali. Gunakan .screen atau .new');
        }
      } catch (error) {
        console.error('Error handling WhatsApp message:', error.message);
        await whatsappService.sendMessage(from, 'Terjadi kesalahan, coba lagi nanti.');
      }
    });

    console.log('WhatsApp message listener set up');
  } catch (error) {
    console.error('Error setting up WhatsApp routes:', error.message);
    throw error;
  }
};

module.exports = {
  setupWhatsAppRoutes,
};