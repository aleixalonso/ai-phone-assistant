import { Request, Response } from "express";
import { TwilioService } from "../services";
import WebSocket from "ws";

export class TwilioController {
  private twilioService: TwilioService;

  constructor() {
    this.twilioService = new TwilioService();
  }

  public handleIncomingCall = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const voiceResponse = await this.twilioService.handleIncomingCall();

      res.type("text/xml").send(voiceResponse.toString());
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };

  public handleWebSocketConnection = (ws: WebSocket): void => {
    this.twilioService.handleWebSocketConnection(ws);
  };
}
