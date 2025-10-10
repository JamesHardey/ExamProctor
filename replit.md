# SmartExam Proctor

## Product Overview
SmartExam Proctor is an intelligent, secure online examination and proctoring system that allows administrators to create, manage, and monitor online exams with AI-assisted supervision. It ensures academic integrity through camera monitoring, tab-switch restrictions, question randomization, and advanced proctoring features.

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Shadcn UI, WebRTC
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Real-time**: WebSockets for live monitoring
- **AI**: TensorFlow.js with BlazeFace for face detection
- **Export**: jsPDF for PDF generation, PapaParse for CSV generation

### Database Schema

#### Core Tables
- **users**: User accounts with roles (admin/candidate), managed by Replit Auth
- **sessions**: Session storage for Replit Auth
- **domains**: Subject areas for organizing questions (e.g., Mathematics, Physics)
- **questions**: Question bank with multiple choice and true/false types
- **exams**: Exam configuration including duration, proctoring settings, result visibility
- **exam_questions**: Junction table for question randomization
- **candidates**: Exam sessions for candidates with random seed for question order
- **responses**: Candidate answers and correctness tracking
- **proctor_logs**: Proctoring events (face detection, tab switches, violations)

#### Key Relationships
- Domains have many Questions and Exams
- Exams belong to Domains and have many Candidates
- Candidates belong to Users and Exams, have many Responses and Proctor Logs
- Questions have many Responses through Candidates

## Features

### Admin Features
1. **Dashboard**: Overview of active exams, candidates, flagged incidents, completion rates
2. **Exam Management**: Create/edit exams with domain, duration, question count, proctoring settings
3. **Question Bank**: Add/manage questions by domain with multiple choice or true/false types
4. **Candidate Management**: 
   - Assign exams to candidates
   - View participation status and scores
   - Bulk CSV import with validation and error handling
   - Export exam results (CSV/PDF)
5. **Live Monitoring**: 
   - Real-time view of active exam sessions
   - Camera feeds and event logs
   - Export proctoring logs (CSV/PDF)
6. **Analytics Dashboard**:
   - Comprehensive performance metrics
   - Multiple visualizations (pie charts, bar charts, line charts)
   - Status distribution, score distribution, violations breakdown
   - Export analytics reports (CSV/PDF)
7. **Domain Management**: Organize questions and exams by subject area

### Candidate Features
1. **My Exams**: View assigned exams with status (assigned, in-progress, completed)
2. **Pre-Exam Check**: System compatibility check for camera, microphone, browser
3. **Exam Session**: 
   - One question at a time with randomized order
   - Timer with auto-submission on expiry
   - Webcam monitoring with face detection
   - Microphone audio level monitoring
   - Fullscreen mode enforcement with automatic re-entry
   - Tab switch detection and logging
   - Question flagging and navigation
   - Auto-save functionality
4. **Results**: View scores based on admin-configured visibility (immediate/delayed/hidden)

### Advanced Proctoring Features
- **Webcam Monitoring**: Live camera feed with AI face detection
- **AI Face Detection**: 
  - TensorFlow.js with BlazeFace model
  - Detects no face (logs after 10s as high severity)
  - Detects multiple faces (logs after 5s as high severity)
  - Real-time visual status indicator
- **Microphone Audio Detection**:
  - Real-time audio level monitoring
  - Detects prolonged silence (30s) - logs as low severity
  - Detects high background noise (>80 for 3s) - logs as medium severity
- **Fullscreen Enforcement**:
  - Automatically enters fullscreen when exam starts
  - Detects and logs fullscreen exits as high severity
  - Auto re-enters fullscreen after brief delay
- **Tab Switch Detection**: Automatic detection and logging of tab/window changes
- **Event Logging**: All proctoring events stored with timestamp and severity
- **Real-time Alerts**: Immediate notification of violations
- **Question Randomization**: Unique question order per candidate using random seed

## User Roles

### Administrator
- Full access to all admin features
- Can create/edit exams, questions, and domains
- Can assign exams to candidates (individually or via CSV bulk import)
- Can monitor live exam sessions
- Can view all proctoring logs and reports
- Can export data (exam results, proctoring logs, analytics) as CSV or PDF

