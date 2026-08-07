import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a password reset email with a token link.
 * @param {string} toEmail - The recipient's email address
 * @param {string} token - The secure reset token
 */
export async function sendPasswordResetEmail(toEmail, token) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set. Skipping email send.');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"SISF System" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'SISF - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto;">
        <h2 style="color: #10b981;">Password Reset Request</h2>
        <p>We received a request to reset your password for your SISF account.</p>
        <p>Click the button below to reset your password. This link is valid for <strong>30 minutes</strong>.</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold;">Reset Password</a>
        <p style="color: #666;">If you did not request this, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">&copy; SISF Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Password reset email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[Email] Error sending email:', error.message);
    throw error;
  }
}

