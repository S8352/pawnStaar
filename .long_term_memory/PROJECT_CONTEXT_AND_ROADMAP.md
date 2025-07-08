# Project Context and Roadmap

This document provides a high-level overview of the project, its architecture, and future roadmap.

## Table of Contents
- [Project Genesis and Purpose](#project-genesis-and-purpose)
- [Current Architecture and Key Modules](#current-architecture-and-key-modules)
- [Technology Stack](#technology-stack)
- [Future Feature Roadmap](#future-feature-roadmap)
- [Identified Gaps and Key Considerations](#identified-gaps-and-key-considerations)

---

## Project Genesis and Purpose
PawnStaar was created to provide chess players with a powerful, AI-driven platform for personalized game analysis and training. The primary goal is to help players identify their weaknesses, receive targeted feedback, and accelerate their improvement through customized lessons and workouts.

---

## Current Architecture and Key Modules
The application is a monorepo with a Next.js frontend and a Python (FastAPI) backend. Key modules include:
- **User Service:** Manages user data and authentication via Supabase.
- **Platform Integration Service:** A unified interface for interacting with Lichess and Chess.com APIs.
- **Game Import & Analysis Engine:** Uses Celery and Redis for asynchronous PGN processing with the Stockfish engine.
- **Coaching Service:** Generates personalized workouts and lesson recommendations.

---

## Technology Stack
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI
- **Database:** PostgreSQL
- **Deployment:** Docker, Kubernetes
- **CI/CD:** GitHub Actions

---

## Implementation Plan & Roadmap

### **Phase 1: Core Foundation & Backend Architecture (Weeks 1-3)**

This phase focuses on building the non-negotiable infrastructure that all other features will depend on.

**Epic 1: Project Scaffolding & Backend Setup**
*   **Objective:** Establish a robust, scalable monorepo and a fully containerized backend environment.
*   **Key Tasks:**
    1.  **Monorepo Initialization:** Use `pnpm` workspaces to manage the `apps/frontend` and `apps/backend` packages.
    2.  **Database Schema:**
        *   Define the initial PostgreSQL schema using SQLAlchemy models for `users`, `games`, `game_analysis`, `subscriptions`, and `lessons`.
        *   Set up Alembic for database migrations.
        *   Create a seed script to populate the DB with mock data for development.
    3.  **Backend API (FastAPI):**
        *   Structure the backend with a modular approach (e.g., routers for `auth`, `users`, `games`).
        *   Implement Pydantic models for API request/response validation.
        *   Set up dependency injection for database sessions and other services.
    4.  **Containerization:**
        *   Create a `docker-compose.yml` file to orchestrate the `backend`, `postgres`, and `redis` services for local development.
        *   Write a `Dockerfile` for the FastAPI backend.

**Epic 2: User Authentication & Profile Management**
*   **Objective:** Implement a secure and seamless user authentication system.
*   **Key Tasks:**
    1.  **Auth Service Integration:** Integrate a third-party service like **Firebase Auth** or **Auth0** to handle user registration, login (Email/Password, Google OAuth), and token management. This is more secure and faster than building from scratch.
    2.  **Backend Auth Logic:**
        *   Create API endpoints (`/auth/login`, `/auth/register`) that interface with the chosen auth service.
        *   Implement a middleware to protect authenticated routes by verifying JWTs.
    3.  **User Profile API:**
        *   Create `GET /api/users/me` to fetch the logged-in user's profile data (name, avatar, rating, subscription status).
        *   Create `PUT /api/users/me` to allow users to update their profile.
    4.  **Frontend Integration:** Connect the `AuthForm` and `SettingsForm` components to these new backend endpoints.

### **Phase 2: Core Feature Implementation (Weeks 4-8)**

This phase focuses on building the core value proposition of the platform: game analysis and personalized coaching.

**Epic 3: AI Game Analysis Engine**
*   **Objective:** Build the pipeline for importing and analyzing chess games.
*   **Key Tasks:**
    1.  **Stockfish Service:**
        *   Create a dedicated Python service (can be part of the main backend or a separate microservice) that wraps the Stockfish engine using the `python-chess` library.
        *   Create an internal API (`/analyze-pgn`) that accepts a PGN and returns a detailed analysis (blunders, inaccuracies, key moments).
    2.  **Game Import Pipeline:**
        *   Implement background jobs (using **Celery** with **Redis** as the broker) to handle game imports from Lichess and Chess.com APIs.
        *   Create API endpoints (`/api/import/lichess`, `/api/import/chesscom`) to trigger these background jobs.
        *   Implement a manual PGN upload endpoint (`/api/import/pgn`).
    3.  **Data Persistence:**
        *   Store the raw PGN and metadata in the `games` table.
        *   Upon successful analysis, store the results in the `game_analysis` table.
    4.  **Frontend Integration:** Connect the `GameImport` and `GameList` components to the new API endpoints.

**Epic 4: Personalized Coaching Dashboard**
*   **Objective:** Deliver the AI-driven personalized training experience.
*   **Key Tasks:**
    1.  **Workout Generation Logic:**
        *   Develop a service that analyzes a user's weaknesses from their `game_analysis` data.
        *   Create a daily scheduled task to generate a `DailyWorkout` plan (puzzles, opening drills) and store it.
    2.  **Progress Tracking Service:**
        *   Implement logic to calculate and update user metrics (`tactical_rating`, `blunder_rate`, etc.) after each game.
        *   Store historical data to power the `ProgressChart`.
    3.  **Lesson Recommendation Engine:**
        *   Develop a simple recommendation algorithm that matches user weaknesses to lessons in the `lessons` table.
    4.  **Dashboard API Endpoints:**
        *   `GET /api/dashboard/workout`: Fetches the daily workout.
        *   `GET /api/dashboard/progress`: Fetches progress metrics.
        *   `GET /api/dashboard/lessons`: Fetches recommended lessons.
    5.  **Frontend Integration:** Wire up the `DailyWorkout`, `ProgressChart`, and `LessonsList` components to these endpoints, removing the mock data.

### **Phase 3: Community, Monetization & Launch (Weeks 9-12)**

This phase focuses on adding community features, implementing payments, and preparing for deployment.

**Epic 5: Live Play & Community (MVP)**
*   **Objective:** Implement basic real-time chess and social features.
*   **Key Tasks:**
    1.  **WebSocket Server:** Use FastAPI's WebSocket support to manage live game connections.
    2.  **Matchmaking Logic:** Implement a simple ELO-based matchmaking queue using Redis.
    3.  **Game State Management:** Handle real-time move validation and game state updates.
    4.  **Frontend Integration:** Connect the `LivePlay` component to the WebSocket server.

**Epic 6: Subscription & Payments**
*   **Objective:** Integrate a payment gateway for the freemium model.
*   **Key Tasks:**
    1.  **Stripe Integration:** Set up Stripe and create product/pricing plans in the Stripe dashboard.
    2.  **Payment Flow:**
        *   Create an endpoint (`/api/subscriptions/create-checkout`) to initiate a Stripe Checkout session.
        *   Create a webhook endpoint (`/api/webhooks/stripe`) to listen for events (e.g., `checkout.session.completed`) and update the user's `subscription_status` in the database.
    3.  **Frontend Integration:** Connect the `SubscriptionCard` component to the checkout endpoint.

**Epic 7: Deployment & CI/CD**
*   **Objective:** Automate the testing and deployment pipeline.
*   **Key Tasks:**
    1.  **CI/CD Pipeline:** Create GitHub Actions workflows to:
        *   Run linters and tests on every push.
        *   Build and push the backend Docker image to a container registry (e.g., Docker Hub, GHCR).
        *   Deploy the frontend to **Vercel**.
        *   Deploy the backend to a cloud provider like **Railway** or **Fly.io**.
    2.  **Environment Configuration:** Set up environment variables and secrets for production (API keys, database URLs).

---

## Identified Gaps and Key Considerations
- **Scalability:** The current database schema may need optimization for large-scale data.
- **Security:** A comprehensive security audit is required before the production launch.
- **Monitoring:** Enhanced logging and monitoring solutions need to be implemented.
