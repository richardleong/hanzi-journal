import express from 'express';
import initSqlJs from 'sql.js';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = process.env.DATABASE_PATH || '../database/hanzi.db';
const PORT = process.env.PORT || 3001;

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite database
let db;
let SQL;
const dbPath = path.resolve(__dirname, DATABASE_PATH);

async function initDb() {
  try {
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log(`✓ Loaded database from ${dbPath}`);
    } else {
      db = new SQL.Database();
      console.log(`✓ Created new database`);
    }

    // Ensure words table exists
    db.run(`
      CREATE TABLE IF NOT EXISTS words (
        id TEXT PRIMARY KEY,
        hanzi TEXT NOT NULL,
        pinyin TEXT NOT NULL,
        meaning TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        example TEXT,
        mastered BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL,
        register TEXT,
        context TEXT
      )
    `);

    saveDb();
    console.log(`✓ Connected to database at ${dbPath}`);
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  }
}

// Save database to disk
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Helper to parse context array from JSON string
const parseWord = (row) => {
  if (!row) return null;
  let context;
  if (row.context) {
    try {
      context = JSON.parse(row.context);
    } catch {
      console.warn(`Invalid JSON in context: ${row.context}`);
      context = undefined;
    }
  }
  return {
    ...row,
    mastered: Boolean(row.mastered),
    context,
  };
};

// Helper to format word for database storage
const formatWord = (word) => {
  return {
    ...word,
    context: word.context ? JSON.stringify(word.context) : null,
  };
};

// GET /api/words - Get all words
app.get('/api/words', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM words ORDER BY created_at DESC');
    stmt.bind();
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    const words = rows.map(parseWord);
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/words/:id - Get single word
app.get('/api/words/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM words WHERE id = ?');
    stmt.bind([req.params.id]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      res.json(parseWord(row));
    } else {
      stmt.free();
      res.status(404).json({ error: 'Word not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/words - Create new word
app.post('/api/words', (req, res) => {
  try {
    const { hanzi, pinyin, meaning, category = 'general', example, register, context } = req.body;

    if (!hanzi || !pinyin || !meaning) {
      return res.status(400).json({ error: 'hanzi, pinyin, and meaning are required' });
    }

    const id = uuidv4();
    const created_at = new Date().toISOString();
    const mastered = false;

    const word = {
      id,
      hanzi,
      pinyin,
      meaning,
      category,
      example: example || null,
      register: register || null,
      context: context || null,
      mastered,
      created_at,
    };

    const formatted = formatWord(word);

    const stmt = db.prepare(`
      INSERT INTO words (id, hanzi, pinyin, meaning, category, example, register, context, mastered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      formatted.id,
      formatted.hanzi,
      formatted.pinyin,
      formatted.meaning,
      formatted.category,
      formatted.example,
      formatted.register,
      formatted.context,
      formatted.mastered ? 1 : 0,
      formatted.created_at,
    ]);

    saveDb();
    res.status(201).json(word);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/words/:id - Update word
app.put('/api/words/:id', (req, res) => {
  try {
    const { hanzi, pinyin, meaning, category, example, register, context, mastered } = req.body;

    // Check if word exists
    const checkStmt = db.prepare('SELECT * FROM words WHERE id = ?');
    checkStmt.bind([req.params.id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      return res.status(404).json({ error: 'Word not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (hanzi !== undefined) {
      updates.push('hanzi = ?');
      values.push(hanzi);
    }
    if (pinyin !== undefined) {
      updates.push('pinyin = ?');
      values.push(pinyin);
    }
    if (meaning !== undefined) {
      updates.push('meaning = ?');
      values.push(meaning);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (example !== undefined) {
      updates.push('example = ?');
      values.push(example || null);
    }
    if (register !== undefined) {
      updates.push('register = ?');
      values.push(register || null);
    }
    if (context !== undefined) {
      updates.push('context = ?');
      values.push(context ? JSON.stringify(context) : null);
    }
    if (mastered !== undefined) {
      updates.push('mastered = ?');
      values.push(mastered ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    const query = `UPDATE words SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(values);

    saveDb();

    // Fetch and return updated word
    const getStmt = db.prepare('SELECT * FROM words WHERE id = ?');
    getStmt.bind([req.params.id]);
    getStmt.step();
    const updated = getStmt.getAsObject();
    getStmt.free();

    res.json(parseWord(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/words/:id - Delete word
app.delete('/api/words/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM words WHERE id = ?');
    stmt.run([req.params.id]);
    saveDb();

    // Check if deletion was successful
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM words WHERE id = ?');
    checkStmt.bind([req.params.id]);
    checkStmt.step();
    const result = checkStmt.getAsObject();
    checkStmt.free();

    if (result.count === 0) {
      res.json({ success: true, id: req.params.id });
    } else {
      res.status(404).json({ error: 'Word not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎯 Hanzi Journal Backend Server`);
    console.log(`✓ Listening on http://0.0.0.0:${PORT}`);
    console.log(`✓ Accessible from local network at http://<your-mac-ip>:${PORT}\n`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n✓ Shutting down...');
    saveDb();
    process.exit(0);
  });
});
