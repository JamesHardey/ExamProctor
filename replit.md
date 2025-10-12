# WokkahCBT

### Overview
WokkahCBT is an intelligent, secure online examination and proctoring system designed to facilitate the creation, management, and monitoring of online exams with AI-assisted supervision. It aims to ensure academic integrity through features like camera monitoring, tab-switch restrictions, question randomization, and advanced proctoring capabilities. The system supports both administrators, who manage exams and monitor candidates, and candidates, who take proctored exams.

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
  - **Exam Status Values:** `draft` (not accessible to candidates), `active` (full access), `inactive` (labeled as "Archived" - prevents new attempts but allows viewing completed results)
- **Admin Features:** Dashboard, exam/question/candidate/domain management, live monitoring, analytics, bulk import/export, exam results viewing with CSV/PDF export capabilities, and AI question generation from uploaded PDF/Word documents.
- **Candidate Features:** My Exams view, pre-exam checks, proctored exam sessions (one question at a time, timer, webcam, microphone, fullscreen, tab switch detection, auto-save), and result viewing.
  - **Exam Access Control:** Draft exams filtered on both frontend and backend, inactive (archived) exams prevent new attempts but allow result viewing
- **Advanced Proctoring:**
    - **AI Face Detection:** TensorFlow.js BlazeFace model detects no face or multiple faces, logging high-severity violations. **3-strike warning system**: Candidates receive visual warnings (1/3, 2/3, 3/3) when face is not detected for 10+ seconds; auto-logout after 3rd strike.
    - **Microphone Audio Detection:** Monitors audio levels, logging prolonged silence (low severity) or high background noise (medium severity). **3-strike warning system**: Candidates receive visual warnings for excessive noise (>80 audio level for 3+ seconds); auto-logout after 3rd strike.
    - **Fullscreen Enforcement:** Automatically enters fullscreen, detects exits, and re-enters.
    - **Tab Switch Detection:** Logs window/tab changes. **10-second auto-logout**: When candidate leaves tab/minimizes window, a 10-second countdown begins with visual timer; auto-logout if not returned within 10 seconds. Countdown cancels if candidate returns to tab.
    - **Warning Indicators:** Real-time visual badges in exam header display active warning counts (Noise: X/3, Focus: X/3) and tab switch countdown timer (Logout in: Xs) with AlertTriangle icons.
    - **Event Logging:** Stores all proctoring events with timestamps and severity.
    - **Question Randomization:** Uses a unique random seed per candidate to randomize question order and options.
    - **Responsive UI:** Question navigation grid with flex-wrap for large question sets, mobile-optimized header and layout with responsive padding and text sizing.
- **Authentication:** Password-based authentication with bcrypt, session management (secure cookies in production only), admin registration, candidate invitation workflow via email, and password reset functionality for administrators with email-based token validation (tokens are hashed before storage and expire after 1 hour).
- **Bulk Operations:** CSV import for candidates and CSV/PDF export for exam results, proctoring logs, and analytics reports using `jsPDF` and `PapaParse`.
  - **Results Export:** Administrators can view all completed candidate results in a table and export to CSV or PDF format with full candidate details (name, email, department, matric no, score, status, completion time).
- **AI Question Generation from Documents:**
    - **Document Upload:** Administrators can upload PDF or Word documents to provide context for AI question generation
    - **Text Extraction:** Automatically extracts text from PDF (using pdf-parse) and Word documents (using mammoth)
    - **Context-Aware Generation:** AI generates questions based on document content when provided, ensuring relevance to specific course materials
    - **File Restrictions:** Supports PDF (.pdf) and Word (.doc, .docx) files up to 10MB
    - **Optional Feature:** Documents can be uploaded during exam creation or when generating questions in exam management, but are not required
    - **Integration Points:** Available in both exam creation form and exam management "Generate with AI" dialog
- **Real-time Communication:** WebSockets for live monitoring and alerts.

### External Dependencies
- **Frontend Framework:** React
- **Styling:** Tailwind CSS, Shadcn UI
- **Real-time Communication:** WebRTC (for camera feeds), WebSockets
- **Backend Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **AI/ML:** TensorFlow.js with BlazeFace model (for face detection), OpenAI GPT-4 (for question generation)
- **Email Service:** Nodemailer (requires SMTP configuration)
- **PDF Generation:** jsPDF
- **CSV Parsing/Generation:** PapaParse
- **Document Processing:** pdf-parse (PDF text extraction), mammoth (Word document text extraction), multer (file upload handling)
- **Authentication/Session Management:** bcrypt, express-session