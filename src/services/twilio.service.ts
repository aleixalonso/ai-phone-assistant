import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import { env } from "../config";
import { StreamService } from "./stream.service";
import { GptService } from "./gpt.service";
import { TranscriptionService } from "./transcription.service";
import { TextToSpeechService } from "./text-to-speech.service";
import WebSocket from "ws";

export class TwilioService {
  // In a real app, this would interact with a database
  public async handleIncomingCall() {
    const twiml = new VoiceResponse();
    const connect = twiml.connect();
    // Tell Twilio where to connect the call's media stream
    connect.stream({ url: `wss://${env.SERVER}/twilio/connection` });
    return twiml;
  }

  public handleWebSocketConnection(ws: WebSocket): void {
    try {
      let streamSid: string;
      let callSid: string;
      const marks: string[] = [];
      let interactionCount = 0;

      const gptService = new GptService();
      const streamService = new StreamService(ws);
      const transcriptionService = new TranscriptionService();
      const ttsService = new TextToSpeechService();
      // Initialize streamSid and callSid with empty strings to avoid undefined errors
      streamSid = "";
      callSid = "";

      this.setupWebSocketListeners(ws, {
        streamSid,
        callSid,
        marks,
        interactionCount,
        gptService,
        streamService,
        transcriptionService,
        ttsService,
      });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      ws.close();
    }
  }

  private setupWebSocketListeners(
    ws: WebSocket,
    services: {
      streamSid: string;
      callSid: string;
      marks: string[];
      interactionCount: number;
      gptService: GptService;
      streamService: StreamService;
      transcriptionService: TranscriptionService;
      ttsService: TextToSpeechService;
    }
  ): void {
    const {
      streamSid,
      callSid,
      marks,
      interactionCount,
      gptService,
      streamService,
      transcriptionService,
      ttsService,
    } = services;

    ws.on("error", console.error);

    ws.on("message", (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case "start":
          this.handleStart(msg, services);
          break;
        case "media":
          transcriptionService.send(msg.media.payload);
          break;
        case "mark":
          this.handleMark(msg, marks);
          break;
        case "stop":
          console.log(`Twilio -> Media stream ${streamSid} ended.`);
          break;
      }
    });

    this.setupServiceListeners(ws, services);
  }

  private handleStart(msg: any, services: any): void {
    const { streamService, gptService, ttsService } = services;
    services.streamSid = msg.start.streamSid;
    services.callSid = msg.start.callSid;

    streamService.setStreamSid(services.streamSid);
    gptService.setCallSid(services.callSid);

    console.log(`Twilio -> Starting Media Stream for ${services.streamSid}`);
    ttsService.generate(
      {
        partialResponseIndex: null,
        partialResponse: "I'm Aleix assistant. • How can I help you today?",
      },
      0
    );
  }

  private handleMark(msg: any, marks: string[]): void {
    const label = msg.mark.name;
    console.log(
      `Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`
    );
    const index = marks.indexOf(msg.mark.name);
    if (index > -1) {
      marks.splice(index, 1);
    }
  }

  private setupServiceListeners(ws: WebSocket, services: any): void {
    const {
      marks,
      streamSid,
      interactionCount,
      transcriptionService,
      gptService,
      ttsService,
      streamService,
    } = services;

    transcriptionService.on("utterance", (text: string) => {
      if (marks.length > 0 && text?.length > 5) {
        console.log("Twilio -> Interruption, Clearing stream");
        ws.send(
          JSON.stringify({
            streamSid,
            event: "clear",
          })
        );
      }
    });

    transcriptionService.on("transcription", (text: string) => {
      if (!text) return;
      console.log(`Interaction ${interactionCount} – STT -> GPT: ${text}`);
      gptService.completion(text, interactionCount);
      services.interactionCount += 1;
    });

    gptService.on("gptreply", (gptReply: any, icount: number) => {
      console.log(
        `Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`
      );
      ttsService.generate(gptReply, icount);
    });

    ttsService.on(
      "speech",
      (responseIndex: number, audio: any, label: string, icount: number) => {
        console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`);
        streamService.buffer(responseIndex, audio);
      }
    );

    streamService.on("audiosent", (markLabel: string) => {
      marks.push(markLabel);
    });
  }
}
