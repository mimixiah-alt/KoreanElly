import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type ChatMessage } from '../api/chat';
import './Chatbot.css';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    '안녕하세요! 🎓 영어 단어 퀴즈 챗봇입니다.\n\n원하시는 **주제**(예: 여행, 비즈니스, 일상 회화, 토익)나 **난이도**(초급, 중급, 고급)를 말씀해 주시면, 맞춤 영어 단어 3개와 짧은 복습 퀴즈를 준비해 드릴게요!\n\n어떤 주제나 난이도로 공부해 보시겠어요?',
};

const QUICK_TOPICS = [
  '✈️ 여행 회화 (초급)',
  '💼 비즈니스 미팅 (중급)',
  '📝 토익 빈출 어휘 (중고급)',
  '☕ 카페 & 식당 주문 (초급)',
  '🩺 병원 & 약국 필수 표현 (중급)',
];

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // 프런트엔드에서는 /api/chat을 호출하고 실제 OpenAI API는 서버에서 호출
      const reply = await sendChatMessage(updatedMessages);
      setMessages([...updatedMessages, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setInput('');
    setErrorMessage(null);
  };

  // 마크다운 형식의 볼드체(**텍스트**)를 간단히 파싱하여 렌더링
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="chatbot-container">
      <header className="chatbot-header">
        <div className="chatbot-header-info">
          <div className="chatbot-avatar">📖</div>
          <div>
            <h2 className="chatbot-title">영어 단어 퀴즈 챗봇</h2>
            <p className="chatbot-subtitle">주제와 난이도에 맞춘 맞춤 단어 학습 & 복습 퀴즈</p>
          </div>
        </div>
        <button
          type="button"
          className="chatbot-reset-btn"
          onClick={handleReset}
          title="대화 초기화"
        >
          새로 시작
        </button>
      </header>

      {/* 추천 주제 칩 */}
      <div className="chatbot-quick-chips">
        {QUICK_TOPICS.map((topic, idx) => (
          <button
            key={idx}
            type="button"
            className="quick-chip"
            onClick={() => handleSendMessage(topic)}
            disabled={isLoading}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* 메시지 목록 */}
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.role}`}>
            <div className="message-bubble">{renderFormattedText(msg.content)}</div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-bubble">
              <span className="loading-indicator">
                단어와 퀴즈를 준비하고 있습니다
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 에러 메시지 배너 */}
      {errorMessage && (
        <div className="error-banner">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 입력 폼 */}
      <form
        className="chatbot-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <textarea
          ref={textareaRef}
          className="chatbot-textarea"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="주제나 난이도, 또는 퀴즈 답을 입력하세요... (Enter로 전송)"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="chatbot-send-btn"
          disabled={isLoading || !input.trim()}
        >
          전송
        </button>
      </form>
    </div>
  );
};

export default Chatbot;

