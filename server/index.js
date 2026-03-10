const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = !!process.env.DATABASE_URL;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// In production: store images as base64 in DB (no disk needed)
// Locally: save to uploads/ folder as before
const uploadsDir = path.join(__dirname, 'uploads');

let upload;
if (IS_PRODUCTION) {
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed.'));
    },
  });
} else {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  });
  upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed.'));
    },
  });
}

// GET all tombstones
app.get('/api/tombstones', async (req, res) => {
  try {
    const results = await db.getAll(req.query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single tombstone
app.get('/api/tombstones/:id', async (req, res) => {
  try {
    const tombstone = await db.getById(req.params.id);
    if (!tombstone) return res.status(404).json({ error: 'Not found' });
    res.json(tombstone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create tombstone
app.post('/api/tombstones', async (req, res) => {
  try {
    const { company_name, deal_type, deal_size_millions, deal_year, logo_url, role } = req.body;
    if (!company_name || !deal_type || !deal_year) {
      return res.status(400).json({ error: 'company_name, deal_type, and deal_year are required.' });
    }
    const tombstone = await db.create({
      id: uuidv4(),
      company_name,
      deal_type,
      deal_size_millions: deal_size_millions != null ? parseFloat(deal_size_millions) : null,
      deal_year: parseInt(deal_year, 10),
      logo_url: logo_url || null,
      role: role || '',
      created_at: new Date().toISOString(),
    });
    res.status(201).json(tombstone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update tombstone
app.put('/api/tombstones/:id', async (req, res) => {
  try {
    const { company_name, deal_type, deal_size_millions, deal_year, logo_url, role } = req.body;
    const tombstone = await db.update(req.params.id, {
      company_name,
      deal_type,
      deal_size_millions: deal_size_millions != null ? parseFloat(deal_size_millions) : null,
      deal_year: parseInt(deal_year, 10),
      logo_url: logo_url || null,
      role: role || '',
    });
    if (!tombstone) return res.status(404).json({ error: 'Not found' });
    res.json(tombstone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tombstone
app.delete('/api/tombstones/:id', async (req, res) => {
  try {
    const tombstone = await db.remove(req.params.id);
    if (!tombstone) return res.status(404).json({ error: 'Not found' });
    // Clean up local file if applicable
    if (!IS_PRODUCTION && tombstone.logo_url && tombstone.logo_url.startsWith('/uploads/')) {
      const filepath = path.join(uploadsDir, tombstone.logo_url.replace('/uploads/', ''));
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload logo
app.post('/api/upload', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  if (IS_PRODUCTION) {
    // Return base64 data URL — stored directly in the database
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ url: dataUrl });
  } else {
    res.json({ url: `/uploads/${req.file.filename}` });
  }
});

// Serve client build in production
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// Start server after DB is ready
db.init().then(() => {
  app.listen(PORT, () => console.log(`Tombstone server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
