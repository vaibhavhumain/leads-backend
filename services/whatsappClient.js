// whatsappClient.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ✅ Use LocalAuth to store session so QR scan is needed only once
const client = new Client({
  authStrategy: new LocalAuth(), // Creates and uses a .wwebjs_auth folder
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', qr => {
  console.log('📲 Scan this QR code to connect WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp client is ready!');
});

client.on('auth_failure', msg => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', reason => {
  console.log('🔌 Client disconnected:', reason);
});

client.initialize();

// ✅ Function to send image
const sendImage = async (number, imageUrl, caption = '') => {
  const chatId = `91${number}@c.us`; // Replace 91 if country code is different
  const media = await MessageMedia.fromUrl(imageUrl);
  await client.sendMessage(chatId, media, { caption });
};

module.exports = { client, sendImage };
