import { GptService } from "../services/gpt.service";

describe("GptService", () => {
  it("stores call sid in user context", () => {
    const service = new GptService() as any;

    service.setCallSid("call-123");

    const context = service.userContext as Array<{ content: string }>;
    expect(context[context.length - 1].content).toBe("callSid: call-123");
  });

  it("streams completion chunks and emits gptreply at split markers and stop", async () => {
    const service = new GptService() as any;
    const stream = (async function* () {
      yield {
        choices: [{ delta: { content: "Hello •" }, finish_reason: null }],
      };
      yield {
        choices: [{ delta: { content: "World" }, finish_reason: "stop" }],
      };
    })();
    const create = jest.fn().mockResolvedValue(stream);
    service.openai = { chat: { completions: { create } } };
    const replies: Array<{ reply: any; interactionCount: number }> = [];

    service.on("gptreply", (reply: any, interactionCount: number) => {
      replies.push({ reply, interactionCount });
    });

    await service.completion("Hi", 2);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-chat",
        stream: true,
      })
    );
    expect(replies).toHaveLength(2);
    expect(replies[0].interactionCount).toBe(2);
    expect(replies[0].reply.partialResponse).toContain("Hello •");
    expect(replies[1].reply.partialResponse).toContain("World");
    const context = service.userContext as Array<{ content: string }>;
    expect(context[context.length - 1].content).toContain("Hello •World");
  });
});
