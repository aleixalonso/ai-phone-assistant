import { validateEnv } from "../config/environment";

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("skips validation in test environment", () => {
    process.env.NODE_ENV = "test";
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.TWILIO_API_KEY;
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;

    expect(() => validateEnv()).not.toThrow();
  });

  it("throws when a required environment variable is missing", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "mongodb://localhost:27017/myapp";
    process.env.JWT_SECRET = "secret";
    process.env.TWILIO_API_KEY = "twilio";
    process.env.DEEPGRAM_API_KEY = "deepgram";
    delete process.env.DEEPSEEK_API_KEY;

    expect(() => validateEnv()).toThrow(
      "Environment variable DEEPSEEK_API_KEY is missing"
    );
  });

  it("passes when all required environment variables exist", () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "mongodb://localhost:27017/myapp";
    process.env.JWT_SECRET = "secret";
    process.env.TWILIO_API_KEY = "twilio";
    process.env.DEEPGRAM_API_KEY = "deepgram";
    process.env.DEEPSEEK_API_KEY = "deepseek";

    expect(() => validateEnv()).not.toThrow();
  });
});