### Candidate
- Can view assigned exams
- Can take exams with full proctoring (camera, microphone, fullscreen, tab detection)
- Can view results (if enabled by admin)
- Limited to their own exam sessions
- Cannot access admin routes (automatic redirect to My Exams)

## Routes & Access Control

### Admin Routes (Admin users only)
- `/` - Admin Dashboard
- `/exams` - Exam Management
- `/questions` - Question Bank
- `/candidates` - Candidate Management (with CSV import and export features)
- `/monitoring` - Live Monitoring (with proctoring log export)
- `/analytics` - Analytics Dashboard (with report export)
- `/domains` - Domain Management

### Candidate Routes (Candidate users only)
- `/` - My Exams
- `/exam/:candidateId` - Exam Session

### Auth Routes (Replit Auth)
- `/api/login` - Initiate login flow
- `/api/logout` - Logout
- `/api/callback` - OAuth callback
- `/api/auth/user` - Get current user

### Route Protection
- Admin routes are only accessible to users with role="admin"
- Candidates attempting to access admin routes are automatically redirected to "/"
- No 404 or access denied messages - seamless redirect using wouter's Redirect component
- Backend API endpoints also enforce role-based access control

## Design System

### Colors
- **Primary**: Professional Blue (217 91% 60%) - Trust and security
- **Success**: Green (142 76% 36%) - Completion, correct answers
- **Warning**: Amber (38 92% 50%) - Medium severity alerts
- **Danger**: Red (0 84% 60%) - High severity violations
- **Info**: Blue (199 89% 48%) - Informational messages

### Typography
- **Primary Font**: Inter - Body text and UI
- **Monospace**: JetBrains Mono - Codes, timers, technical data

### Components
- Shadcn UI component library
- Custom sidebar with navigation
- Data tables with sorting and filtering
- Camera feed display with status indicators
- Alert banners with severity levels
- Stats cards for dashboard metrics
- Export buttons with file download functionality

## Key Functionality

### Question Randomization
1. Admin creates exam with N question count
2. System randomly selects N questions from domain pool
3. Each candidate gets unique random seed stored in database
4. Seed determines question order and option shuffling
5. Same seed can reconstruct exact question order for review

### Exam Timer
- Server-validated countdown timer
- Local drift correction using server time
- Visual countdown in header
- Warning when < 5 minutes remaining
- Auto-submission on time expiry

### Proctoring System
- Continuous webcam capture via WebRTC
- AI face detection using TensorFlow.js BlazeFace model
- Microphone audio level detection
- Fullscreen enforcement with automatic re-entry
- Tab visibility API for switch detection
- All events logged with timestamp and severity
- Real-time event streaming to admin monitoring dashboard

### Auto-Save
- Answers saved every time an option is selected
- Session state persists across disconnections
- Can resume exam from last saved state

### Bulk Import/Export
- **CSV Import**: Bulk candidate enrollment with validation and error handling
- **Export Formats**: CSV and PDF for exam results, proctoring logs, and analytics
- **Export Libraries**: jsPDF for PDF generation, PapaParse for CSV generation
- **Export Locations**:
  - Candidates page: Export exam results (CSV/PDF)
  - Monitoring page: Export proctoring logs (CSV/PDF)
  - Analytics page: Export analytics reports (CSV/PDF)

## Development Notes

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit application ID
- `REPLIT_DOMAINS` - Comma-separated allowed domains
- `ISSUER_URL` - OIDC issuer URL (defaults to Replit)

### Database Migrations
Use `npm run db:push` to sync schema changes to database. Never manually write SQL migrations.

### Authentication Flow
1. User clicks "Sign In" → redirects to `/api/login`
2. Replit Auth handles OAuth flow
3. User redirected to `/api/callback` with auth code
4. Session created, user role determined from OIDC claims
5. Role-based routing shows admin or candidate interface

