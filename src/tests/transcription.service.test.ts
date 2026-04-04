import { EventEmitter } from "events";

jest.mock("@deepgram/sdk", () => {
  const { EventEmitter: NodeEventEmitter } = require("events");
  class DeepgramClient {
    listen = {
      v1: {
        connect: jest.fn(async () => {
          const connection = new NodeEventEmitter() as any;
          connection.readyState = 1;
          connection.connect = jest.fn(() => connection);
          connection.sendMedia = jest.fn();
          return connection;
        }),
      },
    };
  }

  return {
    DeepgramClient,
  };
});

import { TranscriptionService } from "../services/transcription.service";

describe("TranscriptionService", () => {
  it("emits utterance for interim transcripts", async () => {
    const service = new TranscriptionService() as any;
    const utteranceHandler = jest.fn();
    service.on("utterance", utteranceHandler);
    await new Promise(process.nextTick);
    service.dgConnection.emit("open");

    service.dgConnection.emit("message", {
      channel: { alternatives: [{ transcript: "hello interim" }] },
      is_final: false,
      speech_final: false,
    });

    expect(utteranceHandler).toHaveBeenCalledWith("hello interim");
  });

  it("emits transcription when speech_final is true", async () => {
    const service = new TranscriptionService() as any;
    const transcriptionHandler = jest.fn();
    service.on("transcription", transcriptionHandler);
    await new Promise(process.nextTick);
    service.dgConnection.emit("open");

    service.dgConnection.emit("message", {
      channel: { alternatives: [{ transcript: "final text" }] },
      is_final: true,
      speech_final: true,
    });

    expect(transcriptionHandler).toHaveBeenCalledWith(" final text");
  });

  it("emits collected transcription on UtteranceEnd before speech_final", async () => {
    const service = new TranscriptionService() as any;
    const transcriptionHandler = jest.fn();
    service.on("transcription", transcriptionHandler);
    await new Promise(process.nextTick);
    service.dgConnection.emit("open");

    service.dgConnection.emit("message", {
      channel: { alternatives: [{ transcript: "partial result" }] },
      is_final: true,
      speech_final: false,
    });

    service.dgConnection.emit("message", {
      type: "UtteranceEnd",
      is_final: false,
      speech_final: false,
    });

    expect(transcriptionHandler).toHaveBeenCalledWith(" partial result");
  });

  it("sends decoded audio only when deepgram connection is open", async () => {
    const service = new TranscriptionService() as any;
    const payload = Buffer.from("audio-bytes").toString("base64");
    await new Promise(process.nextTick);

    service.send(payload);
    expect(service.dgConnection.sendMedia).toHaveBeenCalledTimes(1);

    service.dgConnection.readyState = 0;
    service.send(payload);
    expect(service.dgConnection.sendMedia).toHaveBeenCalledTimes(1);
  });
});
