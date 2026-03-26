import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import Database from "better-sqlite3";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

const db = new Database("database.sqlite");

async function logAction(userId: string | null, username: string | null, action: string, details: any) {
  const id = Math.random().toString(36).substr(2, 9);
  db.prepare("INSERT INTO logs (id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)").run(
    id, userId, username, action, JSON.stringify(details)
  );
}

// Initialize database schema
async function initDb() {
  db.exec(`
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      name_ru TEXT,
      name_tyv TEXT,
      icon TEXT
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
      subject_id TEXT,
      created_by TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(subject_id) REFERENCES subjects(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS term_translations (
      term_id TEXT,
      lang_code TEXT,
      name TEXT,
      definition TEXT,
      example TEXT,
      additional TEXT,
      PRIMARY KEY(term_id, lang_code),
      FOREIGN KEY(term_id) REFERENCES terms(id),
      FOREIGN KEY(lang_code) REFERENCES languages(code)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      term_id TEXT,
      user_id TEXT,
      username TEXT,
      avatar TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(term_id) REFERENCES terms(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS term_versions (
      id TEXT PRIMARY KEY,
      term_id TEXT,
      user_id TEXT,
      username TEXT,
      data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(term_id) REFERENCES terms(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
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
      user_id TEXT,
      type TEXT,
      term_id TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(term_id) REFERENCES terms(id)
    );
  `);

  // Seed initial subjects and languages if empty
  try {
    const langCount = (db.prepare("SELECT COUNT(*) as count FROM languages").get() as any).count;
    if (langCount === 0) {
      db.prepare("INSERT INTO languages (code, name, native_name, flag) VALUES (?, ?, ?, ?)").run("ru", "Русский", "Русский", "🇷🇺");
      db.prepare("INSERT INTO languages (code, name, native_name, flag) VALUES (?, ?, ?, ?)").run("tyv", "Тувинский", "Тыва дыл", "🇹🇻");
    }

    const subjectCount = (db.prepare("SELECT COUNT(*) as count FROM subjects").get() as any).count;
    if (subjectCount === 0) {
      db.prepare("INSERT OR IGNORE INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES (?, ?, ?, ?, ?)").run("s1", "math", "Математика", "Математика", "calculator");
      db.prepare("INSERT OR IGNORE INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES (?, ?, ?, ?, ?)").run("s2", "physics", "Физика", "Физика", "atom");
      db.prepare("INSERT OR IGNORE INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES (?, ?, ?, ?, ?)").run("s3", "it", "Информатика", "Информатика", "monitor");
    }
  } catch (error) {
    console.error("Seeding Error:", error);
  }
}

