// API routes with Replit Auth and WebSocket support (referenced from javascript_websocket and javascript_log_in_with_replit blueprints)
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import {
  insertDomainSchema,
  insertQuestionSchema,
  insertExamSchema,
  insertCandidateSchema,
  insertResponseSchema,
  insertProctorLogSchema,
} from "@shared/schema";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      const validatedData = insertExamSchema.parse(req.body);
      const exam = await storage.createExam(validatedData);
      res.json(exam);
    } catch (error: any) {
      console.error("Error creating exam:", error);
      res.status(400).json({ message: error.message || "Failed to create exam" });
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
      res.json(candidate);
    } catch (error: any) {
      console.error("Error creating candidate:", error);
      res.status(400).json({ message: error.message || "Failed to assign exam" });
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

      const userId = req.user.claims.sub;
      if (candidate.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
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

  // My exams (for candidates)
  app.get("/api/my-exams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const candidates = await storage.getCandidatesByUser(userId);
      
      const candidatesWithExams = await Promise.all(
        candidates.map(async (candidate) => {
          const exam = await storage.getExam(candidate.examId);
          return { ...candidate, exam };
        })
      );

      res.json(candidatesWithExams);
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
      const userId = req.user.claims.sub;
      if (candidate.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const exam = await storage.getExam(candidate.examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
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

      const userId = req.user.claims.sub;
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

      const userId = req.user.claims.sub;
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

  // Monitoring routes
  app.get("/api/monitoring/active", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
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
      const logs = await storage.getProctorLogs();
      
      const logsWithDetails = await Promise.all(
        logs.slice(0, 20).map(async (log) => {
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
