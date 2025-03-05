// Popup script for QuizBuddy Chrome Extension

import { 
    User,
    Quiz,
    Question, 
    Answer,
    QuizAttempt,
    ContentType,
    PendingQuizContent
  } from './types';
  
  import {
    getCurrentUser,
    loginWithGoogle,
    createQuiz,
    getQuizQuestions,
    startQuizAttempt,
    submitQuizAnswer,
    completeQuizAttempt
  } from './apiService';

  interface PdfLink {
    text?: string;
    url: string;
  }
  
  // DOM Elements
  const authContainer = document.getElementById('auth-container')!;
  const loggedOutView = document.getElementById('logged-out-view')!;
  const loggedInView = document.getElementById('logged-in-view')!;
  const userEmailElement = document.getElementById('user-email')!;

  const loginButton = document.getElementById('login-button') as HTMLButtonElement;
  const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;
  const createQuizButton = document.getElementById('create-quiz-button') as HTMLButtonElement;
  const openDashboardButton = document.getElementById('open-dashboard-button') as HTMLButtonElement;
  const highlightPdfsButton = document.getElementById('highlight-pdfs-button') as HTMLButtonElement;

  const actionsContainer = document.getElementById('actions-container')!;
  const pdfLinksContainer = document.getElementById('pdf-links-container')!;
  const pdfLinksList = document.getElementById('pdf-links-list')!;
  
  const quizCreationContainer = document.getElementById('quiz-creation-container')!;
  const statusMessage = document.getElementById('status-message')!;
  
  const quizTakingContainer = document.getElementById('quiz-taking-container')!;
  
  const statusContainer = document.getElementById('status-container')!;
  const statusText = document.getElementById('status-text')!;
  
  // State
  let currentUser: User | null = null;
  let currentQuiz: Quiz | null = null;
  let currentQuestions: Question[] = [];
  let currentQuizAttempt: QuizAttempt | null = null;
  let currentQuestionIndex = 0;
  let userAnswers: Record<string, number> = {};
  
  // Initialize popup
  document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication status
    await checkAuthStatus();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if there's a pending quiz content
    await checkPendingQuizContent();
    
    // Scan for PDF links on the current page
    await scanForPdfLinks();
  });
  
  // Check authentication status
  async function checkAuthStatus(): Promise<void> {
    try {
      // Get current user from chrome storage
      const data = await chrome.storage.local.get(['user']);
      
      if (data.user) {
        currentUser = data.user;
        showLoggedInState();
      } else {
        showLoggedOutState();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showLoggedOutState();
    }
  }
  
  // Set up event listeners
  function setupEventListeners(): void {
    // Auth buttons
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    
    // Action buttons
    createQuizButton.addEventListener('click', handleCreateQuizFromCurrentPage);
    openDashboardButton.addEventListener('click', handleOpenDashboard);
    highlightPdfsButton.addEventListener('click', handleHighlightPdfs);
  }
  
  // Show logged in state
  function showLoggedInState(): void {
    loggedOutView.classList.add('hidden');
    loggedInView.classList.remove('hidden');
    actionsContainer.classList.remove('hidden');
    
    // Display user email
    if (currentUser) {
      userEmailElement.textContent = currentUser.email;
    }
  }
  
  // Show logged out state
  function showLoggedOutState(): void {
    loggedOutView.classList.remove('hidden');
    loggedInView.classList.add('hidden');
    actionsContainer.classList.add('hidden');
  }
  
  // Handle login
  async function handleLogin(): Promise<void> {
    try {
      loginButton.disabled = true;
      loginButton.textContent = 'Signing in...';
      
      const response = await loginWithGoogle();
      
      if (response.success && response.data) {
        currentUser = response.data;
        
        // Store user in chrome storage
        await chrome.storage.local.set({ user: currentUser });
        
        showLoggedInState();
      } else {
        showError('Login failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Login failed. Please try again.');
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = 'Sign in with Google';
    }
  }
  
  // Handle logout
  async function handleLogout(): Promise<void> {
    try {
      // Clear user data from storage
      await chrome.storage.local.remove(['user']);
      currentUser = null;
      
      // Show logged out state
      showLoggedOutState();
    } catch (error) {
      console.error('Logout error:', error);
      showError('Logout failed. Please try again.');
    }
  }
  
  // Handle create quiz from current page
  async function handleCreateQuizFromCurrentPage(): Promise<void> {
    try {
      // Show quiz creation state
      showQuizCreationState('Extracting page content...');
      
      // Send message to background script to create quiz from current page
      chrome.runtime.sendMessage({ action: 'createQuizFromCurrentPage' });
      
      // Listen for content ready message
      chrome.runtime.onMessage.addListener(async (message) => {
        if (message.action === 'contentReady') {
          // Get pending quiz content
          const data = await chrome.storage.local.get(['pendingQuizContent']);
          
          if (data.pendingQuizContent) {
            await createQuizFromContent(data.pendingQuizContent);
          }
        }
      });
    } catch (error) {
      console.error('Create quiz error:', error);
      showError('Failed to create quiz. Please try again.');
      hideQuizCreationState();
    }
  }
  
  // Handle open dashboard
  function handleOpenDashboard(): void {
    // Open dashboard in new tab
    chrome.tabs.create({ url: 'https://quizbuddy.dev/dashboard' });
  }
  
  // Handle highlight PDFs
  async function handleHighlightPdfs(): Promise<void> {
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab && currentTab.id) {
        // Send message to content script to highlight PDF links
        chrome.tabs.sendMessage(currentTab.id, { action: 'highlightPdfLinks' });
        
        // Update button text
        highlightPdfsButton.textContent = 'PDF Links Highlighted';
        highlightPdfsButton.disabled = true;
        
        // Re-enable after 3 seconds
        setTimeout(() => {
          highlightPdfsButton.textContent = 'Highlight PDF Links';
          highlightPdfsButton.disabled = false;
        }, 3000);
      }
    } catch (error) {
      console.error('Highlight PDFs error:', error);
      showError('Failed to highlight PDF links.');
    }
  }
  
  // Create quiz from content
  async function createQuizFromContent(content: PendingQuizContent): Promise<void> {
    try {
      showQuizCreationState('Creating quiz...');
      
      // Call API to create quiz
      const response = await createQuiz(content);
      
      if (response.success && response.data) {
        currentQuiz = response.data;
        
        // Show success message
        showSuccess(`Quiz "${currentQuiz.name}" created successfully!`);
        
        // Load quiz questions
        await loadQuizQuestions(currentQuiz.id);
      } else {
        showError('Failed to create quiz: ' + (response.error || 'Unknown error'));
        hideQuizCreationState();
      }
    } catch (error) {
      console.error('Create quiz error:', error);
      showError('Failed to create quiz. Please try again.');
      hideQuizCreationState();
    }
  }
  
  // Load quiz questions
  async function loadQuizQuestions(quizId: string): Promise<void> {
    try {
      showQuizCreationState('Loading quiz questions...');
      
      const response = await getQuizQuestions(quizId);
      
      if (response.success && response.data) {
        currentQuestions = response.data;
        
        // Start quiz attempt
        await startQuiz(quizId);
      } else {
        showError('Failed to load quiz questions: ' + (response.error || 'Unknown error'));
        hideQuizCreationState();
      }
    } catch (error) {
      console.error('Load questions error:', error);
      showError('Failed to load quiz questions. Please try again.');
      hideQuizCreationState();
    }
  }
  
  // Start quiz
  async function startQuiz(quizId: string): Promise<void> {
    try {
      showQuizCreationState('Starting quiz...');
      
      const response = await startQuizAttempt(quizId);
      
      if (response.success && response.data) {
        currentQuizAttempt = response.data;
        currentQuestionIndex = 0;
        userAnswers = {};
        
        // Hide creation state and show quiz
        hideQuizCreationState();
        showQuizQuestion();
      } else {
        showError('Failed to start quiz: ' + (response.error || 'Unknown error'));
        hideQuizCreationState();
      }
    } catch (error) {
      console.error('Start quiz error:', error);
      showError('Failed to start quiz. Please try again.');
      hideQuizCreationState();
    }
  }
  
  // Show quiz question
  function showQuizQuestion(): void {
    if (!currentQuestions || currentQuestions.length === 0 || currentQuestionIndex >= currentQuestions.length) {
      completeQuiz();
      return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    
    // Clear previous content
    quizTakingContainer.innerHTML = '';
    quizTakingContainer.classList.remove('hidden');
    
    // Create question element
    const questionElement = document.createElement('div');
    questionElement.className = 'quiz-question';
    
    // Question text
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}: ${question.questionText}`;
    questionElement.appendChild(questionText);
    
    // Randomize answer order
    const shuffledAnswers = [...question.answers].sort(() => Math.random() - 0.5);
    
    // Answer options
    shuffledAnswers.forEach((answer) => {
      const answerOption = document.createElement('div');
      answerOption.className = 'answer-option';
      answerOption.dataset.answerNumber = answer.answerNumber.toString();
      
      // Check if this answer was previously selected
      if (userAnswers[question.id] === answer.answerNumber) {
        answerOption.classList.add('selected');
      }
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${question.id}`;
      radio.className = 'answer-radio';
      radio.value = answer.answerNumber.toString();
      
      // Check if this answer was previously selected
      if (userAnswers[question.id] === answer.answerNumber) {
        radio.checked = true;
      }
      
      const answerText = document.createElement('div');
      answerText.className = 'answer-text';
      answerText.textContent = answer.answerText;
      
      answerOption.appendChild(radio);
      answerOption.appendChild(answerText);
      
      // Add click handler
      answerOption.addEventListener('click', () => {
        // Unselect all options
        document.querySelectorAll('.answer-option').forEach((el) => {
          el.classList.remove('selected');
        });
        
        // Select this option
        answerOption.classList.add('selected');
        radio.checked = true;
        
        // Save answer
        userAnswers[question.id] = answer.answerNumber;
      });
      
      questionElement.appendChild(answerOption);
    });
    
    // Navigation buttons
    const navButtons = document.createElement('div');
    navButtons.className = 'quiz-navigation';
    
    // Previous button
    if (currentQuestionIndex > 0) {
      const prevButton = document.createElement('button');
      prevButton.className = 'secondary-button';
      prevButton.style.width = '48%';
      prevButton.textContent = 'Previous';
      prevButton.addEventListener('click', () => {
        currentQuestionIndex--;
        showQuizQuestion();
      });
      navButtons.appendChild(prevButton);
    }
    
    // Next/Submit button
    const nextButton = document.createElement('button');
    nextButton.className = 'primary-button';
    nextButton.style.width = currentQuestionIndex > 0 ? '48%' : '100%';
    
    if (currentQuestionIndex === currentQuestions.length - 1) {
      nextButton.textContent = 'Submit Quiz';
      nextButton.addEventListener('click', () => {
        // Only allow submit if an answer is selected
        if (userAnswers[question.id]) {
          completeQuiz();
        } else {
          showError('Please select an answer before submitting.');
        }
      });
    } else {
      nextButton.textContent = 'Next';
      nextButton.addEventListener('click', () => {
        // Only allow next if an answer is selected
        if (userAnswers[question.id]) {
          currentQuestionIndex++;
          showQuizQuestion();
        } else {
          showError('Please select an answer before continuing.');
        }
      });
    }
    
    navButtons.appendChild(nextButton);
    questionElement.appendChild(navButtons);
    
    // Add to container
    quizTakingContainer.appendChild(questionElement);
  }
  
  // Complete quiz
  async function completeQuiz(): Promise<void> {
    try {
      if (!currentQuizAttempt) return;
      
      // Show loading state
      quizTakingContainer.innerHTML = '<div class="loader"></div><p>Submitting quiz...</p>';
      
      // Submit quiz attempt
      const response = await completeQuizAttempt(currentQuizAttempt.id);
      
      if (response.success && response.data) {
        const quizResult = response.data;
        
        // Show results
        showQuizResults(quizResult);
      } else {
        showError('Failed to submit quiz: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Complete quiz error:', error);
      showError('Failed to submit quiz. Please try again.');
    }
  }
  
  // Show quiz results
  function showQuizResults(quizAttempt: QuizAttempt): void {
    // Clear container
    quizTakingContainer.innerHTML = '';
    
    // Create result element
    const resultElement = document.createElement('div');
    resultElement.className = 'quiz-result';
    
    // Calculate score percentage
    const scorePercent = quizAttempt.score !== undefined && quizAttempt.totalQuestions > 0
      ? Math.round((quizAttempt.score / quizAttempt.totalQuestions) * 100)
      : 0;
    
    // Result header
    const resultHeader = document.createElement('h2');
    resultHeader.textContent = 'Quiz Results';
    resultElement.appendChild(resultHeader);
    
    // Score
    const scoreText = document.createElement('p');
    scoreText.textContent = 'Your score:';
    resultElement.appendChild(scoreText);
    
    const scoreValue = document.createElement('div');
    scoreValue.className = 'score-value';
    scoreValue.textContent = `${scorePercent}%`;
    resultElement.appendChild(scoreValue);
    
    const scoreDetails = document.createElement('p');
    scoreDetails.textContent = `${quizAttempt.score} out of ${quizAttempt.totalQuestions} questions correct`;
    resultElement.appendChild(scoreDetails);
    
    // Buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.marginTop = '20px';
    
    // Retake quiz button
    const retakeButton = document.createElement('button');
    retakeButton.className = 'primary-button';
    retakeButton.textContent = 'Retake Quiz';
    retakeButton.addEventListener('click', async () => {
      if (currentQuiz) {
        await startQuiz(currentQuiz.id);
      }
    });
    buttonsContainer.appendChild(retakeButton);
    
    // View answers button
    const viewAnswersButton = document.createElement('button');
    viewAnswersButton.className = 'secondary-button';
    viewAnswersButton.textContent = 'View Answers';
    viewAnswersButton.addEventListener('click', () => {
      showQuizAnswers();
    });
    buttonsContainer.appendChild(viewAnswersButton);
    
    // Return to dashboard button
    const dashboardButton = document.createElement('button');
    dashboardButton.className = 'secondary-button';
    dashboardButton.textContent = 'Go to Dashboard';
    dashboardButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://quizbuddy.dev/dashboard' });
    });
    buttonsContainer.appendChild(dashboardButton);
    
    resultElement.appendChild(buttonsContainer);
    quizTakingContainer.appendChild(resultElement);
  }
  
  // Show quiz answers
  function showQuizAnswers(): void {
    if (!currentQuestions || currentQuestions.length === 0) return;
    
    // Clear container
    quizTakingContainer.innerHTML = '';
    
    // Create header
    const header = document.createElement('h2');
    header.textContent = 'Quiz Answers';
    header.style.marginBottom = '20px';
    quizTakingContainer.appendChild(header);
    
    // Create answers container
    const answersContainer = document.createElement('div');
    answersContainer.className = 'answers-container';
    
    // Add each question and answers
    currentQuestions.forEach((question, index) => {
      const questionElement = document.createElement('div');
      questionElement.className = 'quiz-question';
      questionElement.style.marginBottom = '30px';
      
      // Question text
      const questionText = document.createElement('div');
      questionText.className = 'question-text';
      questionText.textContent = `Question ${index + 1}: ${question.questionText}`;
      questionElement.appendChild(questionText);
      
      // User's answer
      const userAnswer = userAnswers[question.id];
      const userAnswerObj = question.answers.find(a => a.answerNumber === userAnswer);
      
      // Correct answer
      const correctAnswer = question.answers.find(a => a.isCorrect);
      
      // User's answer box
      const userAnswerBox = document.createElement('div');
      userAnswerBox.className = 'answer-box';
      userAnswerBox.style.padding = '10px';
      userAnswerBox.style.margin = '10px 0';
      userAnswerBox.style.borderRadius = '4px';
      userAnswerBox.style.backgroundColor = userAnswer === correctAnswer?.answerNumber ? '#DFF0D8' : '#F2DEDE';
      
      const userAnswerLabel = document.createElement('div');
      userAnswerLabel.style.fontWeight = 'bold';
      userAnswerLabel.textContent = 'Your Answer:';
      userAnswerBox.appendChild(userAnswerLabel);
      
      const userAnswerText = document.createElement('div');
      userAnswerText.textContent = userAnswerObj ? userAnswerObj.answerText : 'No answer selected';
      userAnswerBox.appendChild(userAnswerText);
      
      questionElement.appendChild(userAnswerBox);
      
      // If user's answer is wrong, show the correct answer
      if (userAnswer !== correctAnswer?.answerNumber) {
        const correctAnswerBox = document.createElement('div');
        correctAnswerBox.className = 'answer-box';
        correctAnswerBox.style.padding = '10px';
        correctAnswerBox.style.margin = '10px 0';
        correctAnswerBox.style.borderRadius = '4px';
        correctAnswerBox.style.backgroundColor = '#DFF0D8';
        
        const correctAnswerLabel = document.createElement('div');
        correctAnswerLabel.style.fontWeight = 'bold';
        correctAnswerLabel.textContent = 'Correct Answer:';
        correctAnswerBox.appendChild(correctAnswerLabel);
        
        const correctAnswerText = document.createElement('div');
        correctAnswerText.textContent = correctAnswer ? correctAnswer.answerText : '';
        correctAnswerBox.appendChild(correctAnswerText);
        
        questionElement.appendChild(correctAnswerBox);
      }
      
      // Explanation
      if (userAnswerObj) {
        const explanationBox = document.createElement('div');
        explanationBox.className = 'explanation-box';
        explanationBox.style.padding = '10px';
        explanationBox.style.margin = '10px 0';
        explanationBox.style.borderRadius = '4px';
        explanationBox.style.backgroundColor = '#F5F5F5';
        
        const explanationLabel = document.createElement('div');
        explanationLabel.style.fontWeight = 'bold';
        explanationLabel.textContent = 'Explanation:';
        explanationBox.appendChild(explanationLabel);
        
        const explanationText = document.createElement('div');
        explanationText.textContent = userAnswerObj.explanation;
        explanationBox.appendChild(explanationText);
        
        // Quote from source
        if (userAnswerObj.quote) {
          const quoteLabel = document.createElement('div');
          quoteLabel.style.fontWeight = 'bold';
          quoteLabel.style.marginTop = '10px';
          quoteLabel.textContent = 'From the content:';
          explanationBox.appendChild(quoteLabel);
          
          const quoteText = document.createElement('div');
          quoteText.style.fontStyle = 'italic';
          quoteText.style.borderLeft = '3px solid #DDD';
          quoteText.style.paddingLeft = '10px';
          quoteText.style.margin = '5px 0';
          quoteText.textContent = userAnswerObj.quote;
          explanationBox.appendChild(quoteText);
        }
        
        questionElement.appendChild(explanationBox);
      }
      
      answersContainer.appendChild(questionElement);
    });
    
    quizTakingContainer.appendChild(answersContainer);
    
    // Back to results button
    const backButton = document.createElement('button');
    backButton.className = 'primary-button';
    backButton.textContent = 'Back to Results';
    backButton.addEventListener('click', () => {
      if (currentQuizAttempt) {
        showQuizResults(currentQuizAttempt);
      }
    });
    quizTakingContainer.appendChild(backButton);
  }
  
  // Check for pending quiz content
  async function checkPendingQuizContent(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(['pendingQuizContent']);
      
      if (data.pendingQuizContent) {
        // We have pending content, create a quiz from it
        await createQuizFromContent(data.pendingQuizContent);
        
        // Clear the pending content
        await chrome.storage.local.remove(['pendingQuizContent']);
      }
    } catch (error) {
      console.error('Check pending content error:', error);
    }
  }
  
  // Scan for PDF links on the current page
  async function scanForPdfLinks(): Promise<void> {
    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab && currentTab.id) {
        // Send message to content script to get PDF links
        chrome.tabs.sendMessage(currentTab.id, { action: 'getPdfLinks' }, (response) => {
          if (response && response.pdfLinks && response.pdfLinks.length > 0) {
            // Show PDF links container
            pdfLinksContainer.classList.remove('hidden');
            
            // Clear list
            pdfLinksList.innerHTML = '';
            
            // Add each PDF link to the list
            response.pdfLinks.forEach((link: PdfLink) => {
              const li = document.createElement('li');
              li.textContent = link.text || 'PDF Link';
              li.title = link.url;
              
              // Add click handler
              li.addEventListener('click', () => {
                // Create quiz from this PDF
                chrome.storage.local.set({
                  pendingQuizContent: {
                    type: ContentType.PDF,
                    url: link.url,
                    name: link.text || getPdfNameFromUrl(link.url)
                  }
                }, () => {
                  checkPendingQuizContent();
                });
              });
              
              pdfLinksList.appendChild(li);
            });
          }
        });
      }
    } catch (error) {
      console.error('Scan for PDF links error:', error);
    }
  }
  
  // Get PDF name from URL
  function getPdfNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Remove .pdf extension if present
      return fileName.replace('.pdf', '');
    } catch (e) {
      return 'Unnamed PDF';
    }
  }
  
  // Show quiz creation state
  function showQuizCreationState(message: string): void {
    quizCreationContainer.classList.remove('hidden');
    actionsContainer.classList.add('hidden');
    quizTakingContainer.classList.add('hidden');
    
    // Update status message
    statusMessage.textContent = message;
  }
  
  // Hide quiz creation state
  function hideQuizCreationState(): void {
    quizCreationContainer.classList.add('hidden');
  }
  
  // Show error message
  function showError(message: string): void {
    statusContainer.classList.remove('hidden');
    statusContainer.className = 'error-message';
    statusText.textContent = message;
    
    // Hide after 5 seconds
    setTimeout(() => {
      statusContainer.classList.add('hidden');
    }, 5000);
  }
  
  // Show success message
  function showSuccess(message: string): void {
    statusContainer.classList.remove('hidden');
    statusContainer.className = 'success-message';
    statusText.textContent = message;
    
    // Hide after 5 seconds
    setTimeout(() => {
      statusContainer.classList.add('hidden');
    }, 5000);
  }