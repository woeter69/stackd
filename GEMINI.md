# Stackd

Stackd is a full-stack virtual bankroll and chip manager application designed for live games like Poker and Blackjack. It allows a "banker" to create a room, mint virtual chips, and enables players to join and transfer chips to each other or to a central "POT" in real time. 

## Project Architecture

This project is a monorepo containing a separate backend and frontend application.

*   **Backend (`/backend`)**: A Node.js and Express server that provides REST API endpoints for authentication and room management. Real-time chip transfers and game state synchronization are handled via WebSockets using Socket.IO.
*   **Frontend (`/frontend`)**: A React Single Page Application (SPA) built with Vite. It handles user authentication, room joining, and the interactive display of the game table and players' chip balances.
*   **Database**: PostgreSQL (specifically configured for Neon serverless) managed via Drizzle ORM.

### Key Technologies

**Backend:**
*   **Language:** TypeScript
*   **Framework:** Express.js
*   **WebSockets:** Socket.IO
*   **ORM:** Drizzle ORM
*   **Database:** PostgreSQL (pg, @neondatabase/serverless)
*   **Authentication:** JWT, bcryptjs

**Frontend:**
*   **Language:** TypeScript
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Routing:** React Router DOM
*   **Styling:** TailwindCSS v4
*   **Icons:** Lucide React
*   **WebSockets:** Socket.IO Client

## Building and Running

The project utilizes `npm` workspaces (or concurrently scripts at the root level) to manage both environments simultaneously.

### Prerequisites
*   Node.js (v22+ recommended)
*   A PostgreSQL database connection string (configured via `.env` files).

### Setup and Execution
1.  **Install Dependencies:** Run this command from the root directory to install packages for both the backend and frontend.
    ```bash
    npm run install:all
    ```
2.  **Database Migrations:** Push the Drizzle schema to your PostgreSQL database.
    ```bash
    npm run db:push
    ```
    *(Note: Use `npm run db:generate` to generate migration files if you make schema changes).*
3.  **Start Development Servers:** This will run both the Vite frontend dev server and the backend server (using `tsx watch`) concurrently.
    ```bash
    npm run dev
    ```

## Development Conventions

*   **Real-time State:** The core application loop relies on WebSockets. Clients emit actions like `TRANSFER` or `MINT` to the backend, which processes the transaction in the database and then emits a `STATE_UPDATE` event back to the entire room to keep all clients in sync.
*   **Database Schema:** The primary database definitions are located in `backend/src/db/schema.ts`, including `users`, `rooms`, `players`, and `transactions`.
*   **Styling:** The frontend heavily utilizes TailwindCSS utility classes. When modifying UI components, adhere to the existing Tailwind paradigms.
*   **Typing:** The project enforces strict TypeScript typing across both the backend and frontend. Leverage Drizzle's `$inferSelect` for database model types.
