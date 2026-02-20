# AI Phone Assistant

[![Tests](https://github.com/aleixalonso/ai-phone-assistant/actions/workflows/test-code.yml/badge.svg?branch=main)](https://github.com/aleixalonso/ai-phone-assistant/actions/workflows/test-code.yml)

Voice-call assistant built with TypeScript + Express. It receives Twilio voice calls, streams caller audio over WebSockets, transcribes speech with Deepgram, generates responses with DeepSeek (OpenAI-compatible API), converts responses back to speech with Deepgram TTS, and streams audio back to the live call.

## Features

- Twilio webhook for incoming voice calls (`POST /twilio/incoming`)
- Real-time WebSocket audio handling for call media
- Speech-to-text with Deepgram live transcription
- Streaming LLM responses via DeepSeek chat completions
- Text-to-speech synthesis with Deepgram
- Health API route
- Jest + Supertest tests in CI (GitHub Actions)

## Tech Stack

- Node.js 24
- TypeScript
- Express
- WebSocket (`ws`)
- Twilio SDK
- Deepgram SDK + REST TTS
- OpenAI SDK (configured for DeepSeek base URL)
- Jest + Supertest

## Project Structure

```text
src/
  app.ts                    # Express + HTTP + WebSocket server bootstrap
  config/                   # Environment loading and validation
  controllers/              # HTTP handlers
  routes/                   # API route registration
  services/                 # Twilio, STT, LLM, TTS, streaming orchestration
  tests/                    # Integration tests (supertest)
```

## Request/Call Flow

1. Twilio hits `POST /twilio/incoming`.
2. Server returns TwiML instructing Twilio to stream media to `wss://<SERVER>/twilio/connection`.
3. WebSocket messages are processed by `TwilioService`.
4. Audio is sent to Deepgram live transcription.
5. Final transcription chunks are sent to DeepSeek (`deepseek-chat`) for streamed completion.
6. Partial responses are converted to audio via Deepgram TTS.
7. Audio is buffered and sent back to Twilio media stream in order.

## API Endpoints

- `GET /` -> hello JSON payload
- `GET /health` -> service health check
- `POST /twilio/incoming` -> TwiML response for Twilio voice calls

## Environment Variables

Copy `.env.example` to `.env` and set real values.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Environment (`development`, `test`, `production`) |
| `PORT` | No | HTTP server port (default `3000`) |
| `DATABASE_URL` | Yes | Database URL (validated at startup) |
| `JWT_SECRET` | Yes | JWT signing secret (validated at startup) |
| `JWT_EXPIRES_IN` | No | JWT expiration string |
| `CORS_ORIGIN` | No | Allowed CORS origin |
| `SERVER` | Yes | Public host used in Twilio stream URL |
| `TWILIO_API_KEY` | Yes | Twilio key (validated at startup) |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key (STT + TTS) |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key for chat completions |
| `VOICE_MODEL` | No | Deepgram TTS voice model (for example `aura-asteria-en`) |

## Local Development

```bash
git clone https://github.com/aleixalonso/ai-phone-assistant.git
cd ai-phone-assistant
npm ci
cp .env.example .env
```

Fill `.env` with your credentials, then run:

```bash
npm run dev
```

Server default URL: `http://localhost:3000`

## Twilio Setup

1. Expose your local server publicly (for example with ngrok).
2. Set `SERVER` in `.env` to that public host (without protocol).
3. In Twilio phone number Voice webhook, configure:
   `https://<SERVER>/twilio/incoming` (HTTP `POST`).
4. Place a call to your Twilio number.

## Scripts

- `npm run dev` - Start development server with `nodemon`
- `npm run build` - Compile TypeScript to `dist/`
- `npm run start` - Build then run compiled app
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## Testing

Current tests validate:

- root endpoint response (`GET /`)
- health endpoint response (`GET /health`)
- 404 behavior on unknown routes
