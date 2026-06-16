import fs from "fs";
import path from "path";

const logFilePath = path.join(process.cwd(), "server_errors.log");

const logger = {
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ERROR: ${message}\n`;
    if (error) {
      logMessage += `Stack: ${error.stack || error.message || JSON.stringify(error)}\n`;
    }
    logMessage += `--------------------------------------------------\n`;
    
    console.error(logMessage);
    fs.appendFileSync(logFilePath, logMessage);
  },
  info: (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
  }
};

export default logger;