### Admin Role Determination
The backend checks OIDC claims for admin status in this order:
1. `claims["roles"]?.includes("admin")` - Array includes "admin"
2. `claims["is_admin"] === true` or `claims["isAdmin"] === true` - Boolean flag
3. `claims["email"]?.includes("admin")` - Email contains "admin"
4. Default: "candidate" role

### User Management
- `upsertUser` handles duplicate emails by checking if email exists with different ID
- If exists, updates existing user record instead of creating duplicate
- Prevents unique constraint violations during authentication

## Recent Changes (2025-10-10)

### Phase 1 - Core MVP (Completed Earlier)
- Fixed critical candidate exam workflow
- Completed candidate exam flow: My Exams → Pre-Check → Exam Session → Results
- Fixed query keys for exam session API calls
- Added missing API endpoints
- Verified complete integration between frontend and backend

### Phase 2 - Advanced Features (Completed Today)
1. **Fullscreen Mode Enforcement**
   - Automatically enters fullscreen when exam starts
   - Detects and logs fullscreen exits as high severity violations
   - Auto re-enters fullscreen after brief delay

2. **CSV Bulk Import**
   - CSV upload for bulk candidate enrollment
   - Template download functionality
   - Validation and error handling
   - Creates users if they don't exist

3. **Microphone Audio Detection**
   - Real-time audio level monitoring
   - Detects prolonged silence (30s) - logs as low severity
   - Detects high background noise (>80 for 3s) - logs as medium severity
   - Visual audio level indicator in exam UI

4. **AI Face Detection (TensorFlow.js)**
   - BlazeFace model integration
   - Detects no face (logs after 10s as high severity)
   - Detects multiple faces (logs after 5s as high severity)
   - Real-time visual status indicator

5. **Analytics Dashboard**
   - Comprehensive metrics (total exams, candidates, avg score, violations)
   - Multiple visualizations: pie charts, bar charts, line charts
   - Status distribution, score distribution, completions over time
   - Violation types breakdown
   - Exam performance summary table

6. **Export Reports (CSV/PDF)**
   - Exam results export (CSV & PDF) from Candidates page
   - Proctor logs export (CSV & PDF) from Monitoring page
   - Analytics report export (CSV & PDF) from Analytics page
   - Uses jsPDF and PapaParse libraries

7. **Route Protection & RBAC**
   - Implemented route guards using wouter's Redirect component
   - Candidates attempting admin routes automatically redirected to My Exams
   - No 404 or access denied messages - seamless UX
   - Backend API endpoints enforce role-based access

## Project Status
✅ **COMPLETE - ALL FEATURES IMPLEMENTED**

### Completed Features
✅ Complete database schema with all 9 tables (PostgreSQL + Drizzle ORM)
✅ Full admin dashboard with stats, exam/question/candidate/domain management
✅ Live monitoring with real-time WebSocket updates
✅ Complete candidate interface (My Exams, Pre-Check, Exam Session, Results)
✅ Replit Auth integration with OpenID Connect (role-based access with route protection)
✅ Question randomization engine using seeded random for unique order per candidate
✅ Exam timer with auto-submit on expiry
✅ Auto-save functionality (every selection)
✅ Proctoring system (webcam, tab detection, event logging with severity)
✅ **AI face detection with TensorFlow.js BlazeFace (multi-face detection)**
✅ **Microphone audio monitoring (silence and noise detection)**
✅ **Fullscreen mode enforcement with automatic re-entry**
✅ **CSV bulk import for candidate enrollment**
✅ **Analytics dashboard with comprehensive charts and metrics**
✅ **Export reports (CSV/PDF) for results, logs, and analytics**
✅ Results display with admin-controlled visibility (immediate/delayed/hidden)
✅ Beautiful UI following design guidelines with dark mode support
✅ WebSocket server for real-time admin monitoring
✅ Route guards preventing unauthorized access to admin pages

### Production Ready
All features have been implemented, tested, and verified:
- End-to-end testing completed for export functionality
- Role-based access control tested for admin and candidate users
- Route protection verified (candidates redirected from admin routes)
- All export buttons functional on respective admin pages
- OIDC authentication working with multiple role determination methods
- Database upsert logic handles duplicate emails correctly
