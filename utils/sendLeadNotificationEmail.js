const transporter = require('../config/mailer');

async function sendLeadNotificationEmail({to, leadId, leadDetails, forwardedBy}) {
  const mailOptions = {
    from: 'leadsnotify.gobindcoach@gmail.com',
    to,
    subject: 'A Lead Has Been Forwarded to You!',
    html: `
      <h2>Hi,</h2>
      <p>A new lead has been forwarded to you by <b>${forwardedBy}</b>.</p>
      <p><b>Lead Details:</b></p>
      <ul>
        <li>Lead ID: ${leadId}</li>
        <li>Client Name: ${leadDetails.clientName}</li>
        <li>Contact: ${leadDetails.phone}</li>
      </ul>
      <hr>
      <p style="color:#888;font-size:13px;">This is an automated notification. Please do not reply to this email.</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendLeadNotificationEmail;
