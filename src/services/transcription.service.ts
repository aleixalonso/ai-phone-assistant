import {
  createClient,
  LiveTranscriptionEvents,
  DeepgramClient,
  ListenLiveClient,
} from "@deepgram/sdk";
import { Buffer } from "node:buffer";
import { EventEmitter } from "events";
import "colors";

interface TranscriptionEvent {
  channel?: {
    alternatives?: Array<{
      transcript: string;
    }>;
  };
  is_final: boolean;
  speech_final: boolean;
  type?: string;
}

export class TranscriptionService extends EventEmitter {
  private dgConnection: ListenLiveClient;
  private finalResult: string;
  private speechFinal: boolean;

  constructor() {
    super();
    const deepgram: DeepgramClient = createClient(
      process.env.DEEPGRAM_API_KEY || ""
    );

    this.dgConnection = deepgram.listen.live({
      encoding: "mulaw",
      sample_rate: 8000,
      model: "nova-2",
      punctuate: true,
      interim_results: true,
      endpointing: 200,
      utterance_end_ms: 1000,
    });

    this.finalResult = "";
    this.speechFinal = false;

    this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
      this.setupTranscriptionHandlers();
    });
  }

  private setupTranscriptionHandlers(): void {
    this.dgConnection.on(
      LiveTranscriptionEvents.Transcript,
      (transcriptionEvent: TranscriptionEvent) => {
        const alternatives = transcriptionEvent.channel?.alternatives;
        let text = alternatives?.[0]?.transcript || "";

        if (transcriptionEvent.type === "UtteranceEnd") {
          if (!this.speechFinal) {
            console.log(
              `UtteranceEnd received before speechFinal, emit the text collected so far: ${this.finalResult}`
                .yellow
            );
            this.emit("transcription", this.finalResult);
            return;
          } else {
            console.log(
              "STT -> Speech was already final when UtteranceEnd recevied"
                .yellow
            );
            return;
          }
        }

        if (transcriptionEvent.is_final && text.trim().length > 0) {
          this.finalResult += ` ${text}`;

          if (transcriptionEvent.speech_final) {
            this.speechFinal = true;
            this.emit("transcription", this.finalResult);
            this.finalResult = "";
          } else {
            this.speechFinal = false;
          }
        } else {
          this.emit("utterance", text);
        }
      }
    );

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.dgConnection.on(LiveTranscriptionEvents.Error, (error: Error) => {
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

    this.dgConnection.on(
      LiveTranscriptionEvents.Metadata,
      (metadata: unknown) => {
        console.error("STT -> deepgram metadata");
        console.error(metadata);
      }
    );

    this.dgConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log("STT -> Deepgram connection closed".yellow);
    });
  }

  public send(payload: string): void {
    if (this.dgConnection.getReadyState() === 1) {
      this.dgConnection.send(Buffer.from(payload, "base64"));
    }
  }
}
