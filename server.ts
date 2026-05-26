import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer';
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import pool from "./db";
import crypto from "crypto";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

const createTransporter = (port: number, secure: boolean, hostOverride?: string) => {
  const host = hostOverride || process.env.SMTP_HOST || 'smtp.mail.ru';
  const t = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      // Crucial when using IP address: tell the server which domain we expect
      servername: 'smtp.mail.ru'
    },
    family: 4 // Force IPv4
  } as any);
  return t;
};

const primaryTransporter = createTransporter(
  parseInt(process.env.SMTP_PORT || '465'), 
  process.env.SMTP_SECURE !== 'false'
);

// Fallback using direct IPv4 of smtp.mail.ru to bypass IPv6 issues
const fallbackTransporter = createTransporter(587, false, '94.100.180.160');
const extraFallbackTransporter = createTransporter(2525, false, '94.100.180.160');

async function sendEmailWithFallback(mailOptions: any) {
  // Ensure 'from' matches SMTP_USER for Mail.ru compatibility
  if (process.env.SMTP_USER) {
    mailOptions.from = process.env.SMTP_FROM || `"Bilingual Math" <${process.env.SMTP_USER}>`;
  }

  try {
    console.log(`Attempting to send email via primary port ${process.env.SMTP_PORT || 465}...`);
    return await primaryTransporter.sendMail(mailOptions);
  } catch (error: any) {
    console.warn(`Primary SMTP failed: ${error.message}. Trying port 587...`);
    try {
      return await fallbackTransporter.sendMail(mailOptions);
    } catch (fallbackError: any) {
      console.warn(`Port 587 failed: ${fallbackError.message}. Trying port 2525...`);
      try {
        return await extraFallbackTransporter.sendMail(mailOptions);
      } catch (lastError: any) {
        console.error(`All SMTP ports (465, 587, 2525) failed.`);
        throw lastError;
      }
    }
  }
}
const PORT = parseInt(process.env.PORT || "3000", 10);
const finalPort = isNaN(PORT) || PORT <= 0 || PORT > 65535 ? 3000 : PORT;

async function logAction(userId: string | null, username: string | null, action: string, details: any) {
  try {
    const id = Math.random().toString(36).substr(2, 9);
    await pool.query(
      "INSERT INTO logs (id, user_id, username, action, details) VALUES ($1, $2, $3, $4, $5)",
      [id, userId, username, action, JSON.stringify(details)]
    );
  } catch (error) {
    console.error("Logging Error:", error);
  }
}

function generateRandomPassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

