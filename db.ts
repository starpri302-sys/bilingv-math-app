import { Pool } from "pg";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export interface DbClient {
  query(text: string, params?: any[]): Promise<QueryResult>;
  exec(text: string): Promise<void>;
  release(): void;
}

export interface DbPool {
  query(text: string, params?: any[]): Promise<QueryResult>;
  connect(): Promise<DbClient>;
  exec(text: string): Promise<void>;
  testConnection(): Promise<void>;
}

let pool: DbPool;

function isPostgresUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  } catch (e) {
    return false;
  }
}

if (isPostgresUrl(DATABASE_URL)) {
  console.log("Using PostgreSQL database...");
  
  let connectionConfig: any = {
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  };

  try {
    const url = new URL(DATABASE_URL!);
    if (url.port) {
      const parsedPort = parseInt(url.port, 10);
      if (isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
        console.warn(`Invalid port detected in DATABASE_URL: ${url.port}. Removing port to use default.`);
        url.port = "";
        connectionConfig.connectionString = url.toString();
      }
    }
  } catch (e) {
    // This shouldn't happen because of isPostgresUrl check, but just in case
    console.error("DATABASE_URL parsing error:", e);
  }

  const pgPool = new Pool(connectionConfig);

  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  pool = {
    query: (text: string, params?: any[]) => pgPool.query(text, params),
    exec: async (text: string) => {
      const client = await pgPool.connect();
      try {
        await client.query(text);
      } finally {
        client.release();
      }
    },
    connect: async () => {
      const client = await pgPool.connect();
      return {
        query: (text: string, params?: any[]) => client.query(text, params),
        exec: async (text: string) => {
          await client.query(text);
        },
        release: () => client.release(),
      };
    },
    testConnection: async () => {
      const client = await pgPool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
    }
  };
} else {
  console.log("Using SQLite database fallback...");
  const db = new Database("./sqlite.db");
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  function convertSql(text: string) {
    return text.replace(/\$\d+/g, '?');
  }

  const query = async (text: string, params?: any[]): Promise<QueryResult> => {
    const sql = convertSql(text);
    const upperSql = sql.trim().toUpperCase();
    
    if (upperSql.startsWith("SELECT") || upperSql.startsWith("PRAGMA") || upperSql.startsWith("SHOW")) {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...(params || []));
      return { rows, rowCount: rows.length };
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(...(params || []));
      return { rows: [], rowCount: info.changes };
    }
  };

  pool = {
    query,
    exec: async (text: string) => {
      db.exec(text);
    },
    connect: async () => {
      return {
        query,
        exec: async (text: string) => {
          db.exec(text);
        },
        release: () => {},
      };
    },
    testConnection: async () => {
      db.prepare("SELECT 1").get();
    }
  };
}

export default pool;
