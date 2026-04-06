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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table 'users' ready.");

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
    console.log("All tables created successfully.");

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
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth API
  // Verify SMTP on startup
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

      const token = Math.random().toString(36).substr(2, 12);
      const expires = new Date(Date.now() + 3600000).toISOString();

      await pool.query(`
        INSERT INTO password_resets (email, token, expires) 
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, expires = EXCLUDED.expires
      `, [email, token, expires]);

      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      
      console.log(`PASSWORD RESET TOKEN FOR ${email}: ${token}`);
      console.log(`RESET URL: ${resetUrl}`);

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const mailOptions = {
            from: process.env.SMTP_FROM || '"Bilingual Math" <taskforcedefy12@mail.ru>',
            to: email,
            subject: "Сброс пароля - Bilingual Math",
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #10b981;">Сброс пароля</h2>
                <p>Вы получили это письмо, потому что вы (или кто-то другой) запросили сброс пароля для вашего аккаунта на сайте <b>Bilingual Math</b>.</p>
                <p>Пожалуйста, нажмите на кнопку ниже, чтобы установить новый пароль:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Сбросить пароль</a>
                </div>
                <p>Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
                <p>Если вы не запрашивали сброс, просто проигнорируйте это письмо. Ваш пароль останется прежним.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 0.8em; color: #999; text-align: center;">Эта ссылка действительна в течение 1 часа.</p>
              </div>
            `,
          };

          await sendEmailWithFallback(mailOptions);
          
          console.log(`Email successfully sent to ${email}`);
          return res.json({ success: true, message: "Инструкции по сбросу пароля отправлены на ваш email" });
        } catch (mailError: any) {
          console.error("Failed to send email:", mailError);
          // Even if email fails, we return success in some cases to prevent email enumeration, 
          // but here we want to help the user debug.
          return res.status(500).json({ 
            error: "Ошибка при отправке письма. Пожалуйста, проверьте настройки SMTP или попробуйте позже.",
            details: mailError.message 
          });
        }
      } else {
        console.log("SMTP not configured, but token generated.");
        return res.json({ success: true, message: "Токен сброса сгенерирован (SMTP не настроен). Проверьте консоль сервера." });
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

  // Users API
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userRes = await pool.query("SELECT id, username, full_name, school, grade, avatar, role, contact_info, bio FROM users WHERE id = $1", [req.params.id]);
      res.json(userRes.rows[0] || null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
    } catch (error) {
      console.error('Error fetching terms:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/terms/:id", async (req, res) => {
    try {
      const termRes = await pool.query(`
        SELECT t.*, 
               u.username as author_name, u.avatar as author_avatar, u.full_name as author_full_name,
               s.name_ru as subject_name_ru, s.name_tyv as subject_name_tyv
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
