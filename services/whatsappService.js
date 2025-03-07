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

    return client; // Kembalikan client untuk digunakan di routes
  } catch (error) {
    console.error('Failed to initialize WhatsApp client:', error.message);
    throw error;
  }
};

const sendMessage = async (target, text) => {
  try {
    if (!client) throw new Error('WhatsApp client not initialized');
    await client.sendText(target, text);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    throw error;
  }
};

const getClient = () => {
  if (!client) throw new Error('WhatsApp client not initialized');
  return client;
};

module.exports = {
  initializeClient,
  sendMessage,
  getClient, // Tambahkan ini untuk akses client di routes
};