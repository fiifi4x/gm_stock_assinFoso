import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'gronymultimedia@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await transporter.sendMail({
    from: '"Grony Multimedia" <gronymultimedia@gmail.com>',
    to,
    subject: 'Reset your Grony password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#1e293b">Password Reset</h2>
        <p>Hi ${name},</p>
        <p>Click the button below to reset your Grony app password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;
          background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Reset Password
        </a>
        <p style="color:#64748b;font-size:13px">If you didn't request this, ignore this email. Your password won't change.</p>
        <p style="color:#64748b;font-size:12px">Link: ${resetUrl}</p>
      </div>
    `,
  })
}
