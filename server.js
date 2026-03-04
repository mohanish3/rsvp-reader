
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure setup
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ documents: [] }));

// In-memory DB cache — load once at startup, write-through on changes
let db = JSON.parse(fs.readFileSync(DB_FILE));
const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// Multer: PDF only, 10 MB limit
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + path.basename(file.originalname))
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});

// API Routes

// 1. Upload PDF
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    try {
        const dataBuffer = fs.readFileSync(filePath);

        // Use the module required at startup; max:0 = no page limit
        const data = await pdf(dataBuffer, { max: 0 });

        if (!data || !data.text) throw new Error('PDF parsing failed: no text returned.');

        const cleanText = data.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanText.length === 0) throw new Error('No text extracted. Is this a scanned image PDF?');

        const wordCount = cleanText.split(/\s+/).length;
        const doc = {
            id: Date.now().toString(),
            title: path.basename(req.file.originalname, '.pdf'),
            type: 'pdf',
            content: cleanText,
            wordCount,
            progress: 0,
            progressPercent: 0,
            date: new Date().toISOString()
        };

        db.documents.unshift(doc);
        saveDb();

        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        // Always clean up the temp file
        fs.unlink(filePath, () => {});
    }
});

// 2. Save Pasted Text
app.post('/api/paste', (req, res) => {
    const { title, content } = req.body;
    if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Content required' });
    if (content.length > 2_000_000) return res.status(400).json({ error: 'Content too large (max 2MB of text)' });

    const cleanContent = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = cleanContent.split(/\s+/).length;

    const doc = {
        id: Date.now().toString(),
        title: (title || 'Untitled Paste').slice(0, 200),
        type: 'text',
        content: cleanContent,
        wordCount,
        progress: 0,
        progressPercent: 0,
        date: new Date().toISOString()
    };

    db.documents.unshift(doc);
    saveDb();

    res.json(doc);
});

// 3. List Documents (no content in list)
app.get('/api/documents', (req, res) => {
    res.json(db.documents.map(({ content, ...d }) => d));
});

// 4. Get Document
app.get('/api/documents/:id', (req, res) => {
    const doc = db.documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
});

// 5. Update Progress
app.post('/api/documents/:id/progress', (req, res) => {
    const { index } = req.body;
    if (typeof index !== 'number') return res.status(400).json({ error: 'index must be a number' });

    const doc = db.documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    doc.progress = index;
    doc.progressPercent = doc.wordCount ? Math.round((index / doc.wordCount) * 100) : 0;
    saveDb();
    res.json({ success: true });
});

// 6. Delete Document
app.delete('/api/documents/:id', (req, res) => {
    const before = db.documents.length;
    db.documents = db.documents.filter(d => d.id !== req.params.id);

    if (db.documents.length < before) {
        saveDb();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// 7. Rename Document
app.put('/api/documents/:id', (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Title required' });

    const doc = db.documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    doc.title = title.slice(0, 200);
    saveDb();
    res.json(doc);
});

// Multer error handler (e.g., file too large, wrong type)
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large (max 10 MB)' });
    if (err.message) return res.status(400).json({ error: err.message });
    next(err);
});

app.listen(PORT, () => {
    console.log(`RSVP Server running on http://localhost:${PORT}`);
});
