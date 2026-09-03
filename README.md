# UPSC & MPSC QuestArena

QuestArena is a daily mastery and competitive preparation platform for UPSC CSE Prelims (GS-1 and CSAT) and MPSC State Services. It combines fresh question practice, progress analytics, private real-time 1v1 challenges, gamification, and an emotionally reactive anime companion.

## Architecture

*   **Frontend**: Flutter Android App + Web PWA (Planned)
*   **Backend**: Node.js + Fastify (REST API & WebSockets)
*   **Database**: Supabase (PostgreSQL)
*   **Cache/Real-time state**: Redis
*   **AI**: Gemini API (for question generation & validation)

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   Docker & Docker Compose (for local Redis)
*   Supabase CLI (for local database development)

### Local Development Setup

1.  **Start Redis:**
    ```bash
    docker-compose up -d
    ```

2.  **Start Supabase Locally:**
    ```bash
    supabase start
    ```

3.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    cp .env.example .env # Fill in credentials from Supabase local status
    npm run dev
    ```
