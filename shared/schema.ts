import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  passwordHash: varchar("password_hash"),
  invitationToken: varchar("invitation_token"),
  invitedAt: timestamp("invited_at"),
  role: varchar("role", { enum: ["admin", "candidate"] }).notNull().default("candidate"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Domains table
export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDomainSchema = createInsertSchema(domains).omit({ id: true, createdAt: true });
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  type: varchar("type", { enum: ["multiple_choice", "true_false"] }).notNull().default("multiple_choice"),
  content: text("content").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctAnswer: varchar("correct_answer", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Exams table
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  questionCount: integer("question_count").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  showResults: varchar("show_results", { enum: ["immediate", "delayed", "hidden"] }).notNull().default("delayed"),
  status: varchar("status", { enum: ["draft", "active", "inactive"] }).notNull().default("draft"),
  enableWebcam: boolean("enable_webcam").notNull().default(true),
  enableTabDetection: boolean("enable_tab_detection").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

// Exam Questions (for randomization)
export const examQuestions = pgTable("exam_questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
});

export type ExamQuestion = typeof examQuestions.$inferSelect;

// Candidates (exam sessions)
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  randomSeed: varchar("random_seed", { length: 100 }).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  status: varchar("status", { enum: ["assigned", "in_progress", "completed", "auto_submitted"] }).notNull().default("assigned"),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Responses
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedAnswer: varchar("selected_answer", { length: 500 }),
  isCorrect: boolean("is_correct"),
  timeSpent: integer("time_spent"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;

// Proctor Logs
export const proctorLogs = pgTable("proctor_logs", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { enum: ["face_absent", "multiple_faces", "tab_switch", "external_voice", "exam_start", "exam_complete"] }).notNull(),
  severity: varchar("severity", { enum: ["low", "medium", "high"] }).notNull().default("low"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertProctorLogSchema = createInsertSchema(proctorLogs).omit({ id: true, timestamp: true });
export type InsertProctorLog = z.infer<typeof insertProctorLogSchema>;
export type ProctorLog = typeof proctorLogs.$inferSelect;

// Relations
export const domainsRelations = relations(domains, ({ many }) => ({
  questions: many(questions),
  exams: many(exams),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  domain: one(domains, {
    fields: [questions.domainId],
    references: [domains.id],
  }),
  examQuestions: many(examQuestions),
  responses: many(responses),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  domain: one(domains, {
    fields: [exams.domainId],
    references: [domains.id],
  }),
  examQuestions: many(examQuestions),
  candidates: many(candidates),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
  exam: one(exams, {
    fields: [candidates.examId],
    references: [exams.id],
  }),
  responses: many(responses),
  proctorLogs: many(proctorLogs),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  candidate: one(candidates, {
    fields: [responses.candidateId],
    references: [candidates.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
}));

export const proctorLogsRelations = relations(proctorLogs, ({ one }) => ({
  candidate: one(candidates, {
    fields: [proctorLogs.candidateId],
    references: [candidates.id],
  }),
}));
