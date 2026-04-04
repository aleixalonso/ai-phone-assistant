import { DeepgramClient, listen } from "@deepgram/sdk";
import { Buffer } from "node:buffer";
import { EventEmitter } from "events";

type TranscriptionEvent =
  | listen.ListenV1Results
  | listen.ListenV1UtteranceEnd;

interface DeepgramConnection {
  readyState: number;
  on(event: "open", callback: () => void): void;
  on(event: "message", callback: (message: TranscriptionEvent) => void): void;
  on(event: "error", callback: (error: Error) => void): void;
  on(event: "close", callback: () => void): void;
  connect(): DeepgramConnection;
  sendMedia(message: ArrayBufferLike | Blob | ArrayBufferView): void;
}

interface TranscriptLikeEvent {
  channel?: {
    alternatives?: Array<{
      transcript: string;
    }>;
  };
  is_final?: boolean;
  speech_final?: boolean;
  type?: string;
}

export class TranscriptionService extends EventEmitter {
  private dgConnection: DeepgramConnection | null;
  private finalResult: string;
  private speechFinal: boolean;

  constructor() {
    super();
    const deepgram = new DeepgramClient({
      apiKey: process.env.DEEPGRAM_API_KEY || "",
    });

    this.dgConnection = null;
    this.finalResult = "";
    this.speechFinal = false;

    void this.initializeConnection(deepgram);
  }

  private async initializeConnection(deepgram: DeepgramClient): Promise<void> {
    try {
      const connection = await deepgram.listen.v1.connect({
        model: "nova-2",
        encoding: "mulaw",
        sample_rate: 8000,
        punctuate: "true",
        interim_results: "true",
        endpointing: 200,
        utterance_end_ms: 1000,
        Authorization: `token ${process.env.DEEPGRAM_API_KEY || ""}`,
      });

      this.dgConnection = connection.connect();
      this.dgConnection.on("open", () => {
        this.setupTranscriptionHandlers();
      });
    } catch (error) {
      console.error("STT -> failed to initialize Deepgram connection");
      console.error(error);
    }
  }

  private setupTranscriptionHandlers(): void {
    this.dgConnection?.on("message", (transcriptionEvent: TranscriptionEvent) => {
      const event = transcriptionEvent as TranscriptLikeEvent;
      const alternatives = event.channel?.alternatives;
      const text = alternatives?.[0]?.transcript || "";

      if (event.type === "UtteranceEnd") {
        if (!this.speechFinal) {
          console.log(
            `UtteranceEnd received before speechFinal, emit the text collected so far: ${this.finalResult}`
          );
          this.emit("transcription", this.finalResult);
          return;
        } else {
          console.log("STT -> Speech was already final when UtteranceEnd recevied");
          return;
        }
      }

      if (event.is_final && text.trim().length > 0) {
        this.finalResult += ` ${text}`;

        if (event.speech_final) {
          this.speechFinal = true;
          this.emit("transcription", this.finalResult);
          this.finalResult = "";
        } else {
          this.speechFinal = false;
        }
      } else {
        this.emit("utterance", text);
      }
    });

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.dgConnection?.on("error", (error: Error) => {
      console.error("STT -> deepgram error");
      console.error(error);
    });

    /* this.dgConnection.on(
      LiveTranscriptionEvents.Warning,
      (warning: unknown) => {
        console.error("STT -> deepgram warning");
        console.error(warning);
      }
    ); */

    this.dgConnection?.on("close", () => {
      console.log("STT -> Deepgram connection closed");
    });
  }

  public send(payload: string): void {
    if (this.dgConnection?.readyState === 1) {
      const buffer = Buffer.from(payload, "base64");
      this.dgConnection.sendMedia(new Uint8Array(buffer));
    }
  }
}
