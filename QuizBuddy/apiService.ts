// API service for QuizBuddy Chrome Extension

import { User, Quiz, Question, Answer, QuizAttempt, QuizAnswer, ContentType, APIResponse, PendingQuizContent } from './types';

// API base URL - would come from environment in production
const API_BASE_URL = 'https://api.quizbuddy.dev';

// Get authentication token
async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true });
    return result && result.token ? result.token : null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<APIResponse<T>> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: responseData.error || `API Error: ${response.status}` 
      };
    }
    
    return { success: true, data: responseData };
  } catch (error) {
    console.error('API request error:', error);
    return { success: false, error: 'Network error' };
  }
}

// Authentication and user functions
export async function getCurrentUser(): Promise<APIResponse<User>> {
  return await apiRequest<User>('/user/current');
}

export async function loginWithGoogle(): Promise<APIResponse<User>> {
  const token = await getAuthToken();
  
  if (!token) {
    return { success: false, error: 'Google authentication failed' };
  }
  
  return await apiRequest<User>('/auth/google', 'POST', { token });
}

// Quiz functions
export async function createQuiz(content: PendingQuizContent): Promise<APIResponse<Quiz>> {
  return await apiRequest<Quiz>('/quiz/create', 'POST', content);
}

export async function getQuiz(quizId: string): Promise<APIResponse<Quiz>> {
  return await apiRequest<Quiz>(`/quiz/${quizId}`);
}

export async function getUserQuizzes(): Promise<APIResponse<Quiz[]>> {
  return await apiRequest<Quiz[]>('/quiz/user');
}

// Question functions
export async function getQuizQuestions(quizId: string): Promise<APIResponse<Question[]>> {
  return await apiRequest<Question[]>(`/quiz/${quizId}/questions`);
}

// Quiz attempt functions
export async function startQuizAttempt(quizId: string): Promise<APIResponse<QuizAttempt>> {
  return await apiRequest<QuizAttempt>('/quiz-attempt/start', 'POST', { quizId });
}

export async function submitQuizAnswer(
  quizAttemptId: string,
  questionId: string,
  answerSelected: number
): Promise<APIResponse<QuizAnswer>> {
  return await apiRequest<QuizAnswer>('/quiz-attempt/answer', 'POST', {
    quizAttemptId,
    questionId,
    answerSelected
  });
}

export async function completeQuizAttempt(quizAttemptId: string): Promise<APIResponse<QuizAttempt>> {
  return await apiRequest<QuizAttempt>(`/quiz-attempt/${quizAttemptId}/complete`, 'POST');
}