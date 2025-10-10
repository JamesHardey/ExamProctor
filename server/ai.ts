// Reference: blueprint:javascript_openai
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user

import OpenAI from "openai";
import type { InsertQuestion } from "@shared/schema";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface GenerateQuestionsParams {
  domainId: number;
  examTitle: string;
  examDescription: string;
  domainName: string;
  questionCount: number;
}

interface AIQuestion {
  type: "multiple_choice" | "true_false";
  content: string;
  options: string[];
  correctAnswer: string;
}

export async function generateQuestionsWithAI(
  params: GenerateQuestionsParams
): Promise<InsertQuestion[]> {
  const { domainId, examTitle, examDescription, domainName, questionCount } = params;

  const prompt = `You are an expert exam question generator. Generate ${questionCount} exam questions based on the following information:

Exam Title: ${examTitle}
Domain: ${domainName}
Description: ${examDescription}

Requirements:
1. Generate a mix of multiple choice and true/false questions
2. For multiple choice questions, provide 3-4 options with one correct answer
3. Questions should be relevant to the domain and exam topic
4. Ensure questions are clear, concise, and academically sound
5. Vary difficulty levels appropriately

Respond with a JSON object in this exact format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "content": "question text here",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "the correct option text"
    },
    {
      "type": "true_false",
      "content": "question text here",
      "options": ["True", "False"],
      "correctAnswer": "True" or "False"
    }
  ]
}`;

  try {
    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert educational assessment creator. Generate high-quality exam questions in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error("Invalid response format from AI");
    }

    // Convert AI questions to database format
    // Note: options must be JSON string for database schema
    const questions: InsertQuestion[] = result.questions.map((q: AIQuestion) => ({
      domainId,
      type: q.type,
      content: q.content,
      options: JSON.stringify(q.options),
      correctAnswer: q.correctAnswer,
    }));

    return questions;
  } catch (error) {
    console.error("AI question generation error:", error);
    throw new Error(`Failed to generate questions with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
