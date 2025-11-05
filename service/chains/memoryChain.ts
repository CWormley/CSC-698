import { RunnableSequence } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { getLLM } from '../LLM/aiService.js';

export function createUserChatChain(userId: string) {
  // Use the centralized LLM instance
  const model = getLLM({ temperature: 0.7 });

  // In-memory short-term chat memory
  const memory = new InMemoryChatMessageHistory();

  // Prompt template using chat history
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful personal AI assistant with memory for the user."],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
  ]);

  const chain = RunnableSequence.from([
    async (input: { input: string }) => {
      const history = await memory.getMessages();
      return { input: input.input, history };
    },
    prompt,
    model,
    async (message) => {
      // Add messages to memory
      await memory.addMessage(new HumanMessage(message.input ?? ""));
      await memory.addMessage(new AIMessage(message.output ?? message.content ?? ""));
      return message;
    },
  ]);

  return chain;
}
