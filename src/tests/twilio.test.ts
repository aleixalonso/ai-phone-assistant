import request from "supertest";
import app from "../app";

describe("Twilio routes", () => {
  describe("POST /twilio/incoming", () => {
    it("returns TwiML with stream websocket URL", async () => {
      const response = await request(app).post("/twilio/incoming");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/text\/xml/);
      expect(response.text).toContain("<Response>");
      expect(response.text).toContain("<Connect>");
      expect(response.text).toMatch(/wss:\/\/.*\/twilio\/connection/);
    });
  });
});
