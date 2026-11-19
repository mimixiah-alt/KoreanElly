export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 프런트엔드에서 서버리스 API (/api/chat)를 스트리밍 방식으로 호출합니다.
 * 실제 OpenAI API 호출 및 API Key는 서버에서 안전하게 관리됩니다.
 *
 * @param messages 대화 메시지 목록
 * @param onChunk 새로운 텍스트 청크가 도착할 때마다 실시간으로 호출되는 콜백 함수
 * @returns 최종 완성된 전체 텍스트 응답
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `서버 오류가 발생했습니다. (상태 코드: ${response.status})`
    );
  }

  if (!response.body) {
    throw new Error('응답 본문 스트림을 읽을 수 없습니다.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedMessage = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      accumulatedMessage += chunk;
      onChunk?.(chunk);
    }
  }

  return accumulatedMessage;
}
