// Handles events and unique IDs for audio streaming
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import WebSocket from "ws";

interface AudioBuffer {
  [key: number]: string;
}

interface MediaMessage {
  streamSid: string;
  event: "media";
  media: {
    payload: string;
  };
}

interface MarkMessage {
  streamSid: string;
  event: "mark";
  mark: {
    name: string;
  };
}

type WebSocketMessage = MediaMessage | MarkMessage;

export class StreamService extends EventEmitter {
  // Initialize websocket connection and audio tracking
  private ws: WebSocket;
  private expectedAudioIndex: number;
  private audioBuffer: AudioBuffer;
  private streamSid: string;

  constructor(websocket: WebSocket) {
    super();
    this.ws = websocket;
    this.expectedAudioIndex = 0; // Tracks which audio piece should play next
    this.audioBuffer = {}; // Stores audio pieces that arrive out of order
    this.streamSid = ""; // Unique ID for this call's media stream
  }

  public setStreamSid(streamSid: string): void {
    this.streamSid = streamSid;
  }

  // Manages the order of audio playback
  public buffer(index: number | null, audio: string): void {
    // Welcome message has no index, play immediately
    if (index === null) {
      this.sendAudio(audio);
    }
    // If this is the next expected piece, play it and check for more
    else if (index === this.expectedAudioIndex) {
      this.sendAudio(audio);
      this.expectedAudioIndex++;

      // Play any stored pieces that are now ready in sequence
      while (this.audioBuffer.hasOwnProperty(this.expectedAudioIndex)) {
        const bufferedAudio = this.audioBuffer[this.expectedAudioIndex];
        this.sendAudio(bufferedAudio);
        delete this.audioBuffer[this.expectedAudioIndex];
        this.expectedAudioIndex++;
      }
    }
    // Store future pieces until their turn
    else {
      this.audioBuffer[index] = audio;
    }
  }

  // Actually sends audio to the caller through websocket
  private sendAudio(audio: string): void {
    // Send the audio data
    const mediaMessage: MediaMessage = {
      streamSid: this.streamSid,
      event: "media",
      media: {
        payload: audio,
      },
    };

    this.ws.send(JSON.stringify(mediaMessage));

    // Create and send a unique marker to track when audio finishes playing
    const markLabel = randomUUID();
    const markMessage: MarkMessage = {
      streamSid: this.streamSid,
      event: "mark",
      mark: {
        name: markLabel,
      },
    };

    this.ws.send(JSON.stringify(markMessage));

    // Let other parts of the system know audio was sent
    this.emit("audiosent", markLabel);
  }
}
