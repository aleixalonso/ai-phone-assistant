import request from "supertest";
import app from "../app";

describe("Express Server", () => {
  describe("GET /", () => {
    it("should return hello message", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Hello from TypeScript Express Server!",
      });
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "healthy",
      });
    });
  });

  describe("Non-existent route", () => {
    it("should return 404 for non-existent routes", async () => {
      const response = await request(app).get("/non-existent-route");

      expect(response.status).toBe(404);
    });
  });
});
