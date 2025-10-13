import nodemailer from "nodemailer";
import type { Exam } from "@shared/schema";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@wokkahcbt.com";

// Create transporter only if SMTP credentials are provided
let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  console.log(`[SMTP] Configuring with host: ${SMTP_HOST}, port: ${SMTP_PORT}, from: ${SMTP_FROM_EMAIL}`);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
} else {
  console.warn("[SMTP] Missing configuration:", {
    hasHost: !!SMTP_HOST,
    hasUser: !!SMTP_USER,
    hasPassword: !!SMTP_PASSWORD,
  });
}

export async function sendInvitationEmail(
  email: string,
  invitationToken: string,
  exam?: Exam
): Promise<boolean> {
  if (!transporter) {
    console.warn("SMTP not configured. Email would be sent to:", email);
    console.log("Invitation link:", getInvitationLink(invitationToken));
    return false;
  }

  const invitationLink = getInvitationLink(invitationToken);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .exam-info {
            background: white;
            padding: 15px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to WokkahCBT</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been invited to take an exam on WokkahCBT${exam ? `: <strong>${exam.title}</strong>` : ""}.</p>
          
          ${exam ? `
          <div class="exam-info">
            <h3>Exam Details</h3>
            <p><strong>Title:</strong> ${exam.title}</p>
            ${exam.description ? `<p><strong>Description:</strong> ${exam.description}</p>` : ""}
            <p><strong>Duration:</strong> ${exam.duration} minutes</p>
            <p><strong>Questions:</strong> ${exam.questionCount}</p>
          </div>
          ` : ""}
          
          <p>To get started, please click the button below to set up your password:</p>
          
          <a href="${invitationLink}" class="button">Set Up Your Password</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${invitationLink}</p>
          
          <p><strong>Important:</strong> This link will expire once used. After setting up your password, you'll be able to log in and access your assigned exams.</p>
          
          <div class="footer">
            <p>If you didn't request this invitation, please ignore this email.</p>
            <p>© ${new Date().getFullYear()} WokkahCBT. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM_EMAIL,
      to: email,
      subject: exam ? `Invitation to ${exam.title}` : "Welcome to WokkahCBT",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return false;
  }
}

function getInvitationLink(token: string): string {
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  return `${baseUrl}/set-password?token=${token}`;
}

export function isEmailConfigured(): boolean {
  return !!transporter;
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  lastName: string,
  resetToken: string
): Promise<boolean> {
  if (!transporter) {
    console.warn("SMTP not configured. Password reset email would be sent to:", email);
    console.log("Reset link:", getPasswordResetLink(resetToken));
    return false;
  }

  const resetLink = getPasswordResetLink(resetToken);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${firstName} ${lastName},</p>
          <p>We received a request to reset your password for your WokkahCBT administrator account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <a href="${resetLink}" class="button">Reset Password</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </div>
          
          <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          
          <div class="footer">
            <p>For security reasons, please do not share this link with anyone.</p>
            <p>© ${new Date().getFullYear()} WokkahCBT. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    console.log(`[EMAIL] Attempting to send password reset email to: ${email}`);
    const result = await transporter.sendMail({
      from: SMTP_FROM_EMAIL,
      to: email,
      subject: "Password Reset Request - WokkahCBT",
      html: htmlContent,
    });
    console.log(`[EMAIL] Password reset email sent successfully to ${email}. Message ID: ${result.messageId}`);
    return true;
  } catch (error: any) {
    console.error("[EMAIL] Failed to send password reset email:", {
      to: email,
      from: SMTP_FROM_EMAIL,
      error: error.message,
      code: error.code,
      response: error.response,
    });
    return false;
  }
}

function getPasswordResetLink(token: string): string {
  const baseUrl = process.env.APP_URL || "http://localhost:5000";
  return `${baseUrl}/admin/reset-password?token=${token}`;
}

export interface CandidateEmailData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  examTitle: string;
  examDuration: number;
}

