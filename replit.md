# SmartExam Proctor

### Overview
SmartExam Proctor is an intelligent, secure online examination and proctoring system designed to facilitate the creation, management, and monitoring of online exams with AI-assisted supervision. It aims to ensure academic integrity through features like camera monitoring, tab-switch restrictions, question randomization, and advanced proctoring capabilities. The system supports both administrators, who manage exams and monitor candidates, and candidates, who take proctored exams.

### User Preferences
I prefer the AI agent to be concise and to the point. When suggesting code changes, provide the exact code snippets that can be directly applied. I appreciate it when the agent explains the 'why' behind its suggestions, especially for architectural decisions. Prioritize secure and scalable solutions. Do not make changes to files or folders without explicit confirmation, especially to core authentication or proctoring logic. I prefer detailed explanations for complex features.

### System Architecture
The application is built with a **React + TypeScript** frontend utilizing **Tailwind CSS** and **Shadcn UI** for a modern, responsive design, and **WebRTC** for real-time video feeds. The backend is an **Express.js + TypeScript** server. **PostgreSQL** with **Drizzle ORM** serves as the database. Authentication is handled by a custom **password-based system** with **bcrypt** for password hashing and **express-session** for session management. **WebSockets** enable real-time monitoring. **TensorFlow.js with BlazeFace** is used for AI-powered face detection. **Nodemailer** handles email invitations.

**UI/UX Decisions:**
- **Color Palette:** Professional Blue for primary actions, Green for success, Amber for warnings, Red for danger, and Blue for informational messages.
- **Typography:** Inter for body text and UI, JetBrains Mono for technical data and timers.
- **Components:** Leverages Shadcn UI, custom sidebar navigation, data tables with sorting/filtering, camera feed displays, alert banners, and stats cards.

**Technical Implementations:**
- **Database Schema:** Includes tables for `users`, `sessions`, `domains`, `questions`, `exams`, `exam_questions`, `candidates`, `responses`, and `proctor_logs`, with defined relationships.
- **Admin Features:** Dashboard, exam/question/candidate/domain management, live monitoring, analytics, and bulk import/export.
- **Candidate Features:** My Exams view, pre-exam checks, proctored exam sessions (one question at a time, timer, webcam, microphone, fullscreen, tab switch detection, auto-save), and result viewing.
- **Advanced Proctoring:**
    - **AI Face Detection:** TensorFlow.js BlazeFace model detects no face or multiple faces, logging high-severity violations.
    - **Microphone Audio Detection:** Monitors audio levels, logging prolonged silence (low severity) or high background noise (medium severity).
    - **Fullscreen Enforcement:** Automatically enters fullscreen, detects exits, and re-enters.
    - **Tab Switch Detection:** Logs window/tab changes.
    - **Event Logging:** Stores all proctoring events with timestamps and severity.
    - **Question Randomization:** Uses a unique random seed per candidate to randomize question order and options.
- **Authentication:** Password-based authentication with bcrypt, session management, admin registration, and candidate invitation workflow via email.
- **Bulk Operations:** CSV import for candidates and CSV/PDF export for exam results, proctoring logs, and analytics reports using `jsPDF` and `PapaParse`.
- **Real-time Communication:** WebSockets for live monitoring and alerts.

### External Dependencies
- **Frontend Framework:** React
- **Styling:** Tailwind CSS, Shadcn UI
- **Real-time Communication:** WebRTC (for camera feeds), WebSockets
- **Backend Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **AI/ML:** TensorFlow.js with BlazeFace model (for face detection)
- **Email Service:** Nodemailer (requires SMTP configuration)
- **PDF Generation:** jsPDF
- **CSV Parsing/Generation:** PapaParse
- **Authentication/Session Management:** bcrypt, express-session