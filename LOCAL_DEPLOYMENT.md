# WokkahCBT - Local Deployment Guide

This guide will help you set up and run WokkahCBT on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.x or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd wokkahcbt
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE wokkahcbt;

# Create user (optional)
CREATE USER wokkah_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE wokkahcbt TO wokkah_user;

# Exit PostgreSQL
\q
```

### 4. Configure Environment Variables

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://wokkah_user:your_password@localhost:5432/wokkahcbt

# Session Secret (generate a random string)
SESSION_SECRET=generate-a-random-secret-key-here

# Application URL (for email links)
APP_URL=http://localhost:5000

# OpenAI API Key (for AI question generation)
OPENAI_API_KEY=your-openai-api-key

# SMTP Configuration (optional - for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@wokkahcbt.com

# Node Environment
NODE_ENV=development
```

**Important Environment Variables:**

- **DATABASE_URL**: Your PostgreSQL connection string
- **SESSION_SECRET**: A random string for session encryption (use a strong random value)
- **APP_URL**: Your application URL (used in email links)
- **OPENAI_API_KEY**: Required for AI question generation from documents
- **SMTP_\***: Optional - only needed if you want to send email invitations

### 5. Initialize Database Schema

Push the database schema to your PostgreSQL database:

```bash
npm run db:push
```

This command uses Drizzle ORM to create all necessary tables.

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:5000`

## Production Deployment

### 1. Build the Application

```bash
npm run build
```

This creates optimized production builds in the `dist/` directory.

### 2. Set Production Environment Variables

Update your `.env` file or set environment variables:

```env
NODE_ENV=production
APP_URL=https://your-domain.com
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=your-production-secret
```

### 3. Start the Production Server

```bash
npm start
```

Or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm --name "wokkahcbt" -- start
```

## Database Management

### Viewing Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM.

### Making Schema Changes

1. Edit `shared/schema.ts`
2. Run `npm run db:push` to apply changes

### Reset Database (Development Only)

```sql
DROP DATABASE wokkahcbt;
CREATE DATABASE wokkahcbt;
```

Then run `npm run db:push` again.

## Email Configuration (Optional)

WokkahCBT can send email notifications for:
- Candidate invitations
- Password reset requests
- Exam notifications

To enable email functionality:

1. Configure SMTP settings in `.env`
2. Supported providers: Gmail, SendGrid, Amazon SES, Resend, etc.

**Gmail Example:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@wokkahcbt.com
```

**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833).

## AI Question Generation Setup

To use AI-powered question generation from PDF/Word/PowerPoint documents:

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env` file:

```env
OPENAI_API_KEY=sk-...your-key...
```

Supported document formats:
- PDF (.pdf)
- Word (.doc, .docx)
- PowerPoint (.ppt, .pptx)

## Initial Admin Account

The first administrator account should be created through the admin registration page:

1. Navigate to `http://localhost:5000/admin`
2. Click "Create Admin Account" (only available when no admins exist)
3. Fill in your details and create your account

## Troubleshooting

### Database Connection Issues

If you see "DATABASE_URL must be set" error:
- Ensure `.env` file exists in the project root
- Verify DATABASE_URL is correctly formatted
- Test PostgreSQL connection: `psql $DATABASE_URL`

### Port Already in Use

If port 5000 is in use, you can change it:
```bash
PORT=3000 npm run dev
```

### SMTP/Email Issues

If emails aren't sending:
- Check SMTP credentials
- Verify firewall/network settings
- Check console logs for error messages
- In development, email links are printed to console even if SMTP fails

### AI Question Generation Issues

If AI generation fails:
- Verify OPENAI_API_KEY is set correctly
- Check OpenAI API quota/billing
- Ensure document file size is under 10MB

## File Structure

```
wokkahcbt/
├── client/              # React frontend
│   └── src/
├── server/              # Express backend
│   ├── index.ts        # Server entry point
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Database operations
│   ├── db.ts           # Database connection
│   ├── email.ts        # Email functionality
│   └── ai.ts           # AI question generation
├── shared/              # Shared types/schemas
│   └── schema.ts       # Database schema (Drizzle)
├── .env                 # Environment variables (create from .env.example)
├── package.json         # Dependencies
└── drizzle.config.ts    # Drizzle ORM config
```

## Security Considerations

1. **Session Secret**: Use a strong random string in production
2. **Database Credentials**: Never commit `.env` file to version control
3. **HTTPS**: Use HTTPS in production (configure reverse proxy like Nginx)
4. **API Keys**: Keep OpenAI and SMTP credentials secure
5. **Passwords**: Use strong passwords for PostgreSQL and admin accounts

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Password-based with bcrypt + express-session
- **AI**: OpenAI GPT-4 for question generation
- **Proctoring**: TensorFlow.js with BlazeFace for face detection
- **Email**: Nodemailer
- **Real-time**: WebSockets for live monitoring

## Support

For issues or questions:
- Check the main README.md
- Review replit.md for technical architecture details
- Check console logs for error messages

## License

MIT License - See LICENSE file for details
