import Chatbot from './components/Chatbot';
import './App.css';

function App() {
  return (
      <main style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <header style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 8px', fontWeight: 700 }}>
            English Word Quiz Bot
          </h1>
          <p style={{ color: 'var(--text)', fontSize: '1rem', margin: 0 }}>
            원하는 주제나 난이도를 입력하고 맞춤 영어 단어와 복습 퀴즈를 풀어보세요!
          </p>
        </header>

      <Chatbot />
    </main >
  );
}

export default App;
