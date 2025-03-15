import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface Environment {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  SERVER: string;
  TWILIO_API_KEY: string;
  DEEPGRAM_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  VOICE_MODEL: string;
}

// Provide default values and type checking for environment variables
export const env: Environment = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "mongodb://localhost:27017/myapp",
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  SERVER: process.env.SERVER || "localhost:3000",
  TWILIO_API_KEY: process.env.TWILIO_API_KEY || "",
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || "",
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
  VOICE_MODEL: process.env.VOICE_MODEL || "",
};

// Validate required environment variables
export const validateEnv = (): void => {
  const requiredEnvs: Array<keyof Environment> = [
    "DATABASE_URL",
    "JWT_SECRET",
    "TWILIO_API_KEY",
    "DEEPGRAM_API_KEY",
    "DEEPSEEK_API_KEY",
  ];

  for (const required of requiredEnvs) {
    if (!process.env[required]) {
      throw new Error(`Environment variable ${required} is missing`);
    }
  }
};
