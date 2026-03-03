# Product Requirements Document (PRD) - RSVP Reader App

## 1. Overview
A mobile-friendly Rapid Serial Visual Presentation (RSVP) web application designed to help users read text content (pasted or PDF) at high speeds using visual fixation techniques.

## 2. Core Features

### 2.1 Input Methods
*   **Paste Text:** A simple text area to paste clipboard content.
*   **PDF Upload:** Ability to upload PDF files. The system extracts text automatically (no complex layout analysis for MVP).

### 2.2 The Reader (RSVP Engine)
*   **WPM Control:** Adjustable Words Per Minute (e.g., 100 - 1000 WPM).
*   **Visual Modes:**
    *   **Single Word:** Standard RSVP.
    *   **Chunking:** Option to display 2-3 words at a time.
*   **Optimum Recognition Point (ORP):** The fixation letter (usually center-left) is highlighted (e.g., red color) to stabilize the eye.
*   **Controls:**
    *   Play/Pause (tap anywhere).
    *   Scrubber bar for progress.
    *   "Rewind 10 words" button for quick recovery.

### 2.3 Library System
*   **Persistence:** Saved documents/books.
*   **Progress Tracking:** Remembers the last read position for each document.

## 3. Technical Stack
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (Mobile Responsive).
*   **Backend:** Node.js (Express).
*   **PDF Processing:** `pdf-parse` library.
*   **Storage:** JSON-based local database (for MVP).
*   **Deployment:** Self-hosted on local machine, accessible via Tailscale network.

## 4. Future Roadmap (Out of Scope for v1)
*   Audio/TTS Synchronization.
*   Advanced PDF layout analysis.
