import nodemailer from "nodemailer";
import type { Exam } from "@shared/schema";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@smartexam.com";

// Create transporter only if SMTP credentials are provided
let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
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
          <h1>Welcome to SmartExam Proctor</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been invited to take an exam on SmartExam Proctor${exam ? `: <strong>${exam.title}</strong>` : ""}.</p>
          
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
            <p>© ${new Date().getFullYear()} SmartExam Proctor. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: SMTP_FROM_EMAIL,
      to: email,
      subject: exam ? `Invitation to ${exam.title}` : "Welcome to SmartExam Proctor",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return false;
  }
}

function getInvitationLink(token: string): string {
  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost:5000";
  return `${baseUrl}/set-password?token=${token}`;
}

export function isEmailConfigured(): boolean {
  return !!transporter;
}
