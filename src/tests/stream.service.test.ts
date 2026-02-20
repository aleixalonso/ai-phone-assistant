import { StreamService } from "../services/stream.service";

type MockWebSocket = {
  send: jest.Mock<void, [string]>;
};

describe("StreamService", () => {
  const parseSentEvents = (ws: MockWebSocket): Array<{ event: string }> => {
    return ws.send.mock.calls.map(([payload]) => JSON.parse(payload));
  };

  it("sends audio immediately when index is null", () => {
    const ws: MockWebSocket = { send: jest.fn() };
    const service = new StreamService(ws as any);
    service.setStreamSid("stream-1");

    service.buffer(null, "base64-audio");

    expect(ws.send).toHaveBeenCalledTimes(2);
    const events = parseSentEvents(ws);
    expect(events[0].event).toBe("media");
    expect(events[1].event).toBe("mark");
  });

  it("buffers out-of-order audio and flushes in sequence", () => {
    const ws: MockWebSocket = { send: jest.fn() };
    const service = new StreamService(ws as any);
    service.setStreamSid("stream-2");

    service.buffer(1, "audio-1");
    expect(ws.send).not.toHaveBeenCalled();

    service.buffer(0, "audio-0");

    expect(ws.send).toHaveBeenCalledTimes(4);
    const events = parseSentEvents(ws);
    expect(events[0].event).toBe("media");
    expect(events[2].event).toBe("media");
  });
});
