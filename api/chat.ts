import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// 나중에 쉽게 수정할 수 있도록 분리된 시스템 프롬프트 상수
export const SYSTEM_PROMPT = `당신은 친절하고 실력 있는 '영어 단어 퀴즈 챗봇'입니다.
다음 원칙을 엄격히 준수하여 한국어로 학습자를 도와주세요:

1. 정보 확인 (필수):
   - 사용자가 원하는 학습 주제(예: 비즈니스, 여행, 일상, 토익 등)나 난이도(예: 초급, 중급, 고급 등)를 명시하지 않았다면, 단어를 먼저 나열하지 말고 어떤 주제나 난이도로 공부하고 싶은지 먼저 친절하게 물어보세요.

2. 단어 학습 규칙:
   - 답변은 한국어로 간결하고 명확하게 작성하세요.
   - 영어 단어는 한 번에 최대 3개까지만 소개해 주세요.
   - 각 단어마다 다음 형식을 반드시 포함하세요:
     * 단어 (품사, 발음 팁)
     * 한국어 뜻
     * 짧고 실용적인 영어 예문과 한국어 해석

3. 복습 퀴즈 (필수):
   - 단어 소개가 끝난 직후, 이번에 배운 단어에 대한 짧은 복습 퀴즈를 딱 1개만 내주세요. (예: 빈칸 채우기 문장 또는 알맞은 단어 맞히기)
   - 사용자가 이전 퀴즈의 답을 제출했다면, 정답 여부를 따뜻하게 확인해주고 간단한 해설을 덧붙인 뒤 다음 학습으로 넘어가세요.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 응답 헬퍼 함수 (JSON 응답용)
  const sendJson = (statusCode: number, payload: Record<string, unknown>) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(statusCode).json(payload);
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  if (req.method !== 'POST') {
    return sendJson(405, { error: 'Method Not Allowed. POST 요청만 지원합니다.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return sendJson(500, {
      error:
        '서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. 프로젝트 루트의 .env.local 파일에 유효한 OpenAI API 키를 입력해 주세요.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return sendJson(400, { error: '요청 본문이 유효한 JSON 형식이 아닙니다.' });
      }
    }

    const messages = (body?.messages as ChatMessage[]) || [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return sendJson(400, { error: '대화 메시지(messages) 배열이 필요합니다.' });
    }

    // OpenAI 클라이언트 초기화 (서버 환경 변수에서만 API 키를 읽음)
    const openai = new OpenAI({
      apiKey: apiKey.trim(),
    });

    // OpenAI Responses API의 input 포맷에 맞게 메시지 매핑
    const formattedInput = messages.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    // OpenAI Responses API 스트리밍 호출 (gpt-6-luna, reasoning.effort: 'none', stream: true)
    const stream = await openai.responses.create({
      model: 'gpt-6-luna',
      reasoning: {
        effort: 'none',
      },
      instructions: SYSTEM_PROMPT,
      input: formattedInput,
      stream: true,
    });

    // 스트리밍 응답 헤더 설정
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    // flushHeaders 지원 시 버퍼 비우기
    if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === 'function') {
      (res as unknown as { flushHeaders: () => void }).flushHeaders();
    }

    // 스트리밍 청크 순차 전송
    for await (const event of stream) {
      if (event.type === 'response.output_text.delta' && event.delta) {
        res.write(event.delta);
      }
    }

    res.end();
  } catch (error: unknown) {
    console.error('Error in /api/chat handler:', error);
    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 서버 오류가 발생했습니다.';

    if (res.headersSent) {
      res.write(`\n\n[오류 발생: ${errorMessage}]`);
      res.end();
    } else {
      return sendJson(500, {
        error: `OpenAI API 호출 중 오류가 발생했습니다: ${errorMessage}`,
      });
    }
  }
}