export async function sendCandidateCredentials(data: CandidateEmailData): Promise<boolean> {
  if (!transporter) {
    console.warn("SMTP not configured. Email would be sent to:", data.email);
    console.log("Login credentials - Email:", data.email, "Password:", data.password);
    return false;
  }

  const loginUrl = process.env.APP_URL 
    ? `${process.env.APP_URL}/login`
    : "http://localhost:5000/login";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .credentials-box {
          background-color: #f0f9ff;
          border: 2px solid #2563eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credentials-box h3 {
          margin-top: 0;
          color: #2563eb;
        }
        .credential-item {
          margin: 12px 0;
        }
        .credential-label {
          font-weight: 600;
          color: #4b5563;
        }
        .credential-value {
          font-family: 'Courier New', monospace;
          background-color: white;
          padding: 8px 12px;
          border-radius: 4px;
          display: inline-block;
          margin-left: 8px;
          font-size: 16px;
          border: 1px solid #e5e7eb;
        }
        .rules-box {
          background-color: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 20px;
          margin: 25px 0;
        }
        .rules-box h3 {
          color: #dc2626;
          margin-top: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rules-box ol {
          margin: 15px 0;
          padding-left: 20px;
        }
        .rules-box li {
          margin: 10px 0;
          color: #374151;
        }
        .warning {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 500;
          color: #92400e;
        }
        .login-button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          text-align: center;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f9fafb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WokkahCBT - Exam Invitation</h1>
        </div>
        
        <div class="content">
          <p>Dear <strong>${data.firstName} ${data.lastName}</strong>,</p>
          
          <p>You have been assigned to take the following exam:</p>
          
          <div class="credentials-box">
            <h3>Exam Details</h3>
            <div class="credential-item">
              <span class="credential-label">Exam Title:</span>
              <span class="credential-value">${data.examTitle}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Duration:</span>
              <span class="credential-value">${data.examDuration} minutes</span>
            </div>
            
            <h3 style="margin-top: 25px;">Your Login Credentials</h3>
            <div class="credential-item">
              <span class="credential-label">Email:</span>
              <span class="credential-value">${data.email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Password:</span>
              <span class="credential-value">${data.password}</span>
            </div>
          </div>

          <div class="rules-box">
            <h3>Assessment Instructions - PLEASE READ CAREFULLY</h3>
            <ol>
              <li>You must stay in the assessment browser window at all times</li>
              <li>Your webcam must stay on and your face visible throughout</li>
              <li>No other people should be visible in the webcam frame</li>
              <li>Do not switch tabs or minimize the browser window</li>
              <li>Maintain a quiet environment during the assessment</li>
              <li>Do not use any external resources or assistance</li>
            </ol>
          </div>

          <div class="warning">
            <strong>WARNING:</strong> If any of this is detected by the system it will log participant out and wont be able to continue the assessment.
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="login-button">Login to Take Exam</a>
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            Please keep your login credentials secure and do not share them with anyone.
          </p>
          
          <p style="margin-top: 30px;">
            Good luck with your exam!
          </p>
          
          <p>
            Best regards,<br>
            <strong>WokkahCBT Team</strong>
          </p>
        </div>

        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© ${new Date().getFullYear()} WokkahCBT. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
WokkahCBT - Exam Invitation

Dear ${data.firstName} ${data.lastName},

You have been assigned to take the following exam:

EXAM DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exam Title: ${data.examTitle}
Duration: ${data.examDuration} minutes

YOUR LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${data.email}
Password: ${data.password}

Login URL: ${loginUrl}

ASSESSMENT INSTRUCTIONS - PLEASE READ CAREFULLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. You must stay in the assessment browser window at all times
2. Your webcam must stay on and your face visible throughout
3. No other people should be visible in the webcam frame
4. Do not switch tabs or minimize the browser window
5. Maintain a quiet environment during the assessment
6. Do not use any external resources or assistance

WARNING: If any of this is detected by the system it will log participant out and wont be able to continue the assessment.

Please keep your login credentials secure and do not share them with anyone.

Good luck with your exam!

Best regards,
WokkahCBT Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} WokkahCBT. All rights reserved.
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM_EMAIL,
      to: data.email,
      subject: `Exam Invitation: ${data.examTitle}`,
      text: emailText,
      html: emailHtml,
    });
    console.log(`Credentials email sent to ${data.email} for exam: ${data.examTitle}`);
    return true;
  } catch (error) {
    console.error("Failed to send credentials email:", error);
    return false;
  }
}
