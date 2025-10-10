// Storage layer using DatabaseStorage with PostgreSQL (referenced from javascript_database blueprint)
import {
  users,
  domains,
  questions,
  exams,
  examQuestions,
  candidates,
  responses,
  proctorLogs,
  type User,
  type UpsertUser,
  type Domain,
  type InsertDomain,
  type Question,
  type InsertQuestion,
  type Exam,
  type InsertExam,
  type Candidate,
  type InsertCandidate,
  type Response,
  type InsertResponse,
  type ProctorLog,
  type InsertProctorLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByInvitationToken(token: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  setUserPassword(id: string, passwordHash: string): Promise<User>;
  setInvitationToken(id: string, token: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User>;
  updateUserRole(id: string, role: "admin" | "candidate"): Promise<User>;

  // Domain operations
  getDomains(): Promise<Domain[]>;
  getDomain(id: number): Promise<Domain | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;

  // Question operations
  getQuestions(): Promise<Question[]>;
  getQuestionsByDomain(domainId: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;

  // Exam operations
  getExams(): Promise<Exam[]>;
  getExam(id: number): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  createExamWithQuestions(exam: InsertExam, questions: InsertQuestion[]): Promise<Exam>;
  updateExam(id: number, exam: Partial<InsertExam>): Promise<Exam>;
  getExamQuestions(examId: number): Promise<Question[]>;
  addQuestionsToExam(examId: number, questions: InsertQuestion[]): Promise<void>;

  // Candidate operations
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidatesByUser(userId: string): Promise<Candidate[]>;
  getCandidatesByExam(examId: number): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;

  // Response operations
  getResponses(candidateId: number): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  updateResponse(id: number, response: Partial<InsertResponse>): Promise<Response>;

  // Proctor log operations
  getProctorLogs(candidateId?: number): Promise<ProctorLog[]>;
  createProctorLog(log: InsertProctorLog): Promise<ProctorLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByInvitationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.invitationToken, token));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async setUserPassword(id: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        passwordHash, 
        invitationToken: null,
        invitedAt: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setInvitationToken(id: string, token: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        invitationToken: token,
        invitedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingByEmail = await this.getUserByEmail(userData.email!);
    
    if (existingByEmail && existingByEmail.id !== userData.id) {
      const [updated] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id))
        .returning();
      return updated;
    }
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: "admin" | "candidate"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Domain operations
  async getDomains(): Promise<Domain[]> {
    return await db.select().from(domains).orderBy(desc(domains.createdAt));
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id));
    return domain;
  }

  async createDomain(domainData: InsertDomain): Promise<Domain> {
    const [domain] = await db
      .insert(domains)
      .values(domainData)
      .returning();
    return domain;
  }

  // Question operations
  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions).orderBy(desc(questions.createdAt));
  }

  async getQuestionsByDomain(domainId: number): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.domainId, domainId))
      .orderBy(desc(questions.createdAt));
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values({
        ...questionData,
        options: questionData.options as any,
      })
      .returning();
    return question;
  }

  // Exam operations
  async getExams(): Promise<Exam[]> {
    return await db.select().from(exams).orderBy(desc(exams.createdAt));
  }

  async getExam(id: number): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async createExam(examData: InsertExam): Promise<Exam> {
    const [exam] = await db
      .insert(exams)
      .values(examData)
      .returning();
    return exam;
  }

  async createExamWithQuestions(examData: InsertExam, questionsData: InsertQuestion[]): Promise<Exam> {
    const exam = await db.transaction(async (tx) => {
      const [newExam] = await tx
        .insert(exams)
        .values(examData)
        .returning();
      
      if (questionsData && questionsData.length > 0) {
        const createdQuestions = await tx
          .insert(questions)
          .values(questionsData.map(q => ({
            ...q,
            options: q.options as any,
          })))
          .returning();
        
        const examQuestionLinks = createdQuestions.map((q, index) => ({
          examId: newExam.id,
          questionId: q.id,
          orderIndex: index,
        }));
        
        await tx.insert(examQuestions).values(examQuestionLinks);
      }
      
      return newExam;
    });
    
    return exam;
  }

  async updateExam(id: number, examData: Partial<InsertExam>): Promise<Exam> {
    const [exam] = await db
      .update(exams)
      .set(examData)
      .where(eq(exams.id, id))
      .returning();
    return exam;
  }

  async getExamQuestions(examId: number): Promise<Question[]> {
    const result = await db
      .select({
        question: questions,
        orderIndex: examQuestions.orderIndex,
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(eq(examQuestions.examId, examId))
      .orderBy(examQuestions.orderIndex);
    
    return result.map(r => r.question);
  }

  async addQuestionsToExam(examId: number, questionsData: InsertQuestion[]): Promise<void> {
    await db.transaction(async (tx) => {
      const existingLinks = await tx
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, examId));
      
      const nextOrderIndex = existingLinks.length;
      
      const createdQuestions = await tx
        .insert(questions)
        .values(questionsData.map(q => ({
          ...q,
          options: q.options as any,
        })))
        .returning();
      
      const examQuestionLinks = createdQuestions.map((q, index) => ({
        examId: examId,
        questionId: q.id,
        orderIndex: nextOrderIndex + index,
      }));
      
      await tx.insert(examQuestions).values(examQuestionLinks);
      
      const newQuestionCount = existingLinks.length + createdQuestions.length;
      await tx
        .update(exams)
        .set({ questionCount: newQuestionCount })
        .where(eq(exams.id, examId));
    });
  }

  // Candidate operations
  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates);
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async getCandidatesByUser(userId: string): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.userId, userId));
  }

  async getCandidatesByExam(examId: number): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.examId, examId));
  }

  async createCandidate(candidateData: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(candidateData)
      .returning();
    return candidate;
  }

  async updateCandidate(id: number, candidateData: Partial<InsertCandidate>): Promise<Candidate> {
    const [candidate] = await db
      .update(candidates)
      .set(candidateData)
      .where(eq(candidates.id, id))
      .returning();
    return candidate;
  }

  // Response operations
  async getResponses(candidateId: number): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.candidateId, candidateId));
  }

  async createResponse(responseData: InsertResponse): Promise<Response> {
    const [response] = await db
      .insert(responses)
      .values(responseData)
      .returning();
    return response;
  }

  async updateResponse(id: number, responseData: Partial<InsertResponse>): Promise<Response> {
    const [response] = await db
      .update(responses)
      .set(responseData)
      .where(eq(responses.id, id))
      .returning();
    return response;
  }

  // Proctor log operations
  async getProctorLogs(candidateId?: number): Promise<ProctorLog[]> {
    if (candidateId) {
      return await db
        .select()
        .from(proctorLogs)
        .where(eq(proctorLogs.candidateId, candidateId))
        .orderBy(desc(proctorLogs.timestamp));
    }
    return await db.select().from(proctorLogs).orderBy(desc(proctorLogs.timestamp));
  }

  async createProctorLog(logData: InsertProctorLog): Promise<ProctorLog> {
    const [log] = await db
      .insert(proctorLogs)
      .values(logData)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
