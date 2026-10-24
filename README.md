# coursePulse · Build 19-fix

🐛 **Bug Fix Build**
> **Commit Message:** `fix: delete temporary uploaded files if submission validation fails`

## Summary
Ensure orphaned temporary upload files are cleaned up if submission validation or database insertion fails.

## Project Overview
coursePulse is a modern full-stack JavaScript course management system designed for learners, instructors, and platform administrators. Built with React, Vite, Express, and SQLite.

## Running this build locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development environment:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
