/** One message in a chat with the model. The roles are the chat API's. */
export type ChatMessage = {
  role: "system" | "user";
  content: string;
};
