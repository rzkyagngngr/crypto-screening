const wppconnect = require('@wppconnect-team/wppconnect');

let client;

const initializeClient = async () => {
  try {
    client = await wppconnect.create({
      session: 'crypto-bot', // Nama sesi
      autoClose: 60000, // Tutup otomatis setelah 60 detik idle
      puppeteerOptions: {
        headless: true, // Jalankan tanpa UI
      },
    });

    console.log('WhatsApp client connected');

    client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
    });

    return client; // Kembalikan client agar bisa digunakan di routes
  } catch (error) {
    console.error('Failed to initialize WhatsApp client:', error.message);
    throw error;
  }
};

const sendMessage = async (target, text) => {
  try {
    await client.sendText(target, text);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    throw error;
  }
};

module.exports = {
  initializeClient,
  sendMessage,
};