const wppconnect = require('@wppconnect-team/wppconnect');

let client;

const initializeClient = async () => {
  try {
    client = await wppconnect.create({
      session: 'crypto-bot',
      autoClose: 60000,
      puppeteerOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Penting untuk lingkungan server
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Gunakan env jika ada
      },
    });

    console.log('WhatsApp client connected');

    return client;
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
  getClient,
};