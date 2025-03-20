import { EventEmitter } from "events";
import OpenAI from "openai";
import { env } from "../config";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

interface GptReply {
  partialResponseIndex: number;
  partialResponse: string;
}

export class GptService extends EventEmitter {
  // Set up the AI assistant with its initial personality and knowledge
  private openai: OpenAI;
  private userContext: Message[];
  private partialResponseIndex: number;

  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    this.partialResponseIndex = 0;
    this.userContext = [
      // Initial instructions and info for the AI
      {
        role: "system",
        content: `You are an AI-powered personal assistant responsible for answering and managing incoming phone calls on behalf of Aleix. Your goal is to:
         1. Politely greet callers and identify their purpose.
         2. Filter calls based on their importance, urgency, and relevance to the user.
         3. Take messages or schedule callbacks if the user is unavailable.
         4. Escalate important calls by notifying the user immediately.
         5. Handle spam or telemarketing calls appropriately by rejecting them or extracting useful details.
         6. Provide helpful responses based on the context and caller identity.
         7. You should sound natural, professional, and adaptive depending on the caller's tone. You must never provide sensitive information unless explicitly allowed by the user.
       You must add a '•' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech.`,
      },
      // Welcome message
      {
        role: "assistant",
        content: "Hello, this is Aleix's assistant. • How can I help you?",
      },
    ];
  }

  // Store the call's unique ID
  public setCallSid(callSid: string): void {
    this.userContext.push({ role: "system", content: `callSid: ${callSid}` });
  }

  // Add new messages to conversation history
  private updateUserContext(
    name: string,
    role: Message["role"],
    text: string
  ): void {
    if (name !== "user") {
      this.userContext.push({ role, name, content: text });
    } else {
      this.userContext.push({ role, content: text });
    }
  }

  // Main function that handles getting responses from GPT
  public async completion(
    text: string,
    interactionCount: number,
    role: Message["role"] = "user",
    name: string = "user"
  ): Promise<void> {
    // Add user's message to conversation history
    this.updateUserContext(name, role, text);

    // Get streaming response from GPT
    const stream = await this.openai.chat.completions.create({
      // model: "chatgpt-4o-latest",
      model: "deepseek-chat",
      messages: this.userContext,
      stream: true,
    });

    // Track both complete response and chunks for speaking
    let completeResponse = "";
    let partialResponse = "";

    // Process each piece of GPT's response as it comes
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const finishReason = chunk.choices[0].finish_reason;

      completeResponse += content;
      partialResponse += content;

      // When we hit a pause marker (•) or the end, send that chunk for speech
      if (content.trim().slice(-1) === "•" || finishReason === "stop") {
        const gptReply: GptReply = {
          partialResponseIndex: this.partialResponseIndex,
          partialResponse,
        };
        this.emit("gptreply", gptReply, interactionCount);
        this.partialResponseIndex++;
        partialResponse = "";
      }
    }

    // Add GPT's complete response to conversation history
    this.userContext.push({ role: "assistant", content: completeResponse });
    console.log(`GPT -> user context length: ${this.userContext.length}`);
  }
}

module.exports = { GptService };