// Initialize database schema
async function initDb(forceReinstall = false) {
  console.log(`Initializing database (forceReinstall: ${forceReinstall})...`);
  const client = await pool.connect();
  try {
    if (forceReinstall) {
      console.log("!!! FORCE REINSTALL: Dropping all tables...");
      const tables = [
        'notifications', 'comments', 'term_versions', 'logs', 
        'password_resets', 'term_translations', 'terms', 
        'languages', 'subjects', 'users'
      ];
      
      for (const table of tables) {
        try {
          await client.exec(`DROP TABLE IF EXISTS ${table} CASCADE`);
          console.log(`Dropped table: ${table}`);
        } catch (e) {
          await client.exec(`DROP TABLE IF EXISTS ${table}`);
          console.log(`Dropped table (no cascade): ${table}`);
        }
      }
    }

    console.log("Creating tables...");

    await client.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'guest',
        full_name TEXT,
        school TEXT,
        grade TEXT,
        avatar TEXT,
        contact_info TEXT,
        bio TEXT,
        subscription_tier TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Add new columns if they don't exist
    const columnsToMigrate = [
      { table: 'users', column: 'contact_info', type: 'TEXT' },
      { table: 'users', column: 'bio', type: 'TEXT' },
      { table: 'users', column: 'subscription_tier', type: 'TEXT DEFAULT \'free\'' }
    ];

    for (const col of columnsToMigrate) {
      try {
        await client.exec(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`);
        console.log(`Migration: Added '${col.column}' column to '${col.table}' table.`);
      } catch (e) { /* ignore if already exists */ }
    }
    
    try {
      await client.exec(`ALTER TABLE courses ADD COLUMN image_url TEXT`);
      console.log(`Migration: Added 'image_url' column to 'courses' table.`);
    } catch (e) { /* ignore if already exists */ }

    console.log("Table 'users' ready.");

    // ... (keep existing users logic) ...

    await client.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        subject_id TEXT REFERENCES subjects(id),
        title_ru TEXT,
        title_tyv TEXT,
        description_ru TEXT,
        description_tyv TEXT,
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS course_modules (
        id TEXT PRIMARY KEY,
        course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
        title_ru TEXT,
        title_tyv TEXT,
        order_index INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lectures (
        id TEXT PRIMARY KEY,
        course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
        module_id TEXT REFERENCES course_modules(id) ON DELETE SET NULL,
        title_ru TEXT,
        title_tyv TEXT,
        content_ru TEXT,
        content_tyv TEXT,
        order_index INTEGER,
        is_free INTEGER DEFAULT 0,
        item_type TEXT DEFAULT 'theory',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lecture_resources (
        id TEXT PRIMARY KEY,
        lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
        title TEXT,
        url TEXT,
        type TEXT, -- 'pdf', 'ppt', 'link', etc.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lecture_comments (
        id TEXT PRIMARY KEY,
        lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        username TEXT,
        avatar TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lecture_completions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
        score INTEGER,
        max_score INTEGER,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lecture_id)
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT,
        teacher_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        invite_code TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS class_enrollments (
        class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(class_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
        lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id TEXT PRIMARY KEY,
        assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER,
        max_score INTEGER,
        status TEXT DEFAULT 'submitted', -- 'submitted', 'graded'
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(assignment_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS lecture_quizzes (
        id TEXT PRIMARY KEY,
        lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
        title_ru TEXT,
        title_tyv TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.exec(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT REFERENCES lecture_quizzes(id) ON DELETE CASCADE,
        question_ru TEXT,
        question_tyv TEXT,
        explanation_ru TEXT,
        explanation_tyv TEXT,
        order_index INTEGER
      );

      CREATE TABLE IF NOT EXISTS quiz_options (
        id TEXT PRIMARY KEY,
        question_id TEXT REFERENCES quiz_questions(id) ON DELETE CASCADE,
        text_ru TEXT,
        text_tyv TEXT,
        is_correct INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      INSERT INTO users (id, username, email, role, full_name) 
      VALUES ('system', 'system', 'system@system.com', 'super_admin', 'System')
      ON CONFLICT (id) DO NOTHING
    `);

    const adminPassword = await bcrypt.hash("admin123", 10);
    await client.query(`
      INSERT INTO users (id, username, email, role, full_name, password) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, ['admin', 'admin', 'starpri302@gmail.com', 'super_admin', 'Admin', adminPassword]);
    console.log("Default users ready.");

    await client.exec(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE,
        name_ru TEXT,
        name_tyv TEXT,
        icon TEXT,
        color TEXT
      );
    `);

    try { await client.exec(`ALTER TABLE lectures ADD COLUMN visibility TEXT DEFAULT 'public'`); } catch (e) {}
    try { await client.exec(`ALTER TABLE lectures ADD COLUMN access_type TEXT DEFAULT 'free'`); } catch (e) {}
    try { await client.exec(`ALTER TABLE subjects ADD COLUMN color TEXT DEFAULT '#10b981'`); } catch (e) {}

    await client.exec(`
      CREATE TABLE IF NOT EXISTS lecture_access (
        id TEXT PRIMARY KEY,
        lecture_id TEXT REFERENCES lectures(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP,
        granted_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT lecture_user_unique UNIQUE (lecture_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS languages (
        code TEXT PRIMARY KEY,
        name TEXT,
        native_name TEXT,
        flag TEXT
      );

      CREATE TABLE IF NOT EXISTS terms (
        id TEXT PRIMARY KEY,
        grade TEXT,
        subject_id TEXT REFERENCES subjects(id),
        created_by TEXT REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS term_translations (
        term_id TEXT REFERENCES terms(id) ON DELETE CASCADE,
        lang_code TEXT REFERENCES languages(code),
        name TEXT,
        definition TEXT,
        example TEXT,
        additional TEXT,
        PRIMARY KEY(term_id, lang_code)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        term_id TEXT REFERENCES terms(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        username TEXT,
        avatar TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS term_versions (
        id TEXT PRIMARY KEY,
        term_id TEXT REFERENCES terms(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        username TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        term_id TEXT REFERENCES terms(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, term_id)
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT PRIMARY KEY,
        token TEXT,
        expires TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        username TEXT,
        action TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT,
        term_id TEXT REFERENCES terms(id) ON DELETE CASCADE,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academic_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        school TEXT NOT NULL,
        position TEXT,
        subjects TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("All tables created successfully.");

    try { await client.exec(`ALTER TABLE academic_requests ADD COLUMN position TEXT`); } catch (e) {}

    // Seed initial subjects and languages if empty
    const langCountRes = await client.query("SELECT COUNT(*) as count FROM languages");
    if (parseInt(langCountRes.rows[0].count) === 0) {
      await client.query("INSERT INTO languages (code, name, native_name, flag) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING", ["ru", "Русский", "Русский", "🇷🇺"]);
      await client.query("INSERT INTO languages (code, name, native_name, flag) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING", ["tyv", "Тувинский", "Тыва дыл", "🇹🇻"]);
      console.log("Languages seeded.");
    }

    const subjectCountRes = await client.query("SELECT COUNT(*) as count FROM subjects");
    if (parseInt(subjectCountRes.rows[0].count) === 0) {
      await client.query("INSERT INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING", ["s1", "math", "Математика", "Математика", "calculator"]);
      await client.query("INSERT INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING", ["s2", "physics", "Физика", "Физика", "atom"]);
      await client.query("INSERT INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING", ["s3", "it", "Информатика", "Информатика", "monitor"]);
      console.log("Subjects seeded.");
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
    fs.writeFileSync("db_error.log", String(error));
    throw error;
  } finally {
    client.release();
  }
}

async function startServer() {
  console.log("Starting server...");
  try {
    // Test database connectivity
    await pool.testConnection();
    console.log("Database connection successful.");
    
    // Check for a flag to reinstall. In this environment, we'll do it once if requested.
    const forceReinstall = process.env.REINSTALL === "true";
    await initDb(forceReinstall);
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed. The app may not function correctly:", error);
  }

  const app = express();
  
  // Trust proxy for rate limiting behind Nginx/Cloud Run
  app.set('trust proxy', 1);

  const httpServer = createServer(app);
  
  // Production Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier integration with external resources if needed
  }));
  app.use(compression());
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      console.error('Bad JSON request body:', err);
      return res.status(400).json({ error: "Malformed JSON request body" });
    }
    next();
  });
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ 
      error: "Internal server error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000 to avoid blocking active users
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    },
    message: { error: "Слишком много запросов, пожалуйста, попробуйте позже." }
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Decreased from 100 to 10 for security
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    },
    message: { error: "Слишком много попыток входа, пожалуйста, попробуйте через час." }
  });

  app.use("/api/", limiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);

  // API Routes
  // Middlewares
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      req.user = user;
      next();
    });
  };

  const requirePro = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userRes = await pool.query("SELECT subscription_tier, role FROM users WHERE id = $1", [req.user.id]);
    const user = userRes.rows[0];
    if (user.subscription_tier === 'pro' || user.role === 'admin' || user.role === 'teacher' || user.role === 'super_admin' || user.role === 'chief_editor') {
      next();
    } else {
      res.status(403).json({ error: "Pro subscription required", is_pro_needed: true });
    }
  };

  // ... (existing helper functions) ...

  // +++ EDUCATIONAL COURSES & LECTURES API +++
  app.get("/api/courses", async (req, res) => {
    try {
      const coursesRes = await pool.query(`
        SELECT c.*, s.name_ru as subject_name_ru, s.name_tyv as subject_name_tyv, s.color as subject_color
        FROM courses c 
        LEFT JOIN subjects s ON c.subject_id = s.id 
        ORDER BY c.created_at DESC
      `);
      res.json(coursesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id/lectures", async (req, res) => {
    try {
      const lecturesRes = await pool.query(
        "SELECT id, module_id, title_ru, title_tyv, item_type, order_index, is_free FROM lectures WHERE course_id = $1 ORDER BY order_index ASC",
        [req.params.id]
      );
      res.json(lecturesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lectures" });
    }
  });

  app.get("/api/lectures/:id", authenticateToken, async (req, res) => {
    try {
      const lectureRes = await pool.query(`
        SELECT l.*, c.created_by as course_created_by 
        FROM lectures l 
        JOIN courses c ON l.course_id = c.id 
        WHERE l.id = $1`, [req.params.id]);
      const lecture = lectureRes.rows[0];
      if (!lecture) return res.status(404).json({ error: "Lecture not found" });

      const userId = (req as any).user.id;

      // Access: free OR teacher OR admin OR pro
      const userRes = await pool.query("SELECT subscription_tier, role FROM users WHERE id = $1", [userId]);
      const user = userRes.rows[0];
      
      const isCreator = lecture.course_created_by === userId;
      const isAdmin = user.role === 'super_admin' || user.role === 'chief_editor';
      const isPro = user.subscription_tier === 'pro';

      if (lecture.is_free === 1 || isCreator || isAdmin || isPro) {
        return res.json(lecture);
      } else {
        res.status(403).json({ error: "Pro subscription required", is_pro_needed: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lecture" });
    }
  });

  app.get("/api/lectures/:id/comments", async (req, res) => {
    try {
      const commentsRes = await pool.query(`
        SELECT c.*, u.username, u.avatar 
        FROM lecture_comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.lecture_id = $1 
        ORDER BY c.created_at ASC
      `, [req.params.id]);
      res.json(commentsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lecture comments" });
    }
  });

  app.delete("/api/lectures/:lectureId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const commentRes = await pool.query("SELECT user_id FROM lecture_comments WHERE id = $1", [req.params.commentId]);
      if (commentRes.rows.length === 0) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const comment = commentRes.rows[0];
      const isOwner = comment.user_id === (req as any).user.id;
      const isAdmin = (req as any).user.role === 'super_admin' || (req as any).user.role === 'chief_editor';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await pool.query("DELETE FROM lecture_comments WHERE id = $1", [req.params.commentId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  app.post("/api/lectures/:id/comments", authenticateToken, async (req, res) => {
    const { content } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      // Get user info
      const userRes = await pool.query("SELECT username, avatar FROM users WHERE id = $1", [(req as any).user.id]);
      const user = userRes.rows[0];
      
      await pool.query(
        "INSERT INTO lecture_comments (id, lecture_id, user_id, username, avatar, content) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, req.params.id, (req as any).user.id, user.username, user.avatar, content]
      );
      res.json({ id, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to post comment" });
    }
  });

  app.post("/api/lectures/:id/complete", authenticateToken, async (req, res) => {
    const { score, max_score } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(`
        INSERT INTO lecture_completions (id, user_id, lecture_id, score, max_score) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, lecture_id) DO UPDATE SET score = $4, max_score = $5, completed_at = CURRENT_TIMESTAMP
      `, [id, (req as any).user.id, req.params.id, score || 0, max_score || 0]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save completion" });
    }
  });

  app.get("/api/users/me/progress", authenticateToken, async (req, res) => {
    try {
      const progressRes = await pool.query("SELECT * FROM lecture_completions WHERE user_id = $1", [(req as any).user.id]);
      res.json(progressRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.get("/api/courses/:id/stats", authenticateToken, requirePro, async (req, res) => {
    try {
      const statsRes = await pool.query(`
        SELECT lc.*, u.username, u.avatar, l.title_ru as lecture_title
        FROM lecture_completions lc
        JOIN users u ON lc.user_id = u.id
        JOIN lectures l ON lc.lecture_id = l.id
        WHERE l.course_id = $1
        ORDER BY lc.completed_at DESC
      `, [req.params.id]);
      res.json(statsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/lectures/:id/quiz", async (req, res) => {
    try {
      const quizRes = await pool.query("SELECT * FROM lecture_quizzes WHERE lecture_id = $1", [req.params.id]);
      const quiz = quizRes.rows[0];
      if (!quiz) return res.json(null);

      const questionsRes = await pool.query("SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC", [quiz.id]);
      const questions = questionsRes.rows;

      for (const q of questions) {
        const optionsRes = await pool.query("SELECT id, text_ru, text_tyv, is_correct FROM quiz_options WHERE question_id = $1", [q.id]);
        (q as any).options = optionsRes.rows;
      }

      res.json({ ...quiz, questions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  // +++ EDUCATIONAL COURSES & LECTURES API (MANAGEMENT) +++
  app.post("/api/courses", authenticateToken, requirePro, async (req, res) => {
    console.log("POST /api/courses req.body", req.body);
    const { subject_id, title_ru, title_tyv, description_ru, description_tyv, image_url } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(
        "INSERT INTO courses (id, subject_id, title_ru, title_tyv, description_ru, description_tyv, image_url, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, subject_id, title_ru, title_tyv, description_ru, description_tyv, image_url, (req as any).user.id]
      );
      res.json({ id, success: true });
    } catch (error) {
      console.error("POST /api/courses error:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  app.put("/api/courses/:id", authenticateToken, requirePro, async (req, res) => {
    const { subject_id, title_ru, title_tyv, description_ru, description_tyv, image_url } = req.body;
    try {
      await pool.query(
        "UPDATE courses SET subject_id = $1, title_ru = $2, title_tyv = $3, description_ru = $4, description_tyv = $5, image_url = $6 WHERE id = $7",
        [subject_id, title_ru, title_tyv, description_ru, description_tyv, image_url, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update course" });
    }
  });

  app.delete("/api/courses/:id", authenticateToken, requirePro, async (req, res) => {
    try {
      await pool.query("DELETE FROM courses WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  app.post("/api/lectures", authenticateToken, requirePro, async (req, res) => {
    const { course_id, title_ru, title_tyv, content_ru, content_tyv, is_free, item_type } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      // Get max order_index
      const orderRes = await pool.query("SELECT COALESCE(MAX(order_index), 0) as max_idx FROM lectures WHERE course_id = $1", [course_id]);
      const nextIdx = (parseInt(orderRes.rows[0].max_idx) || 0) + 1;

      await pool.query(
        "INSERT INTO lectures (id, course_id, title_ru, title_tyv, content_ru, content_tyv, order_index, is_free, item_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [id, course_id, title_ru, title_tyv, content_ru, content_tyv, nextIdx, is_free ? 1 : 0, item_type || 'theory']
      );
      res.json({ id, success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create lecture" });
    }
  });

  app.put("/api/lectures/:id", authenticateToken, requirePro, async (req, res) => {
    const { title_ru, title_tyv, content_ru, content_tyv, is_free, item_type } = req.body;
    try {
      await pool.query(
        "UPDATE lectures SET title_ru = $1, title_tyv = $2, content_ru = $3, content_tyv = $4, is_free = $5, item_type = $6 WHERE id = $7",
        [title_ru, title_tyv, content_ru, content_tyv, is_free ? 1 : 0, item_type, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update lecture" });
    }
  });

  app.delete("/api/lectures/:id", authenticateToken, requirePro, async (req, res) => {
    try {
      await pool.query("DELETE FROM lectures WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lecture" });
    }
  });

  app.post("/api/lectures/:id/quiz", authenticateToken, requirePro, async (req, res) => {
    const lectureId = req.params.id;
    const { questions } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Upsert quiz
      let quizId;
      const existingQuiz = await client.query("SELECT id FROM lecture_quizzes WHERE lecture_id = $1", [lectureId]);
      if (existingQuiz.rowCount > 0) {
        quizId = existingQuiz.rows[0].id;
      } else {
        quizId = Math.random().toString(36).substr(2, 9);
        await client.query(
          "INSERT INTO lecture_quizzes (id, lecture_id) VALUES ($1, $2)",
          [quizId, lectureId]
        );
      }

      // Delete existing questions/options (simpler than syncing)
      const qRes = await client.query("SELECT id FROM quiz_questions WHERE quiz_id = $1", [quizId]);
      const qIds = qRes.rows.map(r => r.id);
      if (qIds.length > 0) {
        const placeholders = qIds.map((_, i) => `$${i + 1}`).join(',');
        await client.query(`DELETE FROM quiz_options WHERE question_id IN (${placeholders})`, qIds);
        await client.query("DELETE FROM quiz_questions WHERE quiz_id = $1", [quizId]);
      }

      // Add new questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionId = Math.random().toString(36).substr(2, 9);
        await client.query(
          "INSERT INTO quiz_questions (id, quiz_id, text_ru, text_tyv, order_index) VALUES ($1, $2, $3, $4, $5)",
          [questionId, quizId, q.text_ru, q.text_tyv, i]
        );

        for (const opt of q.options) {
          const optionId = Math.random().toString(36).substr(2, 9);
          await client.query(
            "INSERT INTO quiz_options (id, question_id, text_ru, text_tyv, is_correct) VALUES ($1, $2, $3, $4, $5)",
            [optionId, questionId, opt.text_ru, opt.text_tyv, opt.is_correct ? 1 : 0]
          );
        }
      }

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error('Quiz save error:', error);
      res.status(500).json({ error: "Failed to save quiz" });
    } finally {
      client.release();
    }
  });

  // +++ EDUCATIONAL MODULES API +++
  app.get("/api/courses/:id/modules", async (req, res) => {
    try {
      const modulesRes = await pool.query(
        "SELECT * FROM course_modules WHERE course_id = $1 ORDER BY order_index ASC",
        [req.params.id]
      );
      res.json(modulesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  });

  app.post("/api/courses/:id/modules", authenticateToken, requirePro, async (req, res) => {
    const { title_ru, title_tyv, order_index } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(
        "INSERT INTO course_modules (id, course_id, title_ru, title_tyv, order_index) VALUES ($1, $2, $3, $4, $5)",
        [id, req.params.id, title_ru, title_tyv, order_index || 0]
      );
      res.json({ id, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create module" });
    }
  });

  app.put("/api/modules/:id", authenticateToken, requirePro, async (req, res) => {
    const { title_ru, title_tyv, order_index } = req.body;
    try {
      await pool.query(
        "UPDATE course_modules SET title_ru = $1, title_tyv = $2, order_index = $3 WHERE id = $4",
        [title_ru, title_tyv, order_index, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update module" });
    }
  });

  app.delete("/api/modules/:id", authenticateToken, requirePro, async (req, res) => {
    try {
      await pool.query("DELETE FROM course_modules WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete module" });
    }
  });

  // +++ LECTURE RESOURCES API +++
  app.get("/api/lectures/:id/resources", async (req, res) => {
    try {
      const resourcesRes = await pool.query(
        "SELECT * FROM lecture_resources WHERE lecture_id = $1 ORDER BY created_at ASC",
        [req.params.id]
      );
      res.json(resourcesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.post("/api/lectures/:id/resources/batch", authenticateToken, requirePro, async (req, res) => {
    const { resources } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // For simplicity, we replace all resources for the lecture
      await client.query("DELETE FROM lecture_resources WHERE lecture_id = $1", [req.params.id]);
      for (const res of resources) {
        const id = Math.random().toString(36).substr(2, 9);
        await client.query(
          "INSERT INTO lecture_resources (id, lecture_id, title, type, url) VALUES ($1, $2, $3, $4, $5)",
          [id, req.params.id, res.title, res.type, res.url]
        );
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: "Failed to save resources batch" });
    } finally {
      client.release();
    }
  });

  // +++ CLASSES & ENROLLMENT API +++
  app.get("/api/classes", authenticateToken, async (req, res) => {
    try {
      const classesRes = await pool.query("SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC", [(req as any).user.id]);
      res.json(classesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  app.post("/api/classes", authenticateToken, requirePro, async (req, res) => {
    const { name, grade } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await pool.query(
        "INSERT INTO classes (id, teacher_id, name, grade, invite_code) VALUES ($1, $2, $3, $4, $5)",
        [id, (req as any).user.id, name, grade, inviteCode]
      );
      res.json({ id, inviteCode, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  app.post("/api/classes/join", authenticateToken, async (req, res) => {
    const { inviteCode } = req.body;
    try {
      const classRes = await pool.query("SELECT id FROM classes WHERE invite_code = $1", [inviteCode.toUpperCase()]);
      const cls = classRes.rows[0];
      if (!cls) return res.status(404).json({ error: "Класс с таким кодом не найден." });

      const enrollmentId = Math.random().toString(36).substr(2, 9);
      await pool.query(
        "INSERT INTO class_enrollments (id, class_id, user_id) VALUES ($1, $2, $3) ON CONFLICT (class_id, user_id) DO NOTHING",
        [enrollmentId, cls.id, (req as any).user.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to join class" });
    }
  });

  app.get("/api/classes/:id/students", authenticateToken, async (req, res) => {
    try {
      const studentsRes = await pool.query(`
        SELECT u.id, u.username, u.full_name, u.avatar, u.grade, ce.enrolled_at
        FROM class_enrollments ce
        JOIN users u ON ce.user_id = u.id
        WHERE ce.class_id = $1
        ORDER BY ce.enrolled_at DESC
      `, [req.params.id]);
      res.json(studentsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // +++ ASSIGNMENTS API +++
  app.get("/api/classes/:id/assignments", authenticateToken, async (req, res) => {
    try {
      const assignmentsRes = await pool.query(`
        SELECT a.*, l.title_ru as lecture_title_ru, l.course_id
        FROM assignments a
        JOIN lectures l ON a.lecture_id = l.id
        WHERE a.class_id = $1
        ORDER BY a.due_date ASC
      `, [req.params.id]);
      res.json(assignmentsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.post("/api/classes/:id/assignments", authenticateToken, requirePro, async (req, res) => {
    const { lecture_id, due_date } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(
        "INSERT INTO assignments (id, class_id, lecture_id, due_date) VALUES ($1, $2, $3, $4)",
        [id, req.params.id, lecture_id, due_date]
      );
      res.json({ id, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.post("/api/assignments/:assignmentId/submit", authenticateToken, async (req, res) => {
    const { assignmentId } = req.params;
    const userId = (req as any).user.id;
    const submissionId = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(
        "INSERT INTO assignment_submissions (id, assignment_id, user_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (assignment_id, user_id) DO UPDATE SET status = 'submitted'",
        [submissionId, assignmentId, userId, 'submitted']
      );

      const assignmentInfo = await pool.query(`
        SELECT a.id, a.class_id, c.teacher_id, l.title_ru as lecture_title
        FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN lectures l ON a.lecture_id = l.id
        WHERE a.id = $1
      `, [assignmentId]);

      if (assignmentInfo.rows.length > 0) {
        const { teacher_id, lecture_title, class_id } = assignmentInfo.rows[0];
        const notificationId = Math.random().toString(36).substr(2, 9);
        
        const userQuery = await pool.query("SELECT username, full_name FROM users WHERE id = $1", [userId]);
        const userName = userQuery.rows[0]?.full_name || userQuery.rows[0]?.username || 'Студент';
        
        await pool.query(
          "INSERT INTO notifications (id, user_id, type, message) VALUES ($1, $2, $3, $4)",
          [notificationId, teacher_id, 'assignment_submitted', `${userName} сдал(а) задание: "${lecture_title}"`]
        );
        
        // Emit real-time notification to teacher dashboard
        io.to(`teacher-${teacher_id}`).emit('new_notification', {
           id: notificationId,
           type: 'assignment_submitted',
           message: `${userName} сдал(а) задание: "${lecture_title}"`,
           created_at: new Date()
        });

        // Emit real-time progress update to class detail view
        io.to(`class-${class_id}`).emit('assignment_progress_update', {
           assignment_id: assignmentId,
           user_id: userId,
           status: 'submitted',
           lecture_id: (assignmentInfo.rows[0] as any).lecture_id
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Submission Error:', error);
      res.status(500).json({ error: "Failed to submit assignment" });
    }
  });

  // +++ LECTURE ACCESS API +++
  app.post("/api/lectures/:id/access", authenticateToken, async (req, res) => {
    const lectureId = req.params.id;
    const { userId, expiresAt } = req.body;
    const teacherId = (req as any).user.id;
    
    try {
      const userRoleRes = await pool.query("SELECT role FROM users WHERE id = $1", [teacherId]);
      const userRole = userRoleRes.rows[0]?.role;
      const isSuperAdmin = userRole === 'super_admin' || userRole === 'chief_editor';
      
      // Check if user exists
      const targetUserRes = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
      if (targetUserRes.rows.length === 0) {
        return res.status(404).json({ error: "User not found." });
      }
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Only admins can manage access." });
      }

      await pool.query(`
        INSERT INTO lecture_access (id, lecture_id, user_id, expires_at, granted_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (lecture_id, user_id) DO UPDATE SET expires_at = $4, granted_by = $5
      `, [Math.random().toString(36).substr(2, 9), lectureId, userId, expiresAt || null, teacherId]);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to grant access" });
    }
  });

  app.delete("/api/lectures/:id/access/:userId", authenticateToken, async (req, res) => {
    const lectureId = req.params.id;
    const userId = req.params.userId;
    const teacherId = (req as any).user.id;
    
    try {
      const userRoleRes = await pool.query("SELECT role FROM users WHERE id = $1", [teacherId]);
      const userRole = userRoleRes.rows[0]?.role;
      const isSuperAdmin = userRole === 'super_admin' || userRole === 'chief_editor';
      
      if (!isSuperAdmin) {
        return res.status(403).json({ error: "Only admins can manage access." });
      }

      await pool.query("DELETE FROM lecture_access WHERE lecture_id = $1 AND user_id = $2", [lectureId, userId]);

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to revoke access" });
    }
  });

  // +++ LECTURE RESOURCES API +++
  app.get("/api/lectures/:id/resources", async (req, res) => {
    try {
      const resourcesRes = await pool.query(
        "SELECT * FROM lecture_resources WHERE lecture_id = $1 ORDER BY created_at ASC",
        [req.params.id]
      );
      res.json(resourcesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.post("/api/lectures/:id/resources", authenticateToken, requirePro, async (req, res) => {
    const { title, url, type } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(
        "INSERT INTO lecture_resources (id, lecture_id, title, url, type) VALUES ($1, $2, $3, $4, $5)",
        [id, req.params.id, title, url, type]
      );
      res.json({ id, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to add resource" });
    }
  });

  app.delete("/api/resources/:id", authenticateToken, requirePro, async (req, res) => {
    try {
      await pool.query("DELETE FROM lecture_resources WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete resource" });
    }
  });

  // +++ CLASSES & ENROLLMENT API +++
  app.get("/api/classes", authenticateToken, async (req, res) => {
    try {
      const userRes = await pool.query("SELECT role FROM users WHERE id = $1", [(req as any).user.id]);
      const user = userRes.rows[0];
      
      let classesRes;
      if (user.role === 'super_admin' || user.role === 'chief_editor' || user.role === 'teacher') {
        classesRes = await pool.query("SELECT * FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC", [(req as any).user.id]);
      } else {
        classesRes = await pool.query(`
          SELECT c.* FROM classes c
          JOIN class_enrollments ce ON c.id = ce.class_id
          WHERE ce.user_id = $1
          ORDER BY ce.enrolled_at DESC
        `, [(req as any).user.id]);
      }
      res.json(classesRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  app.post("/api/classes", authenticateToken, requirePro, async (req, res) => {
    const { name } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    try {
      await pool.query(
        "INSERT INTO classes (id, name, teacher_id, invite_code) VALUES ($1, $2, $3, $4)",
        [id, name, (req as any).user.id, inviteCode]
      );
      res.json({ id, inviteCode, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  app.put("/api/classes/:id", authenticateToken, requirePro, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
      // check ownership
      const classRes = await pool.query("SELECT * FROM classes WHERE id = $1 AND teacher_id = $2", [id, (req as any).user.id]);
      if (classRes.rows.length === 0) {
        return res.status(404).json({ error: "Class not found or unauthorized" });
      }

      await pool.query("UPDATE classes SET name = $1 WHERE id = $2", [name, id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update class" });
    }
  });

  app.delete("/api/classes/:id", authenticateToken, requirePro, async (req, res) => {
    const { id } = req.params;

    try {
      // check ownership
      const classRes = await pool.query("SELECT * FROM classes WHERE id = $1 AND teacher_id = $2", [id, (req as any).user.id]);
      if (classRes.rows.length === 0) {
        return res.status(404).json({ error: "Class not found or unauthorized" });
      }

      await pool.query("DELETE FROM classes WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete class" });
    }
  });


  app.post("/api/classes/join", authenticateToken, async (req, res) => {
    const { inviteCode } = req.body;
    try {
      const classRes = await pool.query("SELECT id FROM classes WHERE invite_code = $1", [inviteCode]);
      if (classRes.rowCount === 0) return res.status(404).json({ error: "Class not found" });
      
      const classId = classRes.rows[0].id;
      await pool.query(
        "INSERT INTO class_enrollments (class_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [classId, (req as any).user.id]
      );
      res.json({ success: true, classId });
    } catch (error) {
      res.status(500).json({ error: "Failed to join class" });
    }
  });

  app.get("/api/classes/:id/students", authenticateToken, requirePro, async (req, res) => {
    try {
      const studentsRes = await pool.query(`
        SELECT u.id, u.username, u.full_name, u.avatar, u.grade, ce.enrolled_at
        FROM users u
        JOIN class_enrollments ce ON u.id = ce.user_id
        WHERE ce.class_id = $1
        ORDER BY u.full_name ASC
      `, [req.params.id]);
      res.json(studentsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.get("/api/classes/:id/progress", authenticateToken, requirePro, async (req, res) => {
    try {
      const progressRes = await pool.query(`
        SELECT lc.*, u.username, u.full_name, l.title_ru as lecture_title
        FROM lecture_completions lc
        JOIN users u ON lc.user_id = u.id
        JOIN lectures l ON lc.lecture_id = l.id
        JOIN class_enrollments ce ON u.id = ce.user_id
        WHERE ce.class_id = $1
        ORDER BY lc.completed_at DESC
      `, [req.params.id]);
      res.json(progressRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch class progress" });
    }
  });

  // +++ ASSIGNMENTS API +++
  app.get("/api/classes/:id/assignments", authenticateToken, async (req, res) => {
    try {
      const assignmentsRes = await pool.query(`
        SELECT a.*, l.title_ru as lecture_title_ru, l.course_id
        FROM assignments a
        JOIN lectures l ON a.lecture_id = l.id
        WHERE a.class_id = $1
        ORDER BY a.due_date ASC
      `, [req.params.id]);
      res.json(assignmentsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.post("/api/classes/:id/assignments", authenticateToken, requirePro, async (req, res) => {
    const { lecture_id, due_date } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(
        "INSERT INTO assignments (id, class_id, lecture_id, due_date) VALUES ($1, $2, $3, $4)",
        [id, req.params.id, lecture_id, due_date]
      );
      res.json({ id, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  app.get("/api/teacher/dashboard", authenticateToken, requirePro, async (req, res) => {
    try {
      const teacherId = (req as any).user.id;
      
      const [coursesRes, classesRes, statsRes, activityRes] = await Promise.all([
        pool.query("SELECT * FROM courses WHERE created_by = $1", [teacherId]),
        pool.query("SELECT * FROM classes WHERE teacher_id = $1", [teacherId]),
        pool.query(`
          SELECT COUNT(DISTINCT ce.user_id) as total_students,
                 COUNT(DISTINCT a.id) as total_assignments
          FROM classes c
          LEFT JOIN class_enrollments ce ON c.id = ce.class_id
          LEFT JOIN assignments a ON c.id = a.class_id
          WHERE c.teacher_id = $1
        `, [teacherId]),
        pool.query(`
          SELECT lc.*, u.username, u.full_name, l.title_ru as lecture_title
          FROM lecture_completions lc
          JOIN users u ON lc.user_id = u.id
          JOIN lectures l ON lc.lecture_id = l.id
          JOIN class_enrollments ce ON u.id = ce.user_id
          JOIN classes c ON ce.class_id = c.id
          WHERE c.teacher_id = $1
          ORDER BY lc.completed_at DESC
          LIMIT 10
        `, [teacherId])
      ]);

      res.json({
        courses: coursesRes.rows,
        classes: classesRes.rows,
        stats: statsRes.rows[0],
        recent_activity: activityRes.rows
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  async function isUserPro(userId: string) {
    const res = await pool.query("SELECT subscription_tier, role FROM users WHERE id = $1", [userId]);
    const u = res.rows[0];
    return u && (u.subscription_tier === 'pro' || u.role === 'super_admin' || u.role === 'chief_editor');
  }

  // --- (existing auth routes) ---
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    primaryTransporter.verify((error) => {
      if (error) {
        console.warn("SMTP Primary Verification Failed. Check your .env settings and port 465 access.");
      } else {
        console.log("SMTP Primary Connection Ready!");
      }
    });
  }

  app.post("/api/auth/register", async (req, res) => {
    const { username, email, full_name, school, grade } = req.body;
    try {
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const id = Math.random().toString(36).substr(2, 9);
      const userCountRes = await pool.query("SELECT COUNT(*) as count FROM users WHERE id NOT IN ('system', 'admin')");
      const role = parseInt(userCountRes.rows[0].count) === 0 ? 'super_admin' : 'guest';
      
      await pool.query(`
        INSERT INTO users (id, username, email, password, full_name, school, grade, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [id, username, email, hashedPassword, full_name, school, grade, role]);
      
      await logAction(id, username, 'REGISTER', { email, role });
      
      const token = jwt.sign({ id, role }, JWT_SECRET);
      res.json({ 
        success: true, 
        token, 
        user: { id, username, email, role, full_name, uid: id },
        generatedPassword: randomPassword
      });
    } catch (error: any) {
      if (error.message.includes('unique constraint')) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = userRes.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        await logAction(null, email, 'LOGIN_FAILED', { email });
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      const { password: _, ...userWithoutPassword } = user;
      await logAction(user.id, user.username, 'LOGIN_SUCCESS', { email });
      res.json({ 
        success: true, 
        token, 
        user: { ...userWithoutPassword, uid: user.id } 
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
      const user = userRes.rows[0];
      if (!user) return res.status(404).json({ error: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, uid: user.id });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    console.log(`Forgot password request for: ${email}`);
    try {
      const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (userRes.rowCount === 0) {
        console.log(`User not found: ${email}`);
        return res.status(404).json({ error: "Пользователь с таким email не найден" });
      }

      // Generate a random 8-character password
      const newPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);

      console.log(`NEW RANDOMLY GENERATED PASSWORD FOR ${email}: ${newPassword}`);

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const mailOptions = {
            from: process.env.SMTP_FROM || '"Bilingual Math" <taskforcedefy12@mail.ru>',
            to: email,
            subject: "Восстановление доступа - Bilingual Math",
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #10b981;">Новый пароль</h2>
                <p>Вы получили это письмо, потому что запросили восстановление доступа к вашему аккаунту на сайте <b>Bilingual Math</b>.</p>
                <p>Ваш новый случайно сгенерированный пароль для входа:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <span style="display: inline-block; padding: 12px 24px; background-color: #f3f4f6; color: #111827; border-radius: 8px; font-weight: bold; font-family: monospace; font-size: 24px; letter-spacing: 2px;">${newPassword}</span>
                </div>
                <p>Используйте этот пароль для входа в систему. Вы можете изменить его позже в настройках вашего профиля.</p>
                <p>Если вы не запрашивали восстановление пароля, рекомендуем как можно скорее войти и сменить этот пароль.</p>
              </div>
            `,
          };

          await sendEmailWithFallback(mailOptions);
          
          console.log(`Email successfully sent to ${email}`);
          return res.json({ success: true, message: "Новый пароль отправлен на ваш email" });
        } catch (mailError: any) {
          console.error("Failed to send email:", mailError);
          return res.status(500).json({ 
            error: "Ошибка при отправке письма. Пожалуйста, проверьте настройки SMTP.",
            details: mailError.message 
          });
        }
      } else {
        console.log("SMTP not configured, but new password generated.");
        return res.json({ success: true, message: `Новый пароль сгенерирован: ${newPassword} (SMTP не настроен)` });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
      const resetRes = await pool.query("SELECT * FROM password_resets WHERE email = $1 AND token = $2", [email, token]);
      const reset = resetRes.rows[0];
      
      if (!reset || new Date(reset.expires) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);
      await pool.query("DELETE FROM password_resets WHERE email = $1", [email]);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users/me/generate-password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const authToken = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as any;
      const newPassword = generateRandomPassword(12);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, decoded.id]);
      await logAction(decoded.id, null, 'PASSWORD_GENERATED', { timestamp: new Date().toISOString() });
      
      res.json({ success: true, newPassword });
    } catch (error) {
      console.error("Error generating password:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Admin Role Management
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    const { role, admin_role } = req.body;
    if (admin_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    const { admin_role } = req.body;
    if (admin_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    const { id } = req.params;
    const newPassword = generateRandomPassword(12);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    try {
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, id]);
      res.json({ success: true, newPassword });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden: Only Super-admin can delete users" });
      }

      const { id } = req.params;
      if (id === 'admin' || id === 'system') {
        return res.status(400).json({ error: "Cannot delete system users" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Delete related data first (though some have ON DELETE CASCADE, let's be safe)
        await client.query("DELETE FROM notifications WHERE user_id = $1", [id]);
        await client.query("DELETE FROM comments WHERE user_id = $1", [id]);
        await client.query("DELETE FROM favorites WHERE user_id = $1", [id]);
        await client.query("DELETE FROM term_versions WHERE user_id = $1", [id]);
        
        // Handle terms created by this user
        // Option A: Delete them
        // await client.query("DELETE FROM terms WHERE created_by = $1", [id]);
        // Option B: Reassign them to 'system'
        await client.query("UPDATE terms SET created_by = 'system' WHERE created_by = $1", [id]);
        
        await client.query("DELETE FROM users WHERE id = $1", [id]);
        await client.query("COMMIT");
        
        await logAction(decoded.id, null, 'DELETE_USER', { deletedUserId: id });
        res.json({ success: true });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden: Only Super-admin can delete users" });
      }

      const { id } = req.params;
      if (id === 'admin' || id === 'system') {
        return res.status(400).json({ error: "Cannot delete system users" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Delete related data first (though some have ON DELETE CASCADE, let's be safe)
        await client.query("DELETE FROM notifications WHERE user_id = $1", [id]);
        await client.query("DELETE FROM comments WHERE user_id = $1", [id]);
        await client.query("DELETE FROM favorites WHERE user_id = $1", [id]);
        await client.query("DELETE FROM term_versions WHERE user_id = $1", [id]);
        
        // Handle terms created by this user
        // Option A: Delete them
        // await client.query("DELETE FROM terms WHERE created_by = $1", [id]);
        // Option B: Reassign them to 'system'
        await client.query("UPDATE terms SET created_by = 'system' WHERE created_by = $1", [id]);
        
        await client.query("DELETE FROM users WHERE id = $1", [id]);
        await client.query("COMMIT");
        
        await logAction(decoded.id, null, 'DELETE_USER', { deletedUserId: id });
        res.json({ success: true });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden: Only Super-admin can delete users" });
      }

      const { id } = req.params;
      if (id === 'admin' || id === 'system') {
        return res.status(400).json({ error: "Cannot delete system users" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Delete related data first (though some have ON DELETE CASCADE, let's be safe)
        await client.query("DELETE FROM notifications WHERE user_id = $1", [id]);
        await client.query("DELETE FROM comments WHERE user_id = $1", [id]);
        await client.query("DELETE FROM favorites WHERE user_id = $1", [id]);
        await client.query("DELETE FROM term_versions WHERE user_id = $1", [id]);
        
        // Handle terms created by this user
        // Option A: Delete them
        // await client.query("DELETE FROM terms WHERE created_by = $1", [id]);
        // Option B: Reassign them to 'system'
        await client.query("UPDATE terms SET created_by = 'system' WHERE created_by = $1", [id]);
        
        await client.query("DELETE FROM users WHERE id = $1", [id]);
        await client.query("COMMIT");
        
        await logAction(decoded.id, null, 'DELETE_USER', { deletedUserId: id });
        res.json({ success: true });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Users API
  app.get("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`GET /api/users/${id} - Fetching user profile`);
    try {
      const userRes = await pool.query("SELECT id, username, full_name, school, grade, avatar, role, contact_info, bio FROM users WHERE id = $1", [id]);
      if (userRes.rows.length === 0) {
        console.log(`GET /api/users/${id} - User not found`);
        return res.json(null);
      }
      console.log(`GET /api/users/${id} - User found: ${userRes.rows[0].username}`);
      res.json(userRes.rows[0]);
    } catch (error: any) {
      console.error(`GET /api/users/${id} - Error:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const usersRes = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
      res.json(usersRes.rows);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // System Admin Endpoints
  app.get("/api/admin/logs", async (req, res) => {
    try {
      const { user_role } = req.query;
      if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
      const logsRes = await pool.query("SELECT * FROM logs ORDER BY created_at DESC LIMIT 500");
      res.json(logsRes.rows);
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/backup", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    try {
      const termsRes = await pool.query("SELECT * FROM terms");
      const translationsRes = await pool.query("SELECT * FROM term_translations");
      
      const backupData = {
        terms: termsRes.rows,
        translations: translationsRes.rows,
        timestamp: new Date().toISOString()
      };
      
      await logAction(null, 'SYSTEM', 'BACKUP_CREATED', { timestamp: new Date().toISOString() });
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=backup_postgres_${new Date().toISOString().split('T')[0]}.json`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/admin/export-terms", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    try {
      const termsRes = await pool.query("SELECT * FROM terms");
      const translationsRes = await pool.query("SELECT * FROM term_translations");
      
      res.json({ terms: termsRes.rows, translations: translationsRes.rows });
      await logAction(null, 'SYSTEM', 'TERMS_EXPORTED', { count: termsRes.rowCount });
    } catch (error) {
      res.status(500).json({ error: "Failed to export terms" });
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const termsRes = await pool.query("SELECT id FROM terms WHERE status = 'published'");
      const terms = termsRes.rows as { id: string }[];
      const baseUrl = "https://bilingvmath.ru";
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/login</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${baseUrl}/register</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`;

      terms.forEach(term => {
        sitemap += `
  <url><loc>${baseUrl}/term/${term.id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      });

      sitemap += `
</urlset>`;
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.post("/api/admin/import-terms", express.json({ limit: '10mb' }), async (req, res) => {
    const { user_role, data } = req.body;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    if (!data || !data.terms || !data.translations) {
      return res.status(400).json({ error: "Invalid backup data" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM term_translations");
      await client.query("DELETE FROM term_versions");
      await client.query("DELETE FROM comments");
      await client.query("DELETE FROM terms");
      
      for (const term of data.terms) {
        await client.query(
          "INSERT INTO terms (id, grade, subject_id, created_by, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
          [term.id, term.grade, term.subject_id, term.created_by, term.status, term.created_at]
        );
      }
      
      for (const trans of data.translations) {
        await client.query(
          "INSERT INTO term_translations (term_id, lang_code, name, definition, example, additional) VALUES ($1, $2, $3, $4, $5, $6)",
          [trans.term_id, trans.lang_code, trans.name, trans.definition, trans.example, trans.additional]
        );
      }
      
      await client.query("COMMIT");
      await logAction(null, 'SYSTEM', 'TERMS_RESTORED', { count: data.terms.length });
      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error('Restore error:', error);
      res.status(500).json({ error: "Failed to restore terms. Ensure subjects and users exist." });
    } finally {
      client.release();
    }
  });

  app.post("/api/users", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { id, username, email, role, full_name, school, grade, avatar, contact_info, bio } = req.body;

      // Ensure user can only update their own profile unless they are an admin
      if (decoded.id !== id && decoded.role !== 'super_admin' && decoded.role !== 'chief_editor') {
        return res.status(403).json({ error: "Forbidden: You can only update your own profile" });
      }

      await pool.query(`
        INSERT INTO users (id, username, email, role, full_name, school, grade, avatar, contact_info, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT(id) DO UPDATE SET
          username=EXCLUDED.username,
          full_name=EXCLUDED.full_name,
          school=EXCLUDED.school,
          grade=EXCLUDED.grade,
          avatar=EXCLUDED.avatar,
          contact_info=EXCLUDED.contact_info,
          bio=EXCLUDED.bio
      `, [id, username, email, role || 'student', full_name, school, grade, avatar, contact_info, bio]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving user:', error);
      res.status(401).json({ error: "Invalid token or internal error" });
    }
  });

  // Subjects API
  app.get("/api/subjects", async (req, res) => {
    try {
      const subjectsRes = await pool.query("SELECT * FROM subjects");
      res.json(subjectsRes.rows);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/subjects", authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Only Super-admin can manage subjects" });
    }
    const { id, slug, name_ru, name_tyv, icon, color } = req.body;
    try {
      const colorCheck = await pool.query("SELECT * FROM subjects WHERE color = $1 AND id != $2", [color, id]);
      if (colorCheck.rows.length > 0) return res.status(400).json({ error: "Color already in use" });

      await pool.query(`
        INSERT INTO subjects (id, slug, name_ru, name_tyv, icon, color)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT(id) DO UPDATE SET
          slug=EXCLUDED.slug,
          name_ru=EXCLUDED.name_ru,
          name_tyv=EXCLUDED.name_tyv,
          icon=EXCLUDED.icon,
          color=EXCLUDED.color
      `, [id, slug, name_ru, name_tyv, icon, color]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/subjects/:id", authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      await pool.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Languages API
  app.get("/api/languages", async (req, res) => {
    try {
      const languagesRes = await pool.query("SELECT * FROM languages");
      res.json(languagesRes.rows);
    } catch (error) {
      console.error('Error fetching languages:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/languages", async (req, res) => {
    const { code, name, native_name, flag, user_role } = req.body;
    if (user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Only Super-admin can manage languages" });
    }
    try {
      await pool.query(`
        INSERT INTO languages (code, name, native_name, flag)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT(code) DO UPDATE SET
          name=EXCLUDED.name,
          native_name=EXCLUDED.native_name,
          flag=EXCLUDED.flag
      `, [code, name, native_name, flag]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/languages/:code", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      await pool.query("DELETE FROM languages WHERE code = $1", [req.params.code]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Notifications API
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      if (!req.params.userId || req.params.userId === 'undefined') {
        console.warn('Notifications fetch attempted with invalid userId:', req.params.userId);
        return res.json([]);
      }
      const notificationsRes = await pool.query(`
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `, [req.params.userId]);
      res.json(notificationsRes.rows);
    } catch (error) {
      console.error('Failed to fetch notifications for user:', req.params.userId, error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await pool.query("UPDATE notifications SET is_read = 1 WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Helper to create notification
  async function createNotification(userId: string, type: string, termId: string | null, message: string) {
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await pool.query(`
        INSERT INTO notifications (id, user_id, type, term_id, message)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, userId, type, termId, message]);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  // Terms API
  app.get("/api/terms", async (req, res) => {
    try {
      const { status, subjectId, grade, createdBy } = req.query;
      console.log(`GET /api/terms - Filters: status=${status}, subjectId=${subjectId}, grade=${grade}, createdBy=${createdBy}`);
      let query = `
        SELECT t.*, u.username as author_name, u.avatar as author_avatar, u.full_name as author_full_name,
               (SELECT COUNT(*) FROM comments WHERE term_id = t.id) as comment_count
        FROM terms t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIdx = 1;
      if (status) {
        query += ` AND t.status = $${paramIdx++}`;
        params.push(status);
      }
      if (subjectId) {
        query += ` AND t.subject_id = $${paramIdx++}`;
        params.push(subjectId);
      }
      if (grade) {
        query += ` AND t.grade = $${paramIdx++}`;
        params.push(grade);
      }
      if (createdBy) {
        query += ` AND t.created_by = $${paramIdx++}`;
        params.push(createdBy);
      }
      query += " ORDER BY t.created_at DESC";
      const termsRes = await pool.query(query, params);
      const terms = termsRes.rows.slice(0, 100);
      
      if (terms.length === 0) {
        return res.json([]);
      }

      const termIds = terms.map(t => t.id);
      const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
      const transRes = await pool.query(
        `SELECT * FROM term_translations WHERE term_id IN (${placeholders})`, 
        termIds
      );
      
      const termsWithTranslations = terms.map(term => ({
        ...term,
        translations: transRes.rows.filter(tr => tr.term_id === term.id)
      }));
      
      res.json(termsWithTranslations);
    } catch (error: any) {
      console.error('Error fetching terms:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/terms/:id", async (req, res) => {
    try {
      const termRes = await pool.query(`
        SELECT t.*, 
               u.username as author_name, u.avatar as author_avatar, u.full_name as author_full_name,
               s.name_ru as subject_name_ru, s.name_tyv as subject_name_tyv,
               (SELECT COUNT(*) FROM comments WHERE term_id = t.id) as comment_count
        FROM terms t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        WHERE t.id = $1
      `, [req.params.id]);
      const term = termRes.rows[0];
      if (term) {
        const transRes = await pool.query("SELECT * FROM term_translations WHERE term_id = $1", [term.id]);
        term.translations = transRes.rows;
      }
      res.json(term || null);
    } catch (error) {
      console.error('Error fetching term:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/terms", async (req, res) => {
    const { id, grade, subject_id, status, translations, user_role, user_id, created_by } = req.body;
    const isModerator = user_role === 'chief_editor' || user_role === 'super_admin';
    let finalStatus;
    if (status === 'draft') {
      finalStatus = 'draft';
    } else if (isModerator) {
      finalStatus = status || 'published';
    } else {
      finalStatus = 'pending';
    }
    const creatorId = user_id || created_by || 'system';

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        INSERT INTO terms (id, grade, subject_id, created_by, status)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, grade, subject_id, creatorId, finalStatus]);
      
      for (const [langCode, tData] of Object.entries(translations) as [string, any][]) {
        await client.query(`
          INSERT INTO term_translations (term_id, lang_code, name, definition, example, additional)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, langCode, tData.name, tData.definition, tData.example, tData.additional]);
      }

      if (finalStatus === 'pending') {
        const adminsRes = await client.query("SELECT id FROM users WHERE role IN ('chief_editor', 'super_admin')");
        const termName = (translations as any).ru?.name || (translations as any).tyv?.name || 'Новая статья';
        for (const admin of adminsRes.rows) {
          await createNotification(admin.id, 'term_pending', id, `Новая статья на проверку: ${termName}`);
        }
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error('Term creation error:', error);
      res.status(500).json({ error: "Failed to create term" });
    } finally {
      client.release();
    }
  });

  app.put("/api/terms/:id", async (req, res) => {
    const { grade, subject_id, status, translations, user_id, created_by, username, user_role } = req.body;
    const termId = req.params.id;
    const editorId = user_id || created_by || 'system';

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const currentTermRes = await client.query("SELECT * FROM terms WHERE id = $1", [termId]);
      const currentTerm = currentTermRes.rows[0];
      const currentTransRes = await client.query("SELECT * FROM term_translations WHERE term_id = $1", [termId]);
      
      await client.query(`
        INSERT INTO term_versions (id, term_id, user_id, username, data)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        Math.random().toString(36).substr(2, 9),
        termId,
        editorId,
        username || 'System',
        JSON.stringify({ term: currentTerm, translations: currentTransRes.rows })
      ]);

      const isModerator = user_role === 'chief_editor' || user_role === 'super_admin';
      let finalStatus;
      if (status === 'draft') {
        finalStatus = 'draft';
      } else if (isModerator) {
        finalStatus = status || 'published';
      } else {
        finalStatus = 'pending';
      }
      
      await client.query(`
        UPDATE terms SET grade = $1, subject_id = $2, status = $3 WHERE id = $4
      `, [grade, subject_id, finalStatus, termId]);
      
      await client.query("DELETE FROM term_translations WHERE term_id = $1", [termId]);
      
      for (const [langCode, tData] of Object.entries(translations) as [string, any][]) {
        await client.query(`
          INSERT INTO term_translations (term_id, lang_code, name, definition, example, additional)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [termId, langCode, tData.name, tData.definition, tData.example, tData.additional]);
      }

      if (currentTerm && currentTerm.created_by !== editorId) {
        const termName = (translations as any).ru?.name || (translations as any).tyv?.name || 'Статья';
        await createNotification(currentTerm.created_by, 'term_edited', termId, `Ваша статья "${termName}" была отредактирована модератором.`);
      }
      
      if (finalStatus === 'pending') {
        const adminsRes = await client.query("SELECT id FROM users WHERE role IN ('chief_editor', 'super_admin')");
        const termName = (translations as any).ru?.name || (translations as any).tyv?.name || 'Статья';
        for (const admin of adminsRes.rows) {
          if (admin.id !== user_id) {
            await createNotification(admin.id, 'term_pending', termId, `Статья "${termName}" требует повторной проверки.`);
          }
        }
      }
      
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error('Term update error:', error);
      res.status(500).json({ error: "Failed to update term" });
    } finally {
      client.release();
    }
  });

  app.patch("/api/terms/:id", async (req, res) => {
    const { status, user_role } = req.body;
    const termId = req.params.id;

    console.log(`[Term Status Update] ID: ${termId}, New Status: ${status}, By Role: ${user_role}`);

    if (user_role !== 'chief_editor' && user_role !== 'super_admin') {
      console.warn(`[Term Status Update] Unauthorized attempt by role: ${user_role}`);
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      await pool.query("UPDATE terms SET status = $1 WHERE id = $2", [status, termId]);
      
      if (status === 'published') {
        const termRes = await pool.query("SELECT created_by FROM terms WHERE id = $1", [termId]);
        const transRes = await pool.query("SELECT name FROM term_translations WHERE term_id = $1 AND lang_code = 'ru'", [termId]);
        const termName = transRes.rows[0]?.name || 'Статья';
        
        if (termRes.rows[0]?.created_by) {
          console.log(`[Notification] Creating 'term_approved' for user ${termRes.rows[0].created_by}`);
          await createNotification(termRes.rows[0].created_by, 'term_approved', termId, `Ваша статья "${termName}" была одобрена и опубликована.`);
        }
      }
      
      await logAction(null, 'System', 'update_term_status', { termId, status, user_role });
      res.json({ success: true });
    } catch (error) {
      console.error('[Term Status Update] Failed:', error);
      res.status(500).json({ error: "Failed to update term status" });
    }
  });

  app.delete("/api/terms/:id", async (req, res) => {
    const userRole = req.query.user_role as string;
    
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM comments WHERE term_id = $1", [req.params.id]);
      await client.query("DELETE FROM favorites WHERE term_id = $1", [req.params.id]);
      await client.query("DELETE FROM term_versions WHERE term_id = $1", [req.params.id]);
      await client.query("DELETE FROM term_translations WHERE term_id = $1", [req.params.id]);
      await client.query("DELETE FROM terms WHERE id = $1", [req.params.id]);
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error('Term deletion error:', error);
      res.status(500).json({ error: "Failed to delete term" });
    } finally {
      client.release();
    }
  });

  // Favorites API
  app.get("/api/favorites", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const favoritesRes = await pool.query(`
        SELECT t.*, u.username as author_name, u.avatar as author_avatar, u.full_name as author_full_name,
               (SELECT COUNT(*) FROM comments WHERE term_id = t.id) as comment_count
        FROM favorites f
        JOIN terms t ON f.term_id = t.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC
      `, [decoded.id]);
      
      const terms = favoritesRes.rows;
      if (terms.length === 0) return res.json([]);

      const termIds = terms.map(t => t.id);
      const placeholders = termIds.map((_, i) => `$${i + 1}`).join(',');
      const transRes = await pool.query(
        `SELECT * FROM term_translations WHERE term_id IN (${placeholders})`, 
        termIds
      );
      
      const termsWithTranslations = terms.map(term => ({
        ...term,
        translations: transRes.rows.filter(tr => tr.term_id === term.id)
      }));
      
      res.json(termsWithTranslations);
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/favorites/:termId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { termId } = req.params;
      await pool.query(
        "INSERT INTO favorites (user_id, term_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [decoded.id, termId]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.delete("/api/favorites/:termId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { termId } = req.params;
      await pool.query(
        "DELETE FROM favorites WHERE user_id = $1 AND term_id = $2",
        [decoded.id, termId]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.get("/api/favorites/:termId/status", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ isFavorite: false });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { termId } = req.params;
      const favRes = await pool.query(
        "SELECT 1 FROM favorites WHERE user_id = $1 AND term_id = $2",
        [decoded.id, termId]
      );
      res.json({ isFavorite: favRes.rowCount > 0 });
    } catch (error) {
      res.json({ isFavorite: false });
    }
  });

  app.get("/api/terms/:id/versions", async (req, res) => {
    try {
      const versionsRes = await pool.query("SELECT * FROM term_versions WHERE term_id = $1 ORDER BY created_at DESC", [req.params.id]);
      res.json(versionsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // Comments API
  app.get("/api/terms/:termId/comments", async (req, res) => {
    try {
      const commentsRes = await pool.query("SELECT * FROM comments WHERE term_id = $1 ORDER BY created_at DESC", [req.params.termId]);
      res.json(commentsRes.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/terms/:termId/comments", authenticateToken, async (req, res) => {
    const { content } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      // Get user info
      const userRes = await pool.query("SELECT username, avatar FROM users WHERE id = $1", [(req as any).user.id]);
      const user = userRes.rows[0];

      await pool.query(`
        INSERT INTO comments (id, term_id, user_id, username, avatar, content)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, req.params.termId, (req as any).user.id, user.username, user.avatar, content]);
      res.json({ id, success: true });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/terms/:termId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const commentRes = await pool.query("SELECT user_id FROM comments WHERE id = $1", [req.params.commentId]);
      if (commentRes.rows.length === 0) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const comment = commentRes.rows[0];
      const isOwner = comment.user_id === (req as any).user.id;
      const isAdmin = (req as any).user.role === 'super_admin' || (req as any).user.role === 'chief_editor';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await pool.query("DELETE FROM comments WHERE id = $1", [req.params.commentId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Socket.IO Logic
  io.on("connection", (socket) => {
    socket.on("subscribe", (data) => {
      if (data.grade) socket.join(`grade-${data.grade}`);
      if (data.rooms && Array.isArray(data.rooms)) {
        data.rooms.forEach((room: string) => socket.join(room));
      }
    });

    socket.on("typing", (data) => {
      socket.to(`term-${data.termId}`).emit("user:typing", data);
    });
  });

  // +++ ACADEMIC REQUESTS API +++
  app.post("/api/academic-requests", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { full_name, school, position, subjects } = req.body;
      if (!full_name || !school || !subjects || !position) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const existing = await pool.query("SELECT * FROM academic_requests WHERE user_id = $1 AND status = 'pending'", [userId]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: "У вас уже есть заявка на рассмотрении." });
      }
      const requestId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO academic_requests (id, user_id, full_name, school, position, subjects) VALUES ($1, $2, $3, $4, $5, $6)",
        [requestId, userId, full_name, school, position, subjects]
      );
      res.json({ message: "Заявка успешно отправлена" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  app.get("/api/academic-requests", authenticateToken, async (req, res) => {
    try {
      const userRole = (req as any).query.user_role;
      if (userRole !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden" });
      }
      const requests = await pool.query(`
        SELECT ar.*, u.email as user_email, u.username 
        FROM academic_requests ar 
        JOIN users u ON ar.user_id = u.id 
        ORDER BY ar.created_at DESC
      `);
      res.json(requests.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.patch("/api/academic-requests/:id/status", authenticateToken, async (req, res) => {
    try {
      if ((req as any).body.user_role !== 'super_admin') {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { status } = req.body;
      const reqId = req.params.id;
      
      const requestRes = await pool.query("UPDATE academic_requests SET status = $1 WHERE id = $2 RETURNING *", [status, reqId]);
      if (requestRes.rows.length === 0) return res.status(404).json({ error: "Not found" });
      
      if (status === 'approved') {
        await pool.query("UPDATE users SET subscription_tier = 'pro', role = 'teacher' WHERE id = $1", [requestRes.rows[0].user_id]);
        
        try {
          const notifId = crypto.randomUUID();
          await pool.query(
            "INSERT INTO notifications (id, user_id, message) VALUES ($1, $2, $3)",
            [notifId, requestRes.rows[0].user_id, "Ваша заявка на Академический доступ одобрена. Теперь у вас есть доступ к функциям преподавателя!"]
          );
        } catch (e) {
          console.error("Failed to insert notification", e);
        }
      }
      
      res.json(requestRes.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update request" });
    }
  });

  // 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: "Internal server error" });
  });

  httpServer.listen(finalPort, "0.0.0.0", () => {
    console.log(`>>> Server is listening on port ${finalPort}`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`>>> Local URL: http://localhost:${finalPort}`);
  });
}

startServer();
