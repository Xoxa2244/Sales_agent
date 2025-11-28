# Sales Agent - Voice Assistant Demo

A minimal demo project for a voice sales agent using OpenAI Realtime API, built with Next.js and deployed on Vercel.

## Features

- **Voice Interaction**: Real-time voice conversation with OpenAI Realtime API using WebRTC
- **Two Modes**:
  - **Training Mode**: Teach the agent rules and guidelines
  - **Call Simulation Mode**: Practice sales calls as a client
- **Admin Panel**: Configure agent settings (goal, allowed/forbidden topics, system prompt)
- **Local Configuration**: Settings stored in browser localStorage

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- React
- OpenAI Realtime API (`@openai/agents/realtime`)
- WebRTC for real-time audio
- Supabase (для хранения конфигурации агентов)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   **Supabase Setup** (для хранения конфигурации агентов):
   - См. инструкцию в `SUPABASE_SETUP.md`
   - Если Supabase не настроен, система использует localStorage как fallback

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
├── app/
│   ├── api/
│   │   └── realtime-session/
│   │       └── route.ts          # API route for ephemeral tokens
│   ├── admin/
│   │   └── page.tsx              # Admin configuration page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main demo page
│   └── globals.css               # Global styles
├── lib/
│   └── realtimeClient.ts         # Realtime API client wrapper
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## Usage

1. **Configure Agent** (optional):
   - Navigate to `/admin`
   - Set up goal, allowed/forbidden topics, and base system prompt
   - Click "Save" to store in localStorage

2. **Start Demo**:
   - Go to `/`
   - Select mode (Training or Call simulation)
   - Review/edit system prompt
   - Click "Start session"
   - Allow microphone access when prompted
   - Speak with the agent
   - Click "Stop session" when done

## Deployment on Vercel

1. Push code to GitHub repository
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY` - ваш OpenAI API ключ
   - `NEXT_PUBLIC_SUPABASE_URL` - URL вашего Supabase проекта
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon Key из Supabase
4. Deploy

## Notes

- This is a minimal MVP demo
- Configuration is stored in Supabase (persisted across devices and deployments)
- Falls back to localStorage if Supabase is not configured
- WebRTC requires HTTPS in production (Vercel provides this automatically)

