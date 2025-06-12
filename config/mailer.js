const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'leadsnotify.gobindcoach@gmail.com',
    pass: 'vcba zrjm wqpp mcnc',
  },
});

module.exports = transporter;
