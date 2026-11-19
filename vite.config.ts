import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          // .env.local 및 환경 변수를 읽어 process.env에 설정
          const env = loadEnv(server.config.mode || 'development', process.cwd(), '')
          if (env.OPENAI_API_KEY) {
            process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
          }

          // 요청 본문(body) 수집
          const chunks: Uint8Array[] = []
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
          }
          const rawBody = Buffer.concat(chunks).toString('utf-8')
          let parsedBody: unknown = rawBody
          try {
            parsedBody = JSON.parse(rawBody)
          } catch {
            // 원본 본문 유지
          }

          // Vite SSR 환경을 통해 api/chat.ts 모듈을 동적으로 로드 및 실행
          const chatModule = await server.ssrLoadModule('/api/chat.ts')
          const handler = chatModule.default

          // VercelRequest, VercelResponse 규격 지원 래퍼
          const vercelReq = Object.assign(req, {
            body: parsedBody,
            query: {},
            cookies: {},
          })

          const vercelRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code
              return vercelRes
            },
            json(data: unknown) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(data))
              return vercelRes
            },
            send(data: unknown) {
              if (typeof data === 'object') {
                return vercelRes.json(data)
              }
              res.end(String(data))
              return vercelRes
            },
          })

          await handler(vercelReq, vercelRes)
        } catch (error: unknown) {
          console.error('[API Dev Server Error]:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Internal Server Error',
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
})
