# RSVP Reader

A fast, mobile-first speed-reading app. Text appears one word at a time in a fixed position — your eyes stay still, words come to you. Supports plain text and PDF uploads.

## Getting Started

```bash
npm install
node server.js
# Open http://localhost:3002
```

Set `PORT` env var to override the default port (3002).

---

## UX Decisions

### ORP (Optimum Recognition Point) highlighting
The letter ~25% into each word is highlighted in red. This is the natural fixation point the eye uses to recognize a word. Keeping it anchored eliminates horizontal eye movement, the main bottleneck in traditional reading.

### Single-word vs. chunk mode
Toggle between 1-word (maximum ORP benefit) and 3-word chunks (feels more natural at higher WPMs, closer to how fluent readers process text). Chunk mode displays all words centered without ORP since the brain groups them differently.

### Progress shown as a percentage
The library shows `42% read` rather than a raw word index. Meaningful at a glance without needing to know the document's length.

### Empty state in library
When no documents exist, a clear prompt is shown instead of a blank list. Reduces confusion on first run.

### No title in onclick attributes
Document titles (user-provided) are never injected into JavaScript event handlers. The rename handler reads the title from the rendered DOM element instead, preventing XSS.

### Full-text view with click-to-jump
A "Full Text" button in the reader controls reveals the entire document as scrollable prose. The current word is highlighted and scrolled into view so you always know where you are. Clicking any word jumps the RSVP reader to that position and returns to word-by-word mode. Opening the panel pauses playback automatically. This lets you skim, re-read a section, or jump ahead without losing your place.

### Seek saves on drag end, not on every tick
Dragging the progress slider updates the display immediately but only saves to the server when you release (`change` event). Avoids a network request per pixel of movement.

---

## Tech Decisions

### Vanilla JS, no build step
No framework, no bundler, no transpiler. The RSVP engine is ~250 lines of straightforward DOM manipulation. A framework would add hundreds of KB and a build pipeline for no real benefit. The app loads instantly.

### In-memory DB cache
`db.json` is read once at server startup and held in memory. All reads are instant (no disk I/O). Writes are synchronous write-throughs — acceptable because writes only happen on user actions (save, delete, rename), not on reads. For a personal library of hundreds of documents this is effectively zero-overhead.

### PDF temp file cleanup
Uploaded PDFs are deleted from disk immediately after text extraction, whether extraction succeeds or fails. The raw file is never needed after that point.

### PDF-only upload validation
Multer rejects non-PDF MIME types before the file is even written to disk. File size is capped at 10 MB server-side.

### No CORS
The API and the frontend are served from the same Express process on the same port. Opening CORS to all origins (the previous default) would expose the API to any website the user visits. Removed.

### Port from environment
`PORT` env var is respected. Falls back to 3002 if unset.

### Input sanitization
- Paste content is capped at 2 MB of text server-side.
- Document titles are capped at 200 characters.
- All user content is HTML-escaped before insertion into the DOM.

### wordCount stored at creation
When a document is saved, its word count is stored alongside the content. This lets the server compute `progressPercent` on each progress save, so the list endpoint can return a meaningful percentage without sending the full content.

### JSON file storage
No database server required. The entire library lives in `db.json`. Suitable for a single-user personal tool. If you need multi-user or >10k documents, migrate to SQLite with the same API surface.

---

## Architecture

```
public/index.html   — Single-page app (vanilla JS, all views)
server.js           — Express API + PDF extraction + static serving
db.json             — Document store (auto-created on first run)
uploads/            — Temp PDF staging (files deleted after extraction)
```

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload PDF, extract text |
| POST | `/api/paste` | Save pasted text |
| GET | `/api/documents` | List all docs (no content body) |
| GET | `/api/documents/:id` | Fetch full document |
| POST | `/api/documents/:id/progress` | Save word index |
| PUT | `/api/documents/:id` | Rename document |
| DELETE | `/api/documents/:id` | Delete document |
