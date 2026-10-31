const nodemailer = require('nodemailer');
const config = require('../config');

let transport = null;
if (config.SMTP.host && config.SMTP.user) {
  transport = nodemailer.createTransport({
    host: config.SMTP.host,
    port: config.SMTP.port,
    secure: config.SMTP.secure,
    auth: { user: config.SMTP.user, pass: config.SMTP.pass },
  });
}

async function notifyInquiry(inq, settings) {
  const to = settings.notify_email || settings.contact_email;
  if (!transport || !to) return false;
  const lines = [
    `New inquiry #${inq.id}`,
    '',
    `Name: ${inq.name}`,
    `Email: ${inq.email}`,
    `Company: ${inq.company || '-'}`,
    `Country: ${inq.country || '-'}`,
    `Phone/WhatsApp: ${inq.phone || '-'}`,
    `Product: ${inq.product_name || '-'}`,
    `Quantity: ${inq.quantity || '-'}`,
    `Source page: ${inq.source_page || '-'}`,
    `UTM: ${[inq.utm_source, inq.utm_medium, inq.utm_campaign].filter(Boolean).join(' / ') || '-'}`,
    '',
    inq.message,
    '',
    `Manage: ${config.SITE_URL}/admin/inquiries/${inq.id}`,
  ];
  await transport.sendMail({
    from: config.SMTP.from || config.SMTP.user,
    to,
    replyTo: inq.email,
    subject: `[Inquiry] ${inq.product_name || 'General'} - ${inq.name} (${inq.country || 'N/A'})`,
    text: lines.join('\n'),
  });
  return true;
}

module.exports = { notifyInquiry };
