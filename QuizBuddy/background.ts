// Background script for QuizBuddy Chrome Extension

import { User, Quiz, ContentType } from './types';

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('QuizBuddy extension installed');
  
  // Create context menu for PDF links
  chrome.contextMenus.create({
    id: 'quizbuddyPdf',
    title: 'Create QuizBuddy Quiz from PDF',
    contexts: ['link'],
    documentUrlPatterns: ['*://*/*'],
    targetUrlPatterns: ['*://*/*.pdf']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'quizbuddyPdf' && info.linkUrl) {
    // Handle PDF link click
    console.log('Creating quiz from PDF:', info.linkUrl);
    
    // Send message to popup to create quiz from PDF URL
    chrome.storage.local.set({ 
      pendingQuizContent: {
        type: ContentType.PDF,
        url: info.linkUrl,
        name: getPdfNameFromUrl(info.linkUrl)
      }
    });
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'createQuizFromCurrentPage') {
    // Get current tab URL and title
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.url && currentTab.title && currentTab.id !== undefined) {
        // Get page content via content script
        chrome.tabs.sendMessage(currentTab.id, { action: 'getPageContent' }, (response) => {
          if (response && response.content) {
            // Store current page info for processing
            chrome.storage.local.set({
              pendingQuizContent: {
                type: ContentType.HTML,
                url: currentTab.url,
                name: currentTab.title,
                content: response.content
              }
            });
            
            // Notify popup that content is ready
            chrome.runtime.sendMessage({ action: 'contentReady' });
          }
        });
      }
    });
    return true; // Indicates async response
  }
  
  if (message.action === 'checkAuthentication') {
    // Check if user is authenticated
    chrome.storage.local.get(['user'], (result) => {
      if (result.user) {
        sendResponse({ authenticated: true, user: result.user });
      } else {
        sendResponse({ authenticated: false });
      }
    });
    return true; // Indicates async response
  }
});

// Helper function to extract PDF name from URL
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

// Handle auth changes
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  if (signedIn) {
    // Update user info
    fetchUserInfo();
  } else {
    // Clear user data
    chrome.storage.local.remove(['user']);
  }
});

// Fetch user info from API
async function fetchUserInfo() {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true });
    const token = result && result.token ? result.token : null;
    
    if (token) {
      // TODO: Implement actual API call to QuizBuddy backend
      // For now, store placeholder user data
      const placeholderUser: User = {
        id: 'user123',
        email: 'user@example.com',
        domains: ['*']
      };
      
      chrome.storage.local.set({ user: placeholderUser });
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }
}