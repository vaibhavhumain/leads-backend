const transporter = require('../config/mailer');

async function sendLeadNotificationEmail({ to, leadId, leadDetails, forwardedBy }) {
  let contactNumbers = 'N/A';
  if (Array.isArray(leadDetails.contacts) && leadDetails.contacts.length > 0) {
    contactNumbers = leadDetails.contacts.map(c => `${c.number} (${c.label || 'Primary'})`).join(', ');
  }

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
        <li>Client Name: ${leadDetails.clientName || '-'}</li>
        <li>Contact(s): ${contactNumbers}</li>
      </ul>
      <hr>
      <p style="color:#888;font-size:13px;">This is an automated notification generated by Gobind Coach System.</p>
      <p style="margin-top:18px">
      <b>Check On:</b>
      <a href="https://leadsmanage.netlify.app/" target="_blank" style"color:#3967cb">leadsmanage.netlify.app</a>
      </p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendLeadNotificationEmail;
