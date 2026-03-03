
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3002; // Using a distinct port
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure setup
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ documents: [] }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper to read/write DB
const getDb = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API Routes

// 1. Upload PDF
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    // Debug log
    console.log('Upload request received');
    if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        console.log(`Processing PDF: ${req.file.path}`);
        const dataBuffer = fs.readFileSync(req.file.path);
        
        // Robust PDF parsing for modern pdf-parse versions (2.4.x+)
        let data;
        let pdfModule = require('pdf-parse'); // Use direct require

        // This specific package version exports different paths
        // Try the node entry point if default fails
        if (typeof pdfModule !== 'function') {
             // Sometimes it's nested deep or using a named export
             if (pdfModule.default && typeof pdfModule.default === 'function') {
                 pdfModule = pdfModule.default;
             } else {
                 console.log("Inspecting pdf-parse module:", pdfModule);
                 throw new Error("pdf-parse is not a function");
             }
        }

        data = await pdfModule(dataBuffer);
        
        if (!data || !data.text) {
             throw new Error("PDF parsing failed: No data returned.");
        }

        // Improve text extraction:
        // 1. Replace newlines with spaces to avoid line breaks in word list
        // 2. Remove multiple spaces
        const cleanText = data.text
            .replace(/\n/g, ' ') 
            .replace(/\s+/g, ' ')
            .trim();

        if (cleanText.length === 0) {
             throw new Error("No text extracted from PDF. Is it an image scan?");
        }

        const doc = {
            id: Date.now().toString(),
            title: req.file.originalname,
            type: 'pdf',
            content: cleanText,
            progress: 0,
            date: new Date().toISOString()
        };

        const db = getDb();
        db.documents.unshift(doc);
        saveDb(db);

        console.log('PDF processed successfully');
        res.json(doc);
    } catch (err) {
        console.error('PDF Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Save Pasted Text
app.post('/api/paste', (req, res) => {
    const { title, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const doc = {
        id: Date.now().toString(),
        title: title || 'Untitled Paste',
        type: 'text',
        content: content.replace(/\n+/g, ' ').trim(),
        progress: 0,
        date: new Date().toISOString()
    };

    const db = getDb();
    db.documents.unshift(doc);
    saveDb(db);

    res.json(doc);
});

// 3. List Documents
app.get('/api/documents', (req, res) => {
    res.json(getDb().documents.map(d => ({ ...d, content: undefined }))); // Don't send full text in list
});

// 4. Get Document
app.get('/api/documents/:id', (req, res) => {
    const doc = getDb().documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
});

// 5. Update Progress
app.post('/api/documents/:id/progress', (req, res) => {
    const { index } = req.body;
    const db = getDb();
    const doc = db.documents.find(d => d.id === req.params.id);
    if (doc) {
        doc.progress = index;
        saveDb(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// 6. Delete Document
app.delete('/api/documents/:id', (req, res) => {
    const db = getDb();
    const initialLength = db.documents.length;
    db.documents = db.documents.filter(d => d.id !== req.params.id);
    
    if (db.documents.length < initialLength) {
        saveDb(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// 7. Rename Document
app.put('/api/documents/:id', (req, res) => {
    const { title } = req.body;
    const db = getDb();
    const doc = db.documents.find(d => d.id === req.params.id);
    
    if (doc) {
        doc.title = title;
        saveDb(db);
        res.json(doc);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`RSVP Server running on port ${PORT}`);
});