async function startServer() {
  console.log("Starting server...");
  try {
    await initDb();
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

  const PORT = parseInt(process.env.PORT || "3000", 10) || 3000;

  app.use(cors());
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
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
    max: 10, // Limit each IP to 10 login/forgot-password attempts per hour
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
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth API
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, full_name, school, grade } = req.body;
    try {
      // Generate random password as requested
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const id = Math.random().toString(36).substr(2, 9);
      const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
      const role = userCount === 0 ? 'super_admin' : 'guest';
      
      db.prepare(`
        INSERT INTO users (id, username, email, password, full_name, school, grade, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, username, email, hashedPassword, full_name, school, grade, role);
      
      await logAction(id, username, 'REGISTER', { email, role });
      
      const token = jwt.sign({ id, role }, JWT_SECRET);
      res.json({ 
        success: true, 
        token, 
        user: { id, username, email, role, full_name },
        generatedPassword: randomPassword // Send back to user so they know it
      });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user || !(await bcrypt.compare(password, user.password))) {
        await logAction(null, email, 'LOGIN_FAILED', { email });
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      const { password: _, ...userWithoutPassword } = user;
      await logAction(user.id, user.username, 'LOGIN_SUCCESS', { email });
      res.json({ success: true, token, user: userWithoutPassword });
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
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user) return res.status(404).json({ error: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      const token = Math.random().toString(36).substr(2, 12);
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      db.prepare(`
        INSERT INTO password_resets (email, token, expires) 
        VALUES (?, ?, ?)
        ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, expires = EXCLUDED.expires
      `).run(email, token, expires);

      // MOCK: In a real app, send email here
      console.log(`PASSWORD RESET TOKEN FOR ${email}: ${token}`);
      
      res.json({ success: true, message: "Reset token generated (check server console for demo)" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
      const reset = db.prepare("SELECT * FROM password_resets WHERE email = ? AND token = ?").get(email, token) as any;
      
      if (!reset || new Date(reset.expires) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hashedPassword, email);
      db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/users/me/password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const authToken = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as any;
      const { currentPassword, newPassword } = req.body;
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id) as any;
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Invalid current password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, decoded.id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Admin Role Management
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    const { role, admin_role } = req.body;
    if (admin_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Only Super-admin can change roles" });
    }
    try {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Users API
  app.get("/api/users/:id", async (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(user || null);
  });

  app.get("/api/admin/users", async (req, res) => {
    const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
    res.json(users);
  });

  // System Admin Endpoints
  app.get("/api/admin/logs", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    const logs = db.prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT 500").all();
    res.json(logs);
  });

  app.get("/api/admin/backup", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    try {
      const terms = db.prepare("SELECT * FROM terms").all();
      const translations = db.prepare("SELECT * FROM term_translations").all();
      
      const backupData = {
        terms,
        translations,
        timestamp: new Date().toISOString()
      };
      
      await logAction(null, 'SYSTEM', 'BACKUP_CREATED', { timestamp: new Date().toISOString() });
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=backup_sqlite_${new Date().toISOString().split('T')[0]}.json`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/admin/export-terms", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    const terms = db.prepare("SELECT * FROM terms").all();
    const translations = db.prepare("SELECT * FROM term_translations").all();
    
    res.json({ terms, translations });
    await logAction(null, 'SYSTEM', 'TERMS_EXPORTED', { count: terms.length });
  });

  app.get("/sitemap.xml", async (req, res) => {
    const terms = db.prepare("SELECT id FROM terms WHERE status = 'published'").all() as { id: string }[];
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
  });

  app.post("/api/admin/import-terms", express.json({ limit: '10mb' }), async (req, res) => {
    const { user_role, data } = req.body;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    
    if (!data || !data.terms || !data.translations) {
      return res.status(400).json({ error: "Invalid backup data" });
    }

    try {
      const importTransaction = db.transaction((data) => {
        db.prepare("DELETE FROM term_translations").run();
        db.prepare("DELETE FROM term_versions").run();
        db.prepare("DELETE FROM comments").run();
        db.prepare("DELETE FROM terms").run();
        
        const insertTerm = db.prepare("INSERT INTO terms (id, grade, subject_id, created_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?)");
        for (const term of data.terms) {
          insertTerm.run(term.id, term.grade, term.subject_id, term.created_by, term.status, term.created_at);
        }
        
        const insertTrans = db.prepare("INSERT INTO term_translations (term_id, lang_code, name, definition, example, additional) VALUES (?, ?, ?, ?, ?, ?)");
        for (const trans of data.translations) {
          insertTrans.run(trans.term_id, trans.lang_code, trans.name, trans.definition, trans.example, trans.additional);
        }
      });

      importTransaction(data);
      
      await logAction(null, 'SYSTEM', 'TERMS_RESTORED', { count: data.terms.length });
      res.json({ success: true });
    } catch (error) {
      console.error('Restore error:', error);
      res.status(500).json({ error: "Failed to restore terms. Ensure subjects and users exist." });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { id, username, email, role, full_name, school, grade, avatar } = req.body;
    try {
      db.prepare(`
        INSERT INTO users (id, username, email, role, full_name, school, grade, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username=EXCLUDED.username,
          full_name=EXCLUDED.full_name,
          school=EXCLUDED.school,
          grade=EXCLUDED.grade,
          avatar=EXCLUDED.avatar
      `).run(id, username, email, role || 'student', full_name, school, grade, avatar);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Subjects API
  app.get("/api/subjects", async (req, res) => {
    try {
      const subjects = db.prepare("SELECT * FROM subjects").all();
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/subjects", async (req, res) => {
    const { id, slug, name_ru, name_tyv, icon, user_role } = req.body;
    if (user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Only Super-admin can manage subjects" });
    }
    try {
      db.prepare(`
        INSERT INTO subjects (id, slug, name_ru, name_tyv, icon)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug=EXCLUDED.slug,
          name_ru=EXCLUDED.name_ru,
          name_tyv=EXCLUDED.name_tyv,
          icon=EXCLUDED.icon
      `).run(id, slug, name_ru, name_tyv, icon);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/subjects/:id", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      db.prepare("DELETE FROM subjects WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Languages API
  app.get("/api/languages", async (req, res) => {
    try {
      const languages = db.prepare("SELECT * FROM languages").all();
      res.json(languages);
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
      db.prepare(`
        INSERT INTO languages (code, name, native_name, flag)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          name=EXCLUDED.name,
          native_name=EXCLUDED.native_name,
          flag=EXCLUDED.flag
      `).run(code, name, native_name, flag);
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
      db.prepare("DELETE FROM languages WHERE code = ?").run(req.params.code);
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
      const notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `).all(req.params.userId);
      res.json(notifications);
    } catch (error) {
      console.error('Failed to fetch notifications for user:', req.params.userId, error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      db.prepare("DELETE FROM notifications WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Helper to create notification
  async function createNotification(userId: string, type: string, termId: string | null, message: string) {
    const id = Math.random().toString(36).substr(2, 9);
    try {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, term_id, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, type, termId, message);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  // Terms API
  app.get("/api/terms", async (req, res) => {
    try {
      const { status, subjectId, grade, createdBy } = req.query;
      let query = "SELECT * FROM terms WHERE 1=1";
      const params: any[] = [];
      if (status) {
        query += " AND status = ?";
        params.push(status);
      }
      if (subjectId) {
        query += " AND subject_id = ?";
        params.push(subjectId);
      }
      if (grade) {
        query += " AND grade = ?";
        params.push(grade);
      }
      if (createdBy) {
        query += " AND created_by = ?";
        params.push(createdBy);
      }
      query += " ORDER BY created_at DESC";
      const terms = db.prepare(query).all(params) as any[];
      
      // Fetch translations for each term
      const termsWithTranslations = terms.map((term) => {
        const translations = db.prepare("SELECT * FROM term_translations WHERE term_id = ?").all(term.id);
        return { ...term, translations };
      });
      
      res.json(termsWithTranslations);
    } catch (error) {
      console.error('Error fetching terms:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/terms/:id", async (req, res) => {
    try {
      const term = db.prepare("SELECT * FROM terms WHERE id = ?").get(req.params.id) as any;
      if (term) {
        const translations = db.prepare("SELECT * FROM term_translations WHERE term_id = ?").all(term.id);
        term.translations = translations;
      }
      res.json(term || null);
    } catch (error) {
      console.error('Error fetching term:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/terms", async (req, res) => {
    const { id, grade, subject_id, created_by, status, translations, user_role } = req.body;
    
    // Enforce pending status for non-moderators
    const isModerator = user_role === 'chief_editor' || user_role === 'super_admin';
    const finalStatus = isModerator ? (status || 'published') : 'pending';

    try {
      const createTermTransaction = db.transaction((data) => {
        db.prepare(`
          INSERT INTO terms (id, grade, subject_id, created_by, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, grade, subject_id, created_by, finalStatus);
        
        const insertTrans = db.prepare(`
          INSERT INTO term_translations (term_id, lang_code, name, definition, example, additional)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const [langCode, tData] of Object.entries(translations) as [string, any][]) {
          insertTrans.run(id, langCode, tData.name, tData.definition, tData.example, tData.additional);
        }

        // Notify admins if pending
        if (finalStatus === 'pending') {
          const admins = db.prepare("SELECT id FROM users WHERE role IN ('chief_editor', 'super_admin')").all() as any[];
          const termName = translations.ru?.name || translations.tyv?.name || 'Новая статья';
          for (const admin of admins) {
            createNotification(admin.id, 'term_pending', id, `Новая статья на проверку: ${termName}`);
          }
        }
      });

      createTermTransaction({ id, grade, subject_id, created_by, finalStatus, translations });
      res.json({ success: true });
    } catch (error) {
      console.error('Term creation error:', error);
      res.status(500).json({ error: "Failed to create term" });
    }
  });

  app.patch("/api/terms/:id", async (req, res) => {
    const { status, user_role } = req.body;
    if (user_role !== 'chief_editor' && user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Only Chief Editor or Super-admin can moderate" });
    }
    
    try {
      const moderateTransaction = db.transaction((termId, newStatus) => {
        const term = db.prepare("SELECT created_by FROM terms WHERE id = ?").get(termId) as any;
        const termNameRow = db.prepare("SELECT name FROM term_translations WHERE term_id = ? LIMIT 1").get(termId) as any;
        const termName = termNameRow?.name || 'Статья';

        db.prepare("UPDATE terms SET status = ? WHERE id = ?").run(newStatus, termId);

        if (newStatus === 'published' && term) {
          createNotification(term.created_by, 'term_published', termId, `Ваша статья "${termName}" опубликована!`);
        }
      });

      moderateTransaction(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      console.error('Term moderation error:', error);
      res.status(500).json({ error: "Failed to moderate term" });
    }
  });

  app.put("/api/terms/:id", async (req, res) => {
    const { grade, subject_id, status, translations, user_id, username, user_role } = req.body;
    const termId = req.params.id;

    if (user_role === 'guest') {
      return res.status(403).json({ error: "Forbidden: Guests cannot edit terms" });
    }

    try {
      const updateTransaction = db.transaction((data) => {
        // Create version before update
        const currentTerm = db.prepare("SELECT * FROM terms WHERE id = ?").get(termId) as any;
        const currentTranslations = db.prepare("SELECT * FROM term_translations WHERE term_id = ?").all(termId);
        
        db.prepare(`
          INSERT INTO term_versions (id, term_id, user_id, username, data)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          Math.random().toString(36).substr(2, 9),
          termId,
          user_id || 'system',
          username || 'System',
          JSON.stringify({ term: currentTerm, translations: currentTranslations })
        );

        const finalStatus = (user_role === 'chief_editor' || user_role === 'super_admin') ? (status || 'published') : 'pending';
        
        db.prepare(`
          UPDATE terms SET 
            grade = ?, 
            subject_id = ?, 
            status = ?
          WHERE id = ?
        `).run(grade, subject_id, finalStatus, termId);
        
        db.prepare("DELETE FROM term_translations WHERE term_id = ?").run(termId);
        
        const insertTrans = db.prepare(`
          INSERT INTO term_translations (term_id, lang_code, name, definition, example, additional)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const [langCode, tData] of Object.entries(translations) as [string, any][]) {
          insertTrans.run(termId, langCode, tData.name, tData.definition, tData.example, tData.additional);
        }

        // Notify author if edited by someone else
        if (currentTerm && currentTerm.created_by !== user_id) {
          const termName = translations.ru?.name || translations.tyv?.name || 'Статья';
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, term_id, message)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            Math.random().toString(36).substr(2, 9),
            currentTerm.created_by,
            'term_edited',
            termId,
            `Ваша статья "${termName}" была отредактирована модератором.`
          );
        }
        
        // Notify admins if status changed to pending
        if (finalStatus === 'pending') {
          const admins = db.prepare("SELECT id FROM users WHERE role IN ('chief_editor', 'super_admin')").all() as any[];
          const termName = translations.ru?.name || translations.tyv?.name || 'Статья';
          for (const admin of admins) {
            if (admin.id !== user_id) {
              db.prepare(`
                INSERT INTO notifications (id, user_id, type, term_id, message)
                VALUES (?, ?, ?, ?, ?)
              `).run(
                Math.random().toString(36).substr(2, 9),
                admin.id,
                'term_pending',
                termId,
                `Статья "${termName}" требует повторной проверки.`
              );
            }
          }
        }
      });

      updateTransaction({ grade, subject_id, status, translations, user_id, username, user_role });
      res.json({ success: true });
    } catch (error) {
      console.error('Term update error:', error);
      res.status(500).json({ error: "Failed to update term" });
    }
  });

  app.delete("/api/terms/:id", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'chief_editor' && user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const deleteTransaction = db.transaction((termId) => {
        db.prepare("DELETE FROM comments WHERE term_id = ?").run(termId);
        db.prepare("DELETE FROM term_versions WHERE term_id = ?").run(termId);
        db.prepare("DELETE FROM term_translations WHERE term_id = ?").run(termId);
        db.prepare("DELETE FROM terms WHERE id = ?").run(termId);
      });

      deleteTransaction(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Term deletion error:', error);
      res.status(500).json({ error: "Failed to delete term" });
    }
  });

  app.get("/api/terms/:id/versions", async (req, res) => {
    try {
      const versions = db.prepare("SELECT * FROM term_versions WHERE term_id = ? ORDER BY created_at DESC").all(req.params.id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // Comments API
  app.get("/api/terms/:termId/comments", async (req, res) => {
    try {
      const comments = db.prepare("SELECT * FROM comments WHERE term_id = ? ORDER BY created_at DESC").all(req.params.termId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/terms/:termId/comments", async (req, res) => {
    const { id, user_id, username, avatar, content } = req.body;
    try {
      db.prepare(`
        INSERT INTO comments (id, term_id, user_id, username, avatar, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.params.termId, user_id, username, avatar, content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Socket.IO Logic
  io.on("connection", (socket) => {
    socket.on("subscribe", (data) => {
      socket.join(`grade-${data.grade}`);
    });

    socket.on("typing", (data) => {
      socket.to(`term-${data.termId}`).emit("user:typing", data);
    });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server is listening on port ${PORT}`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`>>> Local URL: http://localhost:${PORT}`);
  });
}

startServer();
