// API routes with password-based authentication and WebSocket support
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, generateInvitationToken } from "./auth";
import { sendInvitationEmail, isEmailConfigured, sendCandidateCredentials, sendPasswordResetEmail } from "./email";
import { generateQuestionsWithAI } from "./ai";
import { extractTextFromDocument } from "./document-parser";
import {
  insertDomainSchema,
  insertQuestionSchema,
  insertExamSchema,
  insertCandidateSchema,
  insertResponseSchema,
  insertProctorLogSchema,
} from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, and PowerPoint documents are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Note: Auth routes are now in server/auth.ts

  // Password Reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log(`[FORGOT-PASSWORD] Request received for email: ${email}`);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user || user.role !== "admin") {
        console.log(`[FORGOT-PASSWORD] No admin user found for email: ${email}`);
        return res.json({ message: "If an account exists, a password reset link has been sent to your email" });
      }

      console.log(`[FORGOT-PASSWORD] Admin user found: ${user.email} (${user.id})`);

      // Generate reset token (plaintext for email)
      const resetToken = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Hash token before storing in database
      const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

      // Save hashed token to database
      await storage.setResetPasswordToken(user.id, hashedToken, expiry);
      console.log(`[FORGOT-PASSWORD] Reset token saved to database for user: ${user.email}`);

      // Send email with plaintext token
      const emailSent = await sendPasswordResetEmail(
        user.email,
        user.firstName || "Admin",
        user.lastName || "User",
        resetToken
      );

      if (!emailSent && process.env.NODE_ENV === "development") {
        const resetLink = `${process.env.APP_URL || "http://localhost:5000"}/admin/reset-password?token=${resetToken}`;
        console.log("\n========================================");
        console.log("[FORGOT-PASSWORD] Email sending failed!");
        console.log("Reset link for development:", resetLink);
        console.log("========================================\n");
      }

      res.json({ message: "If an account exists, a password reset link has been sent to your email" });
    } catch (error: any) {
      console.error("[FORGOT-PASSWORD] Error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Get all admin users with reset tokens
      const admins = await storage.getAdministrators();
      
      // Find user by comparing hashed tokens
      let matchedUser = null;
      for (const admin of admins) {
        if (admin.resetPasswordToken && admin.resetPasswordExpiry) {
          // Check if token matches
          const isMatch = await bcrypt.compare(token, admin.resetPasswordToken);
          if (isMatch) {
            matchedUser = admin;
            break;
          }
        }
      }

      if (!matchedUser || !matchedUser.resetPasswordExpiry) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > new Date(matchedUser.resetPasswordExpiry)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update password
      await storage.updateUser(matchedUser.id, { passwordHash });

      // Clear reset token
      await storage.clearResetPasswordToken(matchedUser.id);

      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Administrator Management routes
  app.get("/api/administrators", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const admins = await storage.getAdministrators();
      // Remove sensitive fields before sending to client
      const sanitizedAdmins = admins.map(({ passwordHash, invitationToken, ...admin }) => admin);
      res.json(sanitizedAdmins);
    } catch (error) {
      console.error("Error fetching administrators:", error);
      res.status(500).json({ message: "Failed to fetch administrators" });
    }
  });

  app.post("/api/administrators", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, password } = req.body;
      
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create admin user
      const admin = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        role: "admin",
      });

      // Return without sensitive fields
      const { passwordHash: _, invitationToken: __, ...sanitizedAdmin } = admin;
      res.json(sanitizedAdmin);
    } catch (error: any) {
      console.error("Error creating administrator:", error);
      res.status(400).json({ message: error.message || "Failed to create administrator" });
    }
  });

  app.put("/api/administrators/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, password } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Check if email already exists for another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const updateData: any = {
        email,
        firstName,
        lastName,
      };

      // Only update password if provided
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      }

      const admin = await storage.updateUser(id, updateData);
      if (!admin) {
        return res.status(404).json({ message: "Administrator not found" });
      }

      // Return without sensitive fields
      const { passwordHash: _, invitationToken: __, ...sanitizedAdmin } = admin;
      res.json(sanitizedAdmin);
    } catch (error: any) {
      console.error("Error updating administrator:", error);
      res.status(400).json({ message: error.message || "Failed to update administrator" });
    }
  });

  app.delete("/api/administrators/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deleting yourself
      if ((req as any).user?.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const result = await storage.deleteUser(id);
      if (!result) {
        return res.status(404).json({ message: "Administrator not found" });
      }

      res.json({ message: "Administrator deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting administrator:", error);
      res.status(400).json({ message: error.message || "Failed to delete administrator" });
    }
  });

  // Admin Stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const exams = await storage.getExams();
      const candidates = await storage.getCandidates();
      const logs = await storage.getProctorLogs();

      const activeExams = exams.filter(e => e.status === "active").length;
      const totalCandidates = candidates.length;
      const flaggedIncidents = logs.filter(l => l.severity === "high" || l.severity === "medium").length;
      const completed = candidates.filter(c => c.status === "completed").length;
      const completionRate = totalCandidates > 0 ? Math.round((completed / totalCandidates) * 100) : 0;

      const recentExams = exams.slice(0, 3).map(exam => ({
        id: exam.id,
        title: exam.title,
        status: exam.status,
        candidateCount: candidates.filter(c => c.examId === exam.id).length,
      }));

      const recentActivity = logs.slice(0, 5).map(log => ({
        message: `${log.eventType.replace("_", " ")} detected`,
        timestamp: new Date(log.timestamp).toLocaleString(),
        severity: log.severity,
      }));

      res.json({
        activeExams,
        totalCandidates,
        flaggedIncidents,
        completionRate,
        recentExams,
        recentActivity,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Domain routes
  app.get("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const domains = await storage.getDomains();
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });

  app.post("/api/domains", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertDomainSchema.parse(req.body);
      const domain = await storage.createDomain(validatedData);
      res.json(domain);
    } catch (error: any) {
      console.error("Error creating domain:", error);
      res.status(400).json({ message: error.message || "Failed to create domain" });
    }
  });

  // Question routes
  app.get("/api/questions", isAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post("/api/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(validatedData);
      res.json(question);
    } catch (error: any) {
      console.error("Error creating question:", error);
      res.status(400).json({ message: error.message || "Failed to create question" });
    }
  });

  app.put("/api/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertQuestionSchema.parse(req.body);
      const question = await storage.updateQuestion(id, validatedData);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      res.json(question);
    } catch (error: any) {
      console.error("Error updating question:", error);
      res.status(400).json({ message: error.message || "Failed to update question" });
    }
  });

  app.delete("/api/questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteQuestion(id);
      res.json({ message: "Question deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting question:", error);
      res.status(400).json({ message: error.message || "Failed to delete question" });
    }
  });

  // Exam routes
  app.get("/api/exams", isAuthenticated, async (req, res) => {
    try {
      const exams = await storage.getExams();
      res.json(exams);
    } catch (error) {
      console.error("Error fetching exams:", error);
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  app.post("/api/exams", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { questions: questionsData, useAI, aiQuestionCount, documentContent, ...examData } = req.body;
      const validatedExamData = insertExamSchema.parse(examData);
      
      let finalQuestions = questionsData || [];
      
      // Generate questions with AI if requested
      if (useAI && aiQuestionCount && aiQuestionCount > 0) {
        if (!process.env.OPENAI_API_KEY) {
          return res.status(400).json({ 
            message: "AI question generation is not configured. Please add OPENAI_API_KEY." 
          });
        }
        
        // Fetch domain name for better AI prompts
        const domain = await storage.getDomain(validatedExamData.domainId);
        if (!domain) {
          return res.status(400).json({ message: "Invalid domain" });
        }
        
        const aiQuestions = await generateQuestionsWithAI({
          domainId: validatedExamData.domainId,
          examTitle: validatedExamData.title,
          examDescription: validatedExamData.description || "",
          domainName: domain.name,
          questionCount: aiQuestionCount,
          documentContent, // Pass document content if provided
        });
        
        finalQuestions = [...finalQuestions, ...aiQuestions];
      }
      
      if (finalQuestions.length > 0) {
        const validatedQuestions = finalQuestions.map((q: any) => insertQuestionSchema.parse(q));
        const exam = await storage.createExamWithQuestions(validatedExamData, validatedQuestions);
        res.json(exam);
      } else {
        const exam = await storage.createExam(validatedExamData);
        res.json(exam);
      }
    } catch (error: any) {
      console.error("Error creating exam:", error);
      res.status(400).json({ message: error.message || "Failed to create exam" });
    }
  });

  app.get("/api/exams/:id", isAuthenticated, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const exam = await storage.getExam(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }
      res.json(exam);
    } catch (error: any) {
      console.error("Error fetching exam:", error);
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  app.patch("/api/exams/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const validatedData = insertExamSchema.partial().parse(req.body);
      const updatedExam = await storage.updateExam(examId, validatedData);
      res.json(updatedExam);
    } catch (error: any) {
      console.error("Error updating exam:", error);
      res.status(400).json({ message: error.message || "Failed to update exam" });
    }
  });

  app.delete("/api/exams/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      await storage.deleteExam(examId);
      res.json({ message: "Exam deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting exam:", error);
      res.status(500).json({ message: "Failed to delete exam" });
    }
  });

  // Document upload and text extraction endpoint
  app.post("/api/ai/extract-document", isAuthenticated, isAdmin, upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No document file provided" });
      }

      const extractedText = await extractTextFromDocument(req.file.buffer, req.file.mimetype);
      
      res.json({ 
        text: extractedText,
        filename: req.file.originalname,
        size: req.file.size,
      });
    } catch (error: any) {
      console.error("Error extracting document text:", error);
      res.status(400).json({ message: error.message || "Failed to extract text from document" });
    }
  });

  // AI question generation endpoint (supports document content)
  app.post("/api/ai/generate-questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { examTitle, domainId, description, count, documentContent } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          message: "AI question generation is not configured. Please add OPENAI_API_KEY." 
        });
      }
      
      // Fetch domain name for better AI prompts
      const domain = await storage.getDomain(domainId);
      if (!domain) {
        return res.status(400).json({ message: "Invalid domain" });
      }
      
      const questions = await generateQuestionsWithAI({
        domainId,
        examTitle,
        examDescription: description || "",
        domainName: domain.name,
        questionCount: count || 5,
        documentContent, // Optional document content
      });
      
      res.json({ questions });
    } catch (error: any) {
      console.error("Error generating AI questions:", error);
      res.status(400).json({ message: error.message || "Failed to generate AI questions" });
    }
  });

  app.get("/api/exams/:id/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const questions = await storage.getExamQuestions(examId);
      res.json(questions);
    } catch (error: any) {
      console.error("Error fetching exam questions:", error);
      res.status(500).json({ message: "Failed to fetch exam questions" });
    }
  });

  app.post("/api/exams/:id/questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const questionsData = req.body.questions;
      
      if (!questionsData || !Array.isArray(questionsData) || questionsData.length === 0) {
        return res.status(400).json({ message: "Questions array is required" });
      }
      
      const validatedQuestions = questionsData.map((q: any) => insertQuestionSchema.parse(q));
      await storage.addQuestionsToExam(examId, validatedQuestions);
      res.json({ message: "Questions added successfully" });
    } catch (error: any) {
      console.error("Error adding questions to exam:", error);
      res.status(400).json({ message: error.message || "Failed to add questions" });
    }
  });

  // Users route for candidate selection
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Candidate routes
  app.get("/api/candidates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      
      // Fetch related user and exam data
      const candidatesWithDetails = await Promise.all(
        candidates.map(async (candidate) => {
          const user = await storage.getUser(candidate.userId);
          const exam = await storage.getExam(candidate.examId);
          return { ...candidate, user, exam };
        })
      );

      res.json(candidatesWithDetails);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/exams/:id/candidates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = parseInt(req.params.id);
      const candidates = await storage.getCandidatesByExam(examId);
      
      // Fetch related user data
      const candidatesWithDetails = await Promise.all(
        candidates.map(async (candidate) => {
          const user = await storage.getUser(candidate.userId);
          return { ...candidate, user };
        })
      );

      res.json(candidatesWithDetails);
    } catch (error) {
      console.error("Error fetching exam candidates:", error);
      res.status(500).json({ message: "Failed to fetch exam candidates" });
    }
  });

  app.post("/api/candidates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, examId } = req.body;
      
      // Generate random seed for question randomization
      const randomSeed = randomBytes(16).toString("hex");
      
      const candidateData = {
        userId,
        examId,
        randomSeed,
        status: "assigned" as const,
      };

      const validatedData = insertCandidateSchema.parse(candidateData);
      const candidate = await storage.createCandidate(validatedData);
      
      // Send invitation email if user doesn't have a password yet
      const user = await storage.getUser(userId);
      const exam = await storage.getExam(examId);
      
      if (user && !user.passwordHash && user.invitationToken && exam) {
        const emailSent = await sendInvitationEmail(user.email, user.invitationToken, exam);
        if (!emailSent && isEmailConfigured()) {
          console.error("Failed to send invitation email to:", user.email);
        }
      }
      
      res.json(candidate);
    } catch (error: any) {
      console.error("Error creating candidate:", error);
      res.status(400).json({ message: error.message || "Failed to assign exam" });
    }
  });

  app.delete("/api/candidates/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      await storage.deleteCandidate(candidateId);
      res.json({ message: "Candidate deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  // Start exam (update candidate status)
  app.post("/api/candidates/:candidateId/start", isAuthenticated, async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const userId = req.user.id;
      if (candidate.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check exam status before allowing start
      const exam = await storage.getExam(candidate.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      if (exam.status === "draft") {
        return res.status(403).json({ message: "This exam is not yet available" });
      }

      if (exam.status === "inactive") {
        return res.status(403).json({ message: "This exam has been archived and new attempts cannot be started" });
      }

      const updated = await storage.updateCandidate(candidateId, {
        status: "in_progress",
        startedAt: new Date(),
      });

      // Log exam start event
      await storage.createProctorLog({
        candidateId,
        eventType: "exam_start",
        severity: "low",
      });

      res.json(updated);
    } catch (error) {
      console.error("Error starting exam:", error);
      res.status(500).json({ message: "Failed to start exam" });
    }
  });

  // Bulk import candidates
  app.post("/api/candidates/bulk-import", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { candidates } = req.body;
      
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ message: "No candidates provided" });
      }

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const candidate of candidates) {
        try {
          const { email, firstName, lastName, department, matricNo, examId, password } = candidate;
          
          // Fetch exam for email invitation
          const exam = await storage.getExam(parseInt(examId));
          
          // Find or create user
          let user = await storage.getUserByEmail(email);
          
          if (!user) {
            // Hash the provided password
            const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined;
            
            user = await storage.createUser({
              id: crypto.randomUUID(),
              email,
              firstName: firstName || '',
              lastName: lastName || '',
              department: department || null,
              matricNo: matricNo || null,
              role: "candidate",
              passwordHash,
              invitedAt: new Date(),
            });
          } else {
            // Update existing user with new information
            if (password) {
              const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
              user = await storage.updateUser(user.id, {
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                department: department || user.department,
                matricNo: matricNo || user.matricNo,
                passwordHash,
              });
            } else {
              user = await storage.updateUser(user.id, {
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                department: department || user.department,
                matricNo: matricNo || user.matricNo,
              });
            }
          }

          // Create candidate assignment
          await storage.createCandidate({
            userId: user.id,
            examId: parseInt(examId),
            status: "assigned",
            randomSeed: Math.floor(Math.random() * 1000000).toString(),
          });

          // Send email notification if password was provided (new candidate)
          if (password && exam) {
            try {
              await sendCandidateCredentials({
                email,
                firstName: firstName || '',
                lastName: lastName || '',
                password,
                examTitle: exam.title,
                examDuration: exam.duration,
              });
            } catch (emailError) {
              console.error(`Failed to send email to ${email}:`, emailError);
              // Don't fail the import if email fails
            }
          }

          results.successful++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${candidate.email}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Bulk import error:", error);
      res.status(500).json({ message: error.message || "Bulk import failed" });
    }
  });

  // My exams (for candidates)
  app.get("/api/my-exams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const candidates = await storage.getCandidatesByUser(userId);
      
      const candidatesWithExams = await Promise.all(
        candidates.map(async (candidate) => {
          const exam = await storage.getExam(candidate.examId);
          return { ...candidate, exam };
        })
      );

      // Filter out draft exams on the backend for security
      const filteredCandidates = candidatesWithExams.filter(
        candidate => candidate.exam?.status !== 'draft'
      );

      res.json(filteredCandidates);
    } catch (error) {
      console.error("Error fetching my exams:", error);
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  // Exam session with randomization
  app.get("/api/exam-session/:candidateId", isAuthenticated, async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Verify user owns this candidate session
      const userId = req.user.id;
      if (candidate.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const exam = await storage.getExam(candidate.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Check exam status restrictions
      if (exam.status === "draft") {
        return res.status(403).json({ message: "This exam is not yet available" });
      }

      // Archived exams: allow viewing completed results, but prevent new attempts
      if (exam.status === "inactive") {
        if (candidate.status === "assigned" || candidate.status === "in_progress") {
          return res.status(403).json({ message: "This exam has been archived and new attempts cannot be started" });
        }
        // Allow completed status to view results
      }

      // Get questions from domain
      const allQuestions = await storage.getQuestionsByDomain(exam.domainId);
      
      // Randomize questions using the candidate's seed
      const seededRandom = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = ((hash << 5) - hash) + seed.charCodeAt(i);
          hash = hash & hash;
        }
        return () => {
          hash = (hash * 9301 + 49297) % 233280;
          return hash / 233280;
        };
      };

      const random = seededRandom(candidate.randomSeed);
      const shuffled = [...allQuestions].sort(() => random() - 0.5);
      const selectedQuestions = shuffled.slice(0, exam.questionCount);

      // Shuffle options for each question
      const randomizedQuestions = selectedQuestions.map(q => ({
        ...q,
        options: [...(q.options as string[])].sort(() => random() - 0.5),
      }));

      // Calculate time remaining
      const startedAt = candidate.startedAt ? new Date(candidate.startedAt).getTime() : Date.now();
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const totalSeconds = exam.duration * 60;
      const timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);

      // Get existing responses
      const responses = await storage.getResponses(candidateId);

      res.json({
        candidateId: candidate.id,
        examTitle: exam.title,
        duration: exam.duration,
        questions: selectedQuestions,
        randomizedQuestions,
        responses,
        timeRemaining,
      });
    } catch (error) {
      console.error("Error fetching exam session:", error);
      res.status(500).json({ message: "Failed to fetch exam session" });
    }
  });

  // Response routes (auto-save)
  app.post("/api/responses", isAuthenticated, async (req: any, res) => {
    try {
      const { candidateId, questionId, selectedAnswer } = req.body;

      // Check if response already exists
      const existingResponses = await storage.getResponses(candidateId);
      const existing = existingResponses.find(r => r.questionId === questionId);

      const question = await storage.getQuestion(questionId);
      const isCorrect = question?.correctAnswer === selectedAnswer;

      if (existing) {
        const updated = await storage.updateResponse(existing.id, {
          selectedAnswer,
          isCorrect,
        });
        return res.json(updated);
      }

      const responseData = {
        candidateId,
        questionId,
        selectedAnswer,
        isCorrect,
      };

      const validatedData = insertResponseSchema.parse(responseData);
      const response = await storage.createResponse(validatedData);
      res.json(response);
    } catch (error: any) {
      console.error("Error saving response:", error);
      res.status(400).json({ message: error.message || "Failed to save response" });
    }
  });

  // Submit exam
  app.post("/api/exam-session/:candidateId/submit", isAuthenticated, async (req: any, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const userId = req.user.id;
      if (candidate.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Calculate score
      const responses = await storage.getResponses(candidateId);
      const correctCount = responses.filter(r => r.isCorrect).length;
      const totalCount = responses.length;
      const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

      // Update candidate
      await storage.updateCandidate(candidateId, {
        completedAt: new Date(),
        score,
        status: "completed",
      });

      // Log completion event
      await storage.createProctorLog({
        candidateId,
        eventType: "exam_complete",
        severity: "low",
      });

      res.json({ message: "Exam submitted successfully", score });
    } catch (error) {
      console.error("Error submitting exam:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  // Proctor logs
  app.post("/api/proctor-logs", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertProctorLogSchema.parse(req.body);
      const log = await storage.createProctorLog(validatedData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "proctor_event", data: log }));
        }
      });

      res.json(log);
    } catch (error: any) {
      console.error("Error creating proctor log:", error);
      res.status(400).json({ message: error.message || "Failed to log event" });
    }
  });

  // Get individual candidate (for results page)
  app.get("/api/candidates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const candidate = await storage.getCandidate(id);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Allow access if user is admin or owns the candidate session
      if (user?.role !== "admin" && candidate.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const exam = await storage.getExam(candidate.examId);
      res.json({ ...candidate, exam });
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  // Analytics routes
  app.get("/api/analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allCandidates = await storage.getCandidates();
      const allExams = await storage.getExams();
      const allLogs = await storage.getProctorLogs();

      const completedCandidates = allCandidates.filter(c => c.status === "completed");
      const scores = completedCandidates.filter(c => c.score !== null).map(c => c.score!);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      // Status distribution
      const statusCounts = allCandidates.reduce((acc: any, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});
      const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Score distribution
      const scoreRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
      const scoreDistribution = scoreRanges.map(range => {
        const [min, max] = range.split('-').map(Number);
        const count = scores.filter(s => s >= min && s <= max).length;
        return { range, count };
      });

      // Completions over time (last 7 days)
      const today = new Date();
      const completionsOverTime = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        const completions = completedCandidates.filter(c => 
          c.completedAt && new Date(c.completedAt).toISOString().split('T')[0] === dateStr
        ).length;
        return { date: dateStr, completions };
      });

      // Violation types
      const violationCounts = allLogs.reduce((acc: any, log) => {
        acc[log.eventType] = (acc[log.eventType] || 0) + 1;
        return acc;
      }, {});
      const violationTypes = Object.entries(violationCounts).map(([type, count]) => ({ type, count }));

      // Exam performance
      const examPerformance = await Promise.all(allExams.map(async (exam) => {
        const examCandidates = allCandidates.filter(c => c.examId === exam.id);
        const examCompleted = examCandidates.filter(c => c.status === "completed");
        const examScores = examCompleted.filter(c => c.score !== null).map(c => c.score!);
        const avgScore = examScores.length > 0 ? examScores.reduce((a, b) => a + b, 0) / examScores.length : 0;
        const passingScore = 70; // Default passing score
        const passRate = examScores.length > 0 ? (examScores.filter(s => s >= passingScore).length / examScores.length * 100) : 0;
        const violations = allLogs.filter(log => examCandidates.some(c => c.id === log.candidateId)).length;

        return {
          examId: exam.id,
          title: exam.title,
          totalCandidates: examCandidates.length,
          completed: examCompleted.length,
          avgScore,
          passRate,
          violations,
        };
      }));

      res.json({
        totalExams: allExams.length,
        activeExams: allExams.filter(e => e.status === "active").length,
        totalCandidates: allCandidates.length,
        completedCandidates: completedCandidates.length,
        averageScore,
        totalViolations: allLogs.length,
        highSeverityViolations: allLogs.filter(l => l.severity === "high").length,
        statusDistribution,
        scoreDistribution,
        completionsOverTime,
        violationTypes,
        examPerformance,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Monitoring routes
  app.get("/api/monitoring/active", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = req.query.examId ? parseInt(req.query.examId as string) : undefined;
      
      // Fetch candidates based on exam ID filter
      let candidates;
      if (examId) {
        candidates = await storage.getCandidatesByExam(examId);
      } else {
        candidates = await storage.getCandidates();
      }
      
      const activeSessions = candidates.filter(c => c.status === "in_progress");

      const sessionsWithDetails = await Promise.all(
        activeSessions.map(async (candidate) => {
          const user = await storage.getUser(candidate.userId);
          const exam = await storage.getExam(candidate.examId);
          return { ...candidate, user, exam };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  app.get("/api/monitoring/logs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = req.query.examId ? parseInt(req.query.examId as string) : undefined;
      const logs = await storage.getProctorLogs();
      
      // Filter by exam ID if provided
      let filteredLogs = logs;
      if (examId) {
        const examCandidates = await storage.getCandidatesByExam(examId);
        const candidateIds = examCandidates.map(c => c.id);
        filteredLogs = logs.filter(log => candidateIds.includes(log.candidateId));
      }
      
      const logsWithDetails = await Promise.all(
        filteredLogs.slice(0, 20).map(async (log) => {
          const candidate = await storage.getCandidate(log.candidateId);
          let user = undefined;
          if (candidate) {
            user = await storage.getUser(candidate.userId);
          }
          return { ...log, candidate: candidate ? { ...candidate, user } : undefined };
        })
      );

      res.json(logsWithDetails);
    } catch (error) {
      console.error("Error fetching proctor logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Export all logs for an exam as CSV
  app.get("/api/monitoring/logs/export", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const examId = req.query.examId ? parseInt(req.query.examId as string) : undefined;
      
      if (!examId) {
        return res.status(400).json({ message: "Exam ID required" });
      }

      const logs = await storage.getProctorLogs();
      const examCandidates = await storage.getCandidatesByExam(examId);
      const candidateIds = examCandidates.map(c => c.id);
      const filteredLogs = logs.filter(log => candidateIds.includes(log.candidateId));
      
      const logsWithDetails = await Promise.all(
        filteredLogs.map(async (log) => {
          const candidate = await storage.getCandidate(log.candidateId);
          let user = undefined;
          if (candidate) {
            user = await storage.getUser(candidate.userId);
          }
          return { ...log, candidate: candidate ? { ...candidate, user } : undefined };
        })
      );

      res.json(logsWithDetails);
    } catch (error) {
      console.error("Error exporting proctor logs:", error);
      res.status(500).json({ message: "Failed to export logs" });
    }
  });

  // Check if email exists (admin only)
  app.get("/api/users/check-email", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await storage.getUserByEmail(email);
      res.json({ exists: !!user });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "Failed to check email" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/users/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, password } = req.body;
      
      if (!userId || !password) {
        return res.status(400).json({ message: "User ID and password required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUser(userId, { passwordHash });
      
      // Send email notification with new password
      const candidates = await storage.getCandidatesByUser(userId);
      if (candidates.length > 0 && user.email) {
        // Get the first assigned exam for email context
        const firstCandidate = candidates[0];
        const exam = await storage.getExam(firstCandidate.examId);
        
        if (exam) {
          try {
            await sendCandidateCredentials({
              email: user.email,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              password,
              examTitle: exam.title,
              examDuration: exam.duration,
            });
          } catch (emailError) {
            console.error(`Failed to send password reset email to ${user.email}:`, emailError);
            // Don't fail the request if email fails
          }
        }
      }
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Allow candidate to retake exam (admin only)
  app.post("/api/candidates/:id/allow-retake", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      // Reset candidate status to assigned and clear completion data
      // Note: Previous responses are kept as historical data
      await storage.updateCandidate(candidateId, {
        status: "assigned",
        startedAt: null,
        completedAt: null,
      });

      res.json({ success: true, message: "Candidate can now retake the exam" });
    } catch (error) {
      console.error("Error allowing retake:", error);
      res.status(500).json({ message: "Failed to allow retake" });
    }
  });

  // Catch-all 404 handler for undefined API routes
  app.all("/api/auth/register-admin", (_req, res) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time monitoring (referenced from javascript_websocket blueprint)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      console.log('Received:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
