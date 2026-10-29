import nodemailer from 'nodemailer';

let transporter;
const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Returns true if the email was sent, false if email is not set up or failed (never throws)
export async function sendCredentials({ to, name, password }) {
  if (!isConfigured()) return false;
  const loginUrl = `${(process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')}/login`;
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: 'Your Team Task Manager account',
      text: `Hi ${name},\n\nYour account has been created.\n\nLogin: ${loginUrl}\nEmail: ${to}\nPassword: ${password}\n\nPlease keep this password private.`,
      html: `<p>Hi ${esc(name)},</p><p>Your account has been created.</p>
             <p><b>Login:</b> <a href="${esc(loginUrl)}">${esc(loginUrl)}</a><br>
             <b>Email:</b> ${esc(to)}<br><b>Password:</b> <code>${esc(password)}</code></p>
             <p>Please keep this password private.</p>`,
    });
    return true;
  } catch (err) {
    console.error('Email failed:', err.message); // password is never logged
    return false;
  }
}