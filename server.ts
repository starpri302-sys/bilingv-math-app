import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { Pool } from "pg";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const DATABASE_URL = process.env.DATABASE_URL;

let pool: any;

if (DATABASE_URL) {
  // Use real PostgreSQL
  const pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  pool = {
    query: (text: string, params?: any[]) => pgPool.query(text, params),
    connect: async () => {
      const client = await pgPool.connect();
      return {
        query: (text: string, params?: any[]) => client.query(text, params),
        exec: (text: string) => client.query(text),
        release: () => client.release(),
      };
    },
  };
} else {
  // Use SQLite fallback (for AI Studio or local dev without PG)
  const db = new Database("./sqlite.db");
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  function convertSql(text: string) {
    return text.replace(/\$\d+/g, '?');
  }

  pool = {
    query: async (text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> => {
      const sql = convertSql(text);
      if (sql.trim().toUpperCase().startsWith("SELECT") || sql.trim().toUpperCase().startsWith("PRAGMA")) {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...(params || []));
        return { rows, rowCount: rows.length };
      } else {
        const stmt = db.prepare(sql);
        const info = stmt.run(...(params || []));
        return { rows: [], rowCount: info.changes };
      }
    },
    exec: async (text: string) => {
      db.exec(text);
    },
    connect: async () => {
      return {
        query: async (text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> => {
          if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
            db.exec(text);
            return { rows: [], rowCount: 0 };
          }
          const sql = convertSql(text);
          if (sql.trim().toUpperCase().startsWith("SELECT") || sql.trim().toUpperCase().startsWith("PRAGMA")) {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...(params || []));
            return { rows, rowCount: rows.length };
          } else {
            const stmt = db.prepare(sql);
            const info = stmt.run(...(params || []));
            return { rows: [], rowCount: info.changes };
          }
        },
        exec: async (text: string) => {
          db.exec(text);
        },
        release: () => {},
      };
    },
  };
}

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

// Initialize database schema
async function initDb() {
  const client = await pool.connect();
  try {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO users (id, username, email, role, full_name) 
      VALUES ('system', 'system', 'system@system.com', 'super_admin', 'System')
      ON CONFLICT DO NOTHING;

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
    `);

    // Seed initial subjects and languages if empty
    const langCountRes = await client.query("SELECT COUNT(*) as count FROM languages");
    if (parseInt(langCountRes.rows[0].count) === 0) {
      await client.query("INSERT INTO languages (code, name, native_name, flag) VALUES ($1, $2, $3, $4)", ["ru", "Русский", "Русский", "🇷🇺"]);
      await client.query("INSERT INTO languages (code, name, native_name, flag) VALUES ($1, $2, $3, $4)", ["tyv", "Тувинский", "Тыва дыл", "🇹🇻"]);
    }

    const subjectCountRes = await client.query("SELECT COUNT(*) as count FROM subjects");
    if (parseInt(subjectCountRes.rows[0].count) === 0) {
      await client.query("INSERT INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", ["s1", "math", "Математика", "Математика", "calculator"]);
      await client.query("INSERT INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", ["s2", "physics", "Физика", "Физика", "atom"]);
      await client.query("INSERT INTO subjects (id, slug, name_ru, name_tyv, icon) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING", ["s3", "it", "Информатика", "Информатика", "monitor"]);
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

  const PORT = 3000;

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
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      const id = Math.random().toString(36).substr(2, 9);
      const userCountRes = await pool.query("SELECT COUNT(*) as count FROM users");
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
    try {
      const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (userRes.rowCount === 0) return res.status(404).json({ error: "User not found" });

      const token = Math.random().toString(36).substr(2, 12);
      const expires = new Date(Date.now() + 3600000).toISOString();

      await pool.query(`
        INSERT INTO password_resets (email, token, expires) 
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, expires = EXCLUDED.expires
      `, [email, token, expires]);

      console.log(`PASSWORD RESET TOKEN FOR ${email}: ${token}`);
      res.json({ success: true, message: "Reset token generated" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
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

  app.patch("/api/users/me/password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
    const authToken = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as any;
      const { currentPassword, newPassword } = req.body;
      
      const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
      const user = userRes.rows[0];
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Invalid current password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, decoded.id]);
      
      res.json({ success: true });
    } catch (error) {
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

  // Users API
  app.get("/api/users/:id", async (req, res) => {
    const userRes = await pool.query("SELECT id, username, full_name, school, grade, avatar, role FROM users WHERE id = $1", [req.params.id]);
    res.json(userRes.rows[0] || null);
  });

  app.get("/api/admin/users", async (req, res) => {
    const usersRes = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    res.json(usersRes.rows);
  });

  // System Admin Endpoints
  app.get("/api/admin/logs", async (req, res) => {
    const { user_role } = req.query;
    if (user_role !== 'super_admin') return res.status(403).json({ error: "Forbidden" });
    const logsRes = await pool.query("SELECT * FROM logs ORDER BY created_at DESC LIMIT 500");
    res.json(logsRes.rows);
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
      const { id, username, email, role, full_name, school, grade, avatar } = req.body;

      // Ensure user can only update their own profile unless they are an admin
      if (decoded.id !== id && decoded.role !== 'super_admin' && decoded.role !== 'chief_editor') {
        return res.status(403).json({ error: "Forbidden: You can only update your own profile" });
      }

      await pool.query(`
        INSERT INTO users (id, username, email, role, full_name, school, grade, avatar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(id) DO UPDATE SET
          username=EXCLUDED.username,
          full_name=EXCLUDED.full_name,
          school=EXCLUDED.school,
          grade=EXCLUDED.grade,
          avatar=EXCLUDED.avatar
      `, [id, username, email, role || 'student', full_name, school, grade, avatar]);
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

  app.post("/api/subjects", async (req, res) => {
    const { id, slug, name_ru, name_tyv, icon, user_role } = req.body;
    if (user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Only Super-admin can manage subjects" });
    }
    try {
      await pool.query(`
        INSERT INTO subjects (id, slug, name_ru, name_tyv, icon)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(id) DO UPDATE SET
          slug=EXCLUDED.slug,
          name_ru=EXCLUDED.name_ru,
          name_tyv=EXCLUDED.name_tyv,
          icon=EXCLUDED.icon
      `, [id, slug, name_ru, name_tyv, icon]);
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
      let query = `
        SELECT t.*, u.username as author_name, u.avatar as author_avatar, u.full_name as author_full_name
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
      const terms = termsRes.rows;
      
      const termsWithTranslations = await Promise.all(terms.map(async (term) => {
        const transRes = await pool.query("SELECT * FROM term_translations WHERE term_id = $1", [term.id]);
        return { ...term, translations: transRes.rows };
      }));
      
      res.json(termsWithTranslations);
    } catch (error) {
      console.error('Error fetching terms:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/terms/:id", async (req, res) => {
    try {
      const termRes = await pool.query(`
        SELECT t.*, u.username as author_name, u.avatar as author_avatar, u.full_name as author_full_name
        FROM terms t
        LEFT JOIN users u ON t.created_by = u.id
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
    const finalStatus = isModerator ? (status || 'published') : 'pending';
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
      const finalStatus = isModerator ? (status || 'published') : 'pending';
      
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

    if (user_role !== 'chief_editor' && user_role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      await pool.query("UPDATE terms SET status = $1 WHERE id = $2", [status, termId]);
      
      if (status === 'published') {
        const termRes = await pool.query("SELECT created_by FROM terms WHERE id = $1", [termId]);
        const transRes = await pool.query("SELECT name FROM term_translations WHERE term_id = $1 AND lang_code = 'ru'", [termId]);
        const termName = transRes.rows[0]?.name || 'Статья';
        
        if (termRes.rows[0]?.created_by) {
          await createNotification(termRes.rows[0].created_by, 'term_approved', termId, `Ваша статья "${termName}" была одобрена и опубликована.`);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Term status update error:', error);
      res.status(500).json({ error: "Failed to update term status" });
    }
  });

  app.delete("/api/terms/:id", async (req, res) => {
    const userRole = req.query.user_role as string;
    
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM comments WHERE term_id = $1", [req.params.id]);
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

  app.post("/api/terms/:termId/comments", async (req, res) => {
    const { id, user_id, username, avatar, content } = req.body;
    try {
      await pool.query(`
        INSERT INTO comments (id, term_id, user_id, username, avatar, content)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, req.params.termId, user_id, username, avatar, content]);
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
