import { EventEmitter } from "events";
import { TwilioService } from "../services/twilio.service";

describe("TwilioService", () => {
  it("builds TwiML that points to the twilio websocket connection", async () => {
    const service = new TwilioService();

    const twiml = await service.handleIncomingCall();
    const xml = twiml.toString();

    expect(xml).toContain("<Response>");
    expect(xml).toContain("<Connect>");
    expect(xml).toContain("/twilio/connection");
  });

  it("updates state and emits welcome message on start event", () => {
    const service = new TwilioService() as any;
    const streamService = { setStreamSid: jest.fn() };
    const gptService = { setCallSid: jest.fn() };
    const ttsService = { generate: jest.fn() };
    const services = {
      streamSid: "",
      callSid: "",
      streamService,
      gptService,
      ttsService,
    };

    service.handleStart(
      {
        start: {
          streamSid: "stream-123",
          callSid: "call-456",
        },
      },
      services
    );

    expect(services.streamSid).toBe("stream-123");
    expect(services.callSid).toBe("call-456");
    expect(streamService.setStreamSid).toHaveBeenCalledWith("stream-123");
    expect(gptService.setCallSid).toHaveBeenCalledWith("call-456");
    expect(ttsService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        partialResponseIndex: null,
        partialResponse: expect.stringContaining("How can I help you?"),
      }),
      0
    );
  });

  it("removes mark entries when twilio confirms playback", () => {
    const service = new TwilioService() as any;
    const marks = ["a", "b", "c"];

    service.handleMark(
      {
        mark: { name: "b" },
        sequenceNumber: 10,
      },
      marks
    );

    expect(marks).toEqual(["a", "c"]);
  });

  it("wires service listeners and routes events correctly", () => {
    const service = new TwilioService() as any;
    const ws = { send: jest.fn() };
    const transcriptionService = new EventEmitter() as any;
    transcriptionService.send = jest.fn();
    const gptService = new EventEmitter() as any;
    gptService.completion = jest.fn();
    const ttsService = new EventEmitter() as any;
    ttsService.generate = jest.fn();
    const streamService = new EventEmitter() as any;
    streamService.buffer = jest.fn();
    const marks: string[] = ["existing-mark"];
    const services = {
      marks,
      streamSid: "stream-1",
      interactionCount: 0,
      transcriptionService,
      gptService,
      ttsService,
      streamService,
    };

    service.setupServiceListeners(ws, services);

    transcriptionService.emit("utterance", "interrupt me");
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({ streamSid: "stream-1", event: "clear" })
    );

    transcriptionService.emit("transcription", "");
    expect(gptService.completion).not.toHaveBeenCalled();

    transcriptionService.emit("transcription", "hello there");
    expect(gptService.completion).toHaveBeenCalledWith("hello there", 0);
    expect(services.interactionCount).toBe(1);

    gptService.emit("gptreply", { partialResponse: "answer" }, 1);
    expect(ttsService.generate).toHaveBeenCalledWith(
      { partialResponse: "answer" },
      1
    );

    ttsService.emit("speech", 2, "audio-bytes", "chunk", 2);
    expect(streamService.buffer).toHaveBeenCalledWith(2, "audio-bytes");

    streamService.emit("audiosent", "new-mark");
    expect(marks).toContain("new-mark");
  });

  it("routes websocket messages to start/media/mark/stop handlers", () => {
    const service = new TwilioService() as any;
    const handlers: Record<string, (data: any) => void> = {};
    const ws = {
      on: jest.fn((event: string, handler: (data: any) => void) => {
        handlers[event] = handler;
      }),
      send: jest.fn(),
    };
    const transcriptionService = { send: jest.fn() };
    const services = {
      streamSid: "stream-42",
      callSid: "",
      marks: [],
      interactionCount: 0,
      gptService: {},
      streamService: {},
      transcriptionService,
      ttsService: {},
    };
    const handleStartSpy = jest
      .spyOn(service, "handleStart")
      .mockImplementation(() => undefined);
    const handleMarkSpy = jest
      .spyOn(service, "handleMark")
      .mockImplementation(() => undefined);
    const setupServiceListenersSpy = jest
      .spyOn(service, "setupServiceListeners")
      .mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    service.setupWebSocketListeners(ws, services);

    expect(ws.on).toHaveBeenCalledWith("error", console.error);
    expect(setupServiceListenersSpy).toHaveBeenCalledWith(ws, services);

    handlers.message({
      toString: () =>
        JSON.stringify({ event: "start", start: { streamSid: "s", callSid: "c" } }),
    });
    expect(handleStartSpy).toHaveBeenCalled();

    handlers.message({
      toString: () => JSON.stringify({ event: "media", media: { payload: "abc" } }),
    });
    expect(transcriptionService.send).toHaveBeenCalledWith("abc");

    handlers.message({
      toString: () => JSON.stringify({ event: "mark", mark: { name: "m" } }),
    });
    expect(handleMarkSpy).toHaveBeenCalled();

    handlers.message({ toString: () => JSON.stringify({ event: "stop" }) });
    expect(logSpy).toHaveBeenCalledWith("Twilio -> Media stream stream-42 ended.");

    logSpy.mockRestore();
  });
});
