const API_BASE = "http://127.0.0.1:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askAI(
  query: string,
  investigationId: number,
  conversation: ChatMessage[]
) {
  const response = await fetch(
    `${API_BASE}/ai/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        query,
        investigation_id: investigationId,
        conversation,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
      "AI request failed"
    );
  }

  return data;
}