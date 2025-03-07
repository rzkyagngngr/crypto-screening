const wppconnect = require('@wppconnect-team/wppconnect');
const cron = require('node-cron');
require('dotenv').config();

let client;
let qrCodeData;

async function initializeClient() {
  console.log('Mulai inisialisasi WhatsApp client');
  try {
    client = await wppconnect.create({
      session: 'whatsapp-session',
      autoClose: false,
      onQRCode: (qr) => {
        qrCodeData = qr;
        console.log('Generated QR Code:', qr);
      },
      onConnected: () => {
        qrCodeData = null;
        console.log('WhatsApp client connected');
      },
      onError: (error) => {
        console.error('Error dari Wppconnect:', error.message);
      },
    });
    console.log('WhatsApp client selesai diinisialisasi');
  } catch (error) {
    console.error('Gagal inisialisasi WhatsApp client:', error.message);
    throw error;
  }
  return client;
}

async function sendMessage(groupId, content) {
  if (!client) throw new Error('WhatsApp client belum diinisialisasi');
  await client.sendText(groupId, content);
  console.log(`Message sent to ${groupId}: ${content}`);
}

async function scheduleMessage(groupId, content, schedule) {
  if (!client) throw new Error('WhatsApp client belum diinisialisasi');
  cron.schedule(schedule, async () => {
    await client.sendText(groupId, content);
    console.log(`Scheduled message sent to ${groupId}: ${content}`);
  });
  console.log(`Message scheduled for ${groupId} at ${schedule}`);
}

async function getConnectionStatus() {
  console.log('Memulai cek status koneksi WhatsApp');
  if (!client) {
    console.log('Client belum siap, menunggu inisiasi dari server start');
    return { qrCode: qrCodeData || null, status: 'Menunggu inisialisasi WhatsApp' };
  }
  const isConnected = await client.isConnected();
  console.log('Status koneksi:', isConnected ? 'Terhubung' : 'Belum terhubung');
  if (isConnected) {
    return { qrCode: null, status: 'WhatsApp sudah terhubung' };
  } else if (qrCodeData) {
    return { qrCode: qrCodeData, status: 'Menunggu koneksi WhatsApp' };
  } else {
    return { qrCode: null, status: 'Menunggu QR Code WhatsApp' };
  }
}

module.exports = { initializeClient, sendMessage, scheduleMessage, getConnectionStatus };