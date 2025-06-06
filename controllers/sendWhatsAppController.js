const twilio = require('twilio');

// 🔐 Replace with your credentials:
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

exports.sendWhatsAppImage = async (req, res) => {
  const { phone, imageUrl, clientName } = req.body;

  if (!phone || !imageUrl) {
    return res.status(400).json({ success: false, error: 'Phone number and image URL required' });
  }

  try {
    const message = await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio Sandbox Number
      to: `whatsapp:+91${phone}`,
      body: `Dear ${clientName || 'Customer'},\n\nThanks for your interest in Gobind Coach Builders. Here's your image.`,
      mediaUrl: [imageUrl], // Cloudinary image link here
    });

    res.json({ success: true, sid: message.sid });
  } catch (err) {
    console.error('Twilio WhatsApp send error:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};
