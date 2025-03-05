// Content script for QuizBuddy Chrome Extension

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageContent') {
      // Extract relevant content from the current page
      const content = extractPageContent();
      sendResponse({ content });
    }
    
    if (message.action === 'highlightPdfLinks') {
      // Highlight PDF links on the page
      highlightPdfLinks();
      sendResponse({ success: true });
    }
  });
  
  // Extract relevant content from page
  function extractPageContent(): string {
    // Get main content - this is a simple implementation that could be enhanced
    // with better content extraction algorithms
    
    // Try to find main content containers
    const mainSelectors = [
      'main',
      'article',
      '#content',
      '.content',
      '.main-content',
      '.post-content',
      '.article-content'
    ];
    
    let mainContent = '';
    
    // Try each selector to find main content
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 500) {
        mainContent = element.innerHTML;
        break;
      }
    }
    
    // If no main content found, use body as fallback
    if (!mainContent) {
      // Remove script tags, style tags, and other non-content elements
      const body = document.body.cloneNode(true) as HTMLElement;
      
      // Remove scripts, styles, and other non-content elements
      const elementsToRemove = body.querySelectorAll('script, style, nav, header, footer, aside, iframe, .ads, .banner, .comments, .navigation');
      elementsToRemove.forEach(el => el.remove());
      
      mainContent = body.innerHTML;
    }
    
    // Prepare content for linearization
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = mainContent;
    
    // Extract text content with basic HTML structure
    // Convert content to simplified HTML
    return processContentForQuiz(tempDiv);
  }
  
  // Process content for quiz generation
  function processContentForQuiz(element: HTMLElement): string {
    // Keep only the elements that contain content relevant for quizzes
    const relevantContent: string[] = [];
    
    // Process headings, paragraphs, and lists
    const contentElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, li, table');
    contentElements.forEach(el => {
      if (el.textContent && el.textContent.trim().length > 0) {
        relevantContent.push(el.outerHTML);
      }
    });
    
    return relevantContent.join('\\n');
  }
  
  // Highlight PDF links on the page
  function highlightPdfLinks(): void {
    // Find all PDF links
    const pdfLinks = document.querySelectorAll('a[href$=".pdf"]');
    
    // Add visual indicator to PDF links
    pdfLinks.forEach(link => {
      // Create QuizBuddy indicator
      const indicator = document.createElement('span');
      indicator.className = 'quizbuddy-indicator';
      indicator.style.marginLeft = '5px';
      indicator.style.padding = '2px 5px';
      indicator.style.backgroundColor = '#4CAF50';
      indicator.style.color = 'white';
      indicator.style.borderRadius = '3px';
      indicator.style.fontSize = '12px';
      indicator.style.cursor = 'pointer';
      indicator.textContent = 'QB';
      indicator.title = 'Create QuizBuddy Quiz from this PDF';
      
      // Add click handler
      indicator.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pdfUrl = (link as HTMLAnchorElement).href;
        
        // Send message to background script
        chrome.runtime.sendMessage({
          action: 'createQuizFromPdfLink',
          url: pdfUrl
        });
      });
      
      // Add indicator to the link
      link.appendChild(indicator);
    });
  }