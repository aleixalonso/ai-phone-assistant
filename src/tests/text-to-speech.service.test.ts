import fetch from "node-fetch";
import { TextToSpeechService } from "../services/text-to-speech.service";

jest.mock("node-fetch", () => jest.fn());

describe("TextToSpeechService", () => {
  const mockedFetch = fetch as unknown as jest.Mock;

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("emits speech when deepgram returns audio", async () => {
    const service = new TextToSpeechService();
    const onSpeech = jest.fn();
    service.on("speech", onSpeech);
    mockedFetch.mockResolvedValue({
      status: 200,
      blob: async () => ({
        arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      }),
    });

    await service.generate(
      { partialResponseIndex: 1, partialResponse: "hello world" },
      5
    );

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(onSpeech).toHaveBeenCalledWith(1, "AQID", "hello world", 5);
  });

  it("skips request when partial response is empty", async () => {
    const service = new TextToSpeechService();

    await service.generate({ partialResponseIndex: 0, partialResponse: "" }, 1);

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("does not emit speech when deepgram responds with non-200", async () => {
    const service = new TextToSpeechService();
    const onSpeech = jest.fn();
    service.on("speech", onSpeech);
    mockedFetch.mockResolvedValue({
      status: 500,
    });

    await service.generate(
      { partialResponseIndex: 2, partialResponse: "hello" },
      9
    );

    expect(onSpeech).not.toHaveBeenCalled();
  });
});
