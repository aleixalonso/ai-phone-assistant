// Import required libraries for environment vars, buffer handling and events
import { config } from "dotenv";
import { Buffer } from "node:buffer";
import { EventEmitter } from "events";
import fetch from "node-fetch";

config();

interface GptReply {
  partialResponseIndex: number;
  partialResponse: string;
}

interface SpeechBuffer {
  [key: number]: string;
}

export class TextToSpeechService extends EventEmitter {
  private nextExpectedIndex: number;
  private speechBuffer: SpeechBuffer;

  constructor() {
    super();
    this.nextExpectedIndex = 0; // Track order of speech chunks
    this.speechBuffer = {}; // Store speech pieces
  }

  // Convert text to speech using Deepgram's API
  public async generate(
    gptReply: GptReply,
    interactionCount: number
  ): Promise<void> {
    const { partialResponseIndex, partialResponse } = gptReply;

    // Skip if no text to convert
    if (!partialResponse) {
      return;
    }

    try {
      // Call Deepgram's text-to-speech API
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${process.env.VOICE_MODEL}&encoding=mulaw&sample_rate=8000&container=none`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: partialResponse,
          }),
        }
      );

      // Handle successful response
      if (response.status === 200) {
        try {
          // Convert audio response to base64 format
          const blob = await response.blob();
          const audioArrayBuffer = await blob.arrayBuffer();
          const base64String = Buffer.from(audioArrayBuffer).toString("base64");

          // Send audio to be played
          this.emit(
            "speech",
            partialResponseIndex,
            base64String,
            partialResponse,
            interactionCount
          );
        } catch (error) {
          console.error("Error processing audio:", error);
        }
      } else {
        console.error("Deepgram TTS error:");
        console.error(response);
      }
    } catch (error) {
      console.error("Error occurred in TextToSpeech service:");
      console.error(error);
    }
  }
}

module.exports = { TextToSpeechService };
