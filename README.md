# RSVP Reader Standalone

A high-performance, mobile-first RSVP (Rapid Serial Visual Presentation) speed reading application. This tool allows users to consume text at high speeds by displaying words one by one in a fixed position, reducing eye movement and increasing reading efficiency.

## Overview

This application provides a seamless reading experience for both plain text and PDF documents. It's designed to be lightweight, fast, and accessible on any device.

## Product Decisions & Tradeoffs

### Frontend: Vanilla JavaScript
We chose **Vanilla JS** over modern frameworks (like React or Vue) for several key reasons:
- **Zero Build Step:** Allows for immediate deployment and easier debugging without complex toolchains.
- **Performance:** Minimizes overhead, ensuring the RSVP engine remains snappy even on lower-end mobile devices.
- **Simplicity:** The core logic of RSVP is straightforward, and a framework would have added unnecessary abstraction.

### Backend: Node.js
**Node.js** was selected for the backend primarily to handle:
- **PDF Processing:** Utilizing robust Node.js libraries to extract text from PDF uploads reliably.
- **Consistency:** Maintaining a single language (JavaScript) across the entire stack simplifies development.

### Database: JSON File
For the MVP, we opted for a **JSON-based database** (`db.json`):
- **MVP Simplicity:** No database server setup or maintenance required (PostgreSQL/MongoDB).
- **Zero Infra Overhead:** Makes the application extremely portable and easy to host on simple VPS or container environments.
- **Suitability:** Given the current scale and data complexity, a flat file is more than sufficient.

### Design: Mobile-First
The interface is designed with a **mobile-first** philosophy. RSVP reading is particularly effective on small screens where traditional layout reading can be cumbersome. The controls and layout are optimized for touch interactions and vertical orientations.

## Getting Started

1. Install dependencies: `npm install`
2. Start the server: `node server.js`
3. Open `http://localhost:3000` in your browser.
