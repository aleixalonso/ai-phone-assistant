import { Request, Response } from "express";
import WebSocket from "ws";
import { TwilioController } from "../controllers/twilio.controller";

describe("TwilioController", () => {
  it("returns TwiML XML on successful incoming call handling", async () => {
    const controller = new TwilioController();
    const mockTwiml = { toString: () => "<Response></Response>" };
    const handleIncomingCall = jest.fn().mockResolvedValue(mockTwiml);
    (controller as any).twilioService = { handleIncomingCall };

    const type = jest.fn().mockReturnThis();
    const send = jest.fn();
    const res = { type, send } as unknown as Response;

    await controller.handleIncomingCall({} as Request, res);

    expect(type).toHaveBeenCalledWith("text/xml");
    expect(send).toHaveBeenCalledWith("<Response></Response>");
  });

  it("returns 500 when incoming call handling throws", async () => {
    const controller = new TwilioController();
    const handleIncomingCall = jest.fn().mockRejectedValue(new Error("boom"));
    (controller as any).twilioService = { handleIncomingCall };

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await controller.handleIncomingCall({} as Request, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: "Internal server error" });
  });

  it("delegates websocket handling to service", () => {
    const controller = new TwilioController();
    const handleWebSocketConnection = jest.fn();
    (controller as any).twilioService = { handleWebSocketConnection };

    const ws = {} as WebSocket;
    controller.handleWebSocketConnection(ws);

    expect(handleWebSocketConnection).toHaveBeenCalledWith(ws);
  });
});
