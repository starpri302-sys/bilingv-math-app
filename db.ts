import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
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
  console.log("Using in-process PostgreSQL database (PGlite) fallback...");
  const db = new PGlite("./pgdata");

  const query = async (text: string, params?: any[]): Promise<QueryResult> => {
    const res = await db.query(text, params);
    return {
      rows: res.rows,
      rowCount: res.rows.length,
    };
  };

  pool = {
    query,
    exec: async (text: string) => {
      await db.exec(text);
    },
    connect: async () => {
      return {
        query,
        exec: async (text: string) => {
          await db.exec(text);
        },
        release: () => {},
      };
    },
    testConnection: async () => {
      await db.query("SELECT 1");
    }
  };
}

export default pool;
