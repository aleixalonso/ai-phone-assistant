import { EventEmitter } from "events";
import OpenAI from "openai";

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
    this.openai = new OpenAI();
    this.partialResponseIndex = 0;
    this.userContext = [
      // Initial instructions and info for the AI
      {
        role: "system",
        content: `You are a helpful assistant for Bart's Automotive. 
       Keep your responses brief but friendly. Don't ask more than 1 question at a time. 
       If asked about services not listed below, politely explain we don't offer that service but can refer them to another shop.
       Key Information:
       - Hours: Monday to Friday 9 AM to 5 PM
       - Address: 123 Little Collins Street, Melbourne
       - Services: Car service, brake repairs, transmission work, towing, and general repairs
       You must add a '•' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech.`,
      },
      // Welcome message
      {
        role: "assistant",
        content: "Welcome to Bart's Automotive. • How can I help you today?",
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
      model: "chatgpt-4o-latest",
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
