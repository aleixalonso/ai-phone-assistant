import { EventEmitter } from "events";

jest.mock("@deepgram/sdk", () => {
  const { EventEmitter: NodeEventEmitter } = require("events");
  const createClient = () => ({
    listen: {
      live: () => {
        const connection = new NodeEventEmitter() as any;
        connection.getReadyState = jest.fn(() => 1);
        connection.send = jest.fn();
        return connection;
      },
    },
  });

  return {
    LiveTranscriptionEvents: {
      Open: "open",
      Transcript: "transcript",
      Error: "error",
      Metadata: "metadata",
      Close: "close",
    },
    createClient,
  };
});

import { LiveTranscriptionEvents } from "@deepgram/sdk";
import { TranscriptionService } from "../services/transcription.service";

describe("TranscriptionService", () => {
  it("emits utterance for interim transcripts", () => {
    const service = new TranscriptionService() as any;
    const utteranceHandler = jest.fn();
    service.on("utterance", utteranceHandler);
    service.dgConnection.emit(LiveTranscriptionEvents.Open);

    service.dgConnection.emit(LiveTranscriptionEvents.Transcript, {
      channel: { alternatives: [{ transcript: "hello interim" }] },
      is_final: false,
      speech_final: false,
    });

    expect(utteranceHandler).toHaveBeenCalledWith("hello interim");
  });

  it("emits transcription when speech_final is true", () => {
    const service = new TranscriptionService() as any;
    const transcriptionHandler = jest.fn();
    service.on("transcription", transcriptionHandler);
    service.dgConnection.emit(LiveTranscriptionEvents.Open);

    service.dgConnection.emit(LiveTranscriptionEvents.Transcript, {
      channel: { alternatives: [{ transcript: "final text" }] },
      is_final: true,
      speech_final: true,
    });

    expect(transcriptionHandler).toHaveBeenCalledWith(" final text");
  });

  it("emits collected transcription on UtteranceEnd before speech_final", () => {
    const service = new TranscriptionService() as any;
    const transcriptionHandler = jest.fn();
    service.on("transcription", transcriptionHandler);
    service.dgConnection.emit(LiveTranscriptionEvents.Open);

    service.dgConnection.emit(LiveTranscriptionEvents.Transcript, {
      channel: { alternatives: [{ transcript: "partial result" }] },
      is_final: true,
      speech_final: false,
    });

    service.dgConnection.emit(LiveTranscriptionEvents.Transcript, {
      type: "UtteranceEnd",
      is_final: false,
      speech_final: false,
    });

    expect(transcriptionHandler).toHaveBeenCalledWith(" partial result");
  });

  it("sends decoded audio only when deepgram connection is open", () => {
    const service = new TranscriptionService() as any;
    const payload = Buffer.from("audio-bytes").toString("base64");

    service.send(payload);
    expect(service.dgConnection.send).toHaveBeenCalledTimes(1);

    service.dgConnection.getReadyState.mockReturnValue(0);
    service.send(payload);
    expect(service.dgConnection.send).toHaveBeenCalledTimes(1);
  });
});
