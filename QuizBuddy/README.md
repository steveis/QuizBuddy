# QuizBuddy Chrome Extension

A Chrome Extension that automatically creates multiple choice quizzes for any content on the Web or in a standalone PDF file or Word document.

## Features

- Create quizzes from current webpage content
- Create quizzes from PDF links on the current page
- Take quizzes in a popup window
- View quiz results and explanations
- Access your QuizBuddy dashboard

## Technology Stack

- TypeScript
- Node.js
- SQLite database
- ConvertAPI for PDF conversions
- Claude Sonnet 3.7 API

## Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript files
4. Load the extension in Chrome from the `dist` directory

## Project Structure

- `manifest.json`: Chrome extension manifest
- `background.ts`: Background service worker
- `content.ts`: Content script for web page interaction
- `popup.html`: Popup UI HTML
- `popup.ts`: Popup UI logic
- `apiService.ts`: API service for backend communication
- `types.ts`: TypeScript type definitions
- `styles.css`: CSS styles for the popup UI

## License

Copyright © 2025