// Email Service with Nodemailer
import nodemailer from 'nodemailer';
import { getDb, COLLECTIONS } from '@/lib/db/mongodb';
import crypto from 'crypto';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// App configuration
const APP_NAME = process.env.APP_NAME || 'StudyPlanner';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@studyplanner.com';

// Generate a secure token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email templates
const emailTemplates = {
  verification: (name: string, verificationUrl: string) => ({
    subject: `Verify your email - ${APP_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📚 ${APP_NAME}</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px; font-size: 24px;">Welcome, ${name}! 🎉</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Thank you for signing up for ${APP_NAME}. To get started and unlock all features, please verify your email address by clicking the button below.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                      This link will expire in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  welcome: (name: string) => ({
    subject: `Welcome to ${APP_NAME} - Account Verified! 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Email Verified!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px;">You're all set, ${name}! 🚀</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Your account has been successfully verified. You now have full access to all ${APP_NAME} features.
                    </p>
                    <h3 style="color: #1f2937; margin: 20px 0 10px;">Here's what you can do:</h3>
                    <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                      <li>📅 Create study plans and schedules</li>
                      <li>✅ Track tasks and assignments</li>
                      <li>⏱️ Use the Pomodoro timer</li>
                      <li>🃏 Create flashcard decks</li>
                      <li>📊 View your analytics</li>
                    </ul>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600;">
                            Go to Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  passwordReset: (name: string, resetUrl: string) => ({
    subject: `Reset your password - ${APP_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px;">Hi ${name},</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      We received a request to reset your password. Click the button below to create a new password.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                      This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                      <p style="color: #92400e; font-size: 14px; margin: 0;">
                        <strong>Security tip:</strong> Never share your password with anyone. ${APP_NAME} will never ask for your password via email.
                      </p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      If the button doesn't work, copy and paste this link:<br>
                      <a href="${resetUrl}" style="color: #f59e0b; word-break: break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  passwordChanged: (name: string) => ({
    subject: `Password changed successfully - ${APP_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Password Changed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px;">Hi ${name},</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Your password has been successfully changed. You can now log in with your new password.
                    </p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                      <p style="color: #991b1b; font-size: 14px; margin: 0;">
                        <strong>Didn't make this change?</strong> If you didn't change your password, your account may be compromised. Please <a href="${APP_URL}/forgot-password" style="color: #ef4444;">reset your password</a> immediately.
                      </p>
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <a href="${APP_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600;">
                            Log In Now
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),
};

// Send verification email
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  const template = emailTemplates.verification(name, verificationUrl);

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

// Send welcome email after verification
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  const template = emailTemplates.welcome(name);

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const template = emailTemplates.passwordReset(name, resetUrl);

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

// Send password changed confirmation email
export async function sendPasswordChangedEmail(
  email: string,
  name: string
): Promise<boolean> {
  const template = emailTemplates.passwordChanged(name);

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    return true;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    return false;
  }
}

// Store verification token in database
export async function storeVerificationToken(
  userId: string,
  token: string,
  expiresIn: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.VERIFICATION_TOKENS).updateOne(
    { userId },
    {
      $set: {
        token,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + expiresIn),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Store password reset token in database
export async function storePasswordResetToken(
  userId: string,
  token: string,
  expiresIn: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.VERIFICATION_TOKENS).updateOne(
    { userId, type: 'password_reset' },
    {
      $set: {
        token,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + expiresIn),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Verify token from database
export async function verifyToken(
  token: string,
  type: 'email_verification' | 'password_reset'
): Promise<{ valid: boolean; userId?: string }> {
  const db = await getDb();
  const tokenDoc = await db.collection(COLLECTIONS.VERIFICATION_TOKENS).findOne({
    token,
    type,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    return { valid: false };
  }

  return { valid: true, userId: tokenDoc.userId };
}

// Delete token after use
export async function deleteToken(token: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.VERIFICATION_TOKENS).deleteOne({ token });
}
