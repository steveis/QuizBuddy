// Type definitions for QuizBuddy Chrome Extension

export enum ContentType {
    HTML = 'html',
    PDF = 'pdf',
    WORD = 'word',
    TEXT = 'text'
  }
  
  export interface User {
    id: string;
    email: string;
    domains: string[];
    isSuperUser?: boolean;
  }
  
  export interface Quiz {
    id: string;
    name: string;
    contentType: ContentType;
    contentUrl: string;
    version: number;
    s3BucketId?: string;
    createdBy: string;
    createdAt: Date;
    domains: string[];
  }
  
  export interface Question {
    id: string;
    quizId: string;
    questionText: string;
    answers: Answer[];
  }
  
  export interface Answer {
    id: string;
    questionId: string;
    answerNumber: number;
    answerText: string;
    isCorrect: boolean;
    explanation: string;
    quote: string;
    sentenceAfterQuote: string;
    quoteFoundInSource: boolean;
    sentenceAfterQuoteFoundInSource: boolean;
  }
  
  export interface QuizAttempt {
    id: string;
    userId: string;
    quizId: string;
    startedAt: Date;
    completedAt?: Date;
    score?: number;
    totalQuestions: number;
  }
  
  export interface QuizAnswer {
    id: string;
    quizAttemptId: string;
    questionId: string;
    answerSelected: number;
    timestamp: Date;
  }
  
  export interface PendingQuizContent {
    type: ContentType;
    url: string;
    name: string;
    content?: string;
  }
  
  export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
