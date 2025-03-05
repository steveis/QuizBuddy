// API service for QuizBuddy Chrome Extension
// API base URL - would come from environment in production
const API_BASE_URL = 'https://api.quizbuddy.dev';
// Get authentication token
async function getAuthToken() {
    try {
        const result = await chrome.identity.getAuthToken({ interactive: true });
        return result && result.token ? result.token : null;
    }
    catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}
// Generic API request function
async function apiRequest(endpoint, method = 'GET', data) {
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
    }
    catch (error) {
        console.error('API request error:', error);
        return { success: false, error: 'Network error' };
    }
}
// Authentication and user functions
export async function getCurrentUser() {
    return await apiRequest('/user/current');
}
export async function loginWithGoogle() {
    const token = await getAuthToken();
    if (!token) {
        return { success: false, error: 'Google authentication failed' };
    }
    return await apiRequest('/auth/google', 'POST', { token });
}
// Quiz functions
export async function createQuiz(content) {
    return await apiRequest('/quiz/create', 'POST', content);
}
export async function getQuiz(quizId) {
    return await apiRequest(`/quiz/${quizId}`);
}
export async function getUserQuizzes() {
    return await apiRequest('/quiz/user');
}
// Question functions
export async function getQuizQuestions(quizId) {
    return await apiRequest(`/quiz/${quizId}/questions`);
}
// Quiz attempt functions
export async function startQuizAttempt(quizId) {
    return await apiRequest('/quiz-attempt/start', 'POST', { quizId });
}
export async function submitQuizAnswer(quizAttemptId, questionId, answerSelected) {
    return await apiRequest('/quiz-attempt/answer', 'POST', {
        quizAttemptId,
        questionId,
        answerSelected
    });
}
export async function completeQuizAttempt(quizAttemptId) {
    return await apiRequest(`/quiz-attempt/${quizAttemptId}/complete`, 'POST');
}
