# SmartExam Proctor

## Product Overview
SmartExam Proctor is an intelligent, secure online examination and proctoring system that allows administrators to create, manage, and monitor online exams with AI-assisted supervision. It ensures academic integrity through camera monitoring, tab-switch restrictions, and question randomization.

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Shadcn UI, WebRTC
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Real-time**: WebSockets for live monitoring
- **AI**: TensorFlow.js for face detection (planned)

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
4. **Candidate Management**: Assign exams to candidates, view participation status and scores
5. **Live Monitoring**: Real-time view of active exam sessions with camera feeds and event logs
6. **Domain Management**: Organize questions and exams by subject area

### Candidate Features
1. **My Exams**: View assigned exams with status (assigned, in-progress, completed)
2. **Pre-Exam Check**: System compatibility check for camera, microphone, browser
3. **Exam Session**: 
   - One question at a time with randomized order
   - Timer with auto-submission on expiry
   - Webcam monitoring with picture-in-picture
   - Tab switch detection and logging
   - Question flagging and navigation
   - Auto-save functionality
4. **Results**: View scores based on admin-configured visibility (immediate/delayed/hidden)

### Proctoring Features
- **Webcam Monitoring**: Live camera feed with face detection
- **Tab Switch Detection**: Automatic detection and logging of tab/window changes
- **Event Logging**: All proctoring events stored with severity levels
- **Real-time Alerts**: Immediate notification of violations
- **Question Randomization**: Unique question order per candidate using random seed

## User Roles

### Administrator
- Full access to all admin features
- Can create/edit exams, questions, and domains
- Can assign exams to candidates
- Can monitor live exam sessions
- Can view all proctoring logs and reports

### Candidate
- Can view assigned exams
- Can take exams with proctoring
- Can view results (if enabled by admin)
- Limited to their own exam sessions

## Routes

### Admin Routes
- `/` - Admin Dashboard
- `/exams` - Exam Management
- `/questions` - Question Bank
- `/candidates` - Candidate Management
- `/monitoring` - Live Monitoring
- `/domains` - Domain Management

### Candidate Routes
- `/` - My Exams

### Auth Routes (Replit Auth)
- `/api/login` - Initiate login flow
- `/api/logout` - Logout
- `/api/callback` - OAuth callback
- `/api/auth/user` - Get current user

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
- Face detection using TensorFlow.js (backend ready)
- Tab visibility API for switch detection
- All events logged with timestamp and severity
- Real-time event streaming to admin monitoring dashboard

### Auto-Save
- Answers saved every time an option is selected
- Session state persists across disconnections
- Can resume exam from last saved state

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
4. Session created and user redirected to appropriate dashboard
5. Role-based routing shows admin or candidate interface

## Future Enhancements
- Microphone audio detection for voice monitoring
- Advanced AI face detection with gaze tracking
- CSV import for bulk candidate enrollment
- Full-screen mode enforcement
- Detailed analytics dashboards with time-activity visualization
- Export reports (CSV/PDF)
- Multi-language support
- Mobile app for exam taking

## Recent Changes (2025-10-10)
- Fixed critical candidate exam workflow to ensure pre-exam check runs before status change
- Completed candidate exam flow: My Exams → Pre-Check → Exam Session → Results
- Fixed query keys for exam session API calls to properly fetch randomized questions
- Added missing API endpoints for starting exams and fetching individual candidate data
- Verified complete integration between frontend and backend

## Project Status
✅ **COMPLETE MVP** - All core features implemented and functional

### Completed Features
✅ Complete database schema with all 9 tables (PostgreSQL + Drizzle ORM)
✅ Full admin dashboard with stats, exam/question/candidate/domain management
✅ Live monitoring with real-time WebSocket updates
✅ Complete candidate interface (My Exams, Pre-Check, Exam Session, Results)
✅ Replit Auth integration with OpenID Connect (role-based access)
✅ Question randomization engine using seeded random for unique order per candidate
✅ Exam timer with auto-submit on expiry
✅ Auto-save functionality every 15 seconds
✅ Proctoring system (webcam monitoring, tab detection, event logging with severity)
✅ Results display with admin-controlled visibility (immediate/delayed/hidden)
✅ Beautiful UI following design guidelines with dark mode support
✅ WebSocket server for real-time admin monitoring

### Known Limitations
- Face detection uses placeholder implementation (TensorFlow.js integration ready for future enhancement)
- Camera feed displays in exam session but AI analysis not yet active
- Mobile responsiveness could be improved in future iterations
