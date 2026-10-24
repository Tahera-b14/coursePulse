# coursePulse · Build 13-fix

🐛 **Bug Fix Build**
> **Commit Message:** `fix: prevent over-enrollment race condition with sqlite transaction`

## Summary
Wrap enrollment capacity check and insert inside an atomic SQLite transaction and add busy UI lock.

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
