export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message?: string;
  error?: string;
}

/**
 * 프런트엔드에서 서버리스 API (/api/chat)를 호출합니다.
 * 실제 OpenAI API 호출 및 API Key는 서버에서 안전하게 관리됩니다.
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const data: ChatResponse = await response.json().catch(() => ({
    error: '서버 응답을 해석할 수 없습니다.',
  }));

  if (!response.ok) {
    throw new Error(data.error || `서버 오류가 발생했습니다. (상태 코드: ${response.status})`);
  }

  if (!data.message) {
    throw new Error('응답 메시지가 비어 있습니다.');
  }

  return data.message;
}

