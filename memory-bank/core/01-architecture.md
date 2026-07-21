# PawnStaar Architecture Overview

## System Architecture

PawnStaar follows a modern microservices-inspired architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │   Railway       │    │   External      │
│   (Static)      │    │   (API Host)    │    │   APIs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Backend Architecture (FastAPI)

### Core Structure

```
apps/backend/
├── main.py                 # FastAPI application entry point
├── core/                   # Core business logic
│   ├── config.py          # Configuration management
│   ├── analysis.py        # Chess game analysis engine
│   ├── chess_com.py       # Chess.com API integration
│   ├── lichess.py         # Lichess API integration
│   ├── supabase.py        # Database operations
│   └── platform_service.py # Platform-specific logic
├── routers/               # API route handlers
│   ├── auth.py           # Authentication endpoints
│   ├── users.py          # User management
│   ├── analysis.py       # Game analysis endpoints
│   ├── import_router.py  # Game import functionality
│   └── dashboard.py      # Dashboard data
├── models.py             # Database models
├── schemas.py            # Pydantic schemas
└── dependencies.py       # Dependency injection
```

### Key Design Patterns

- **Repository Pattern**: Database operations abstracted through service layers
- **Dependency Injection**: FastAPI's built-in DI for clean testing and modularity
- **API Versioning**: Structured for future API evolution
- **Error Handling**: Centralized exception handling with proper HTTP status codes

## Frontend Architecture (Next.js)

### Core Structure

```
apps/frontend/
├── app/                   # Next.js 13+ App Router
│   ├── layout.tsx        # Root layout component
│   ├── page.tsx          # Home page
│   ├── dashboard/        # Dashboard pages
│   ├── analysis/         # Game analysis pages
│   ├── live/            # Live play pages
│   └── settings/        # User settings
├── components/           # Reusable UI components
│   ├── features/        # Feature-specific components
│   └── ui/              # Base UI components (Radix UI)
├── lib/                 # Utility functions and configurations
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions
```

### Key Design Patterns

- **Component Composition**: Modular, reusable components
- **Custom Hooks**: Business logic separation from UI
- **Type Safety**: Comprehensive TypeScript coverage
- **State Management**: React Context + useState/useReducer
- **Form Handling**: React Hook Form with Zod validation

## Database Schema (Supabase/PostgreSQL)

### Core Tables

```sql
-- Users and Authentication
users (id, email, username, created_at, updated_at)
user_profiles (user_id, chess_com_username, lichess_username, rating, preferences)

-- Game Data
games (id, user_id, pgn, result, time_control, platform, created_at)
game_analysis (game_id, blunders, mistakes, inaccuracies, analysis_data)

-- Training and Progress
workouts (id, user_id, type, exercises, completed_at)
progress_tracking (user_id, metric, value, recorded_at)

-- Community Features
friendships (user_id, friend_id, status, created_at)
messages (id, sender_id, recipient_id, content, sent_at)
```

### Key Design Principles

- **Normalized Structure**: Efficient data storage with minimal redundancy
- **Audit Trails**: Created/updated timestamps on all entities
- **Soft Deletes**: Preserve data integrity with logical deletion
- **Indexing Strategy**: Optimized for common query patterns

## External Integrations

### Chess Platforms

- **Chess.com API**: Game import, user data, rating information
- **Lichess API**: Game import, user data, rating information
- **Stockfish Engine**: Game analysis and position evaluation

### Authentication & Payments

- **Supabase Auth**: User authentication with OAuth support
- **Stripe**: Payment processing for premium subscriptions
- **Sentry**: Error tracking and performance monitoring

## Security Architecture

### Authentication Flow

1. User signs up/in via Supabase Auth
2. JWT tokens managed by Supabase
3. API routes protected with authentication middleware
4. Row-level security (RLS) policies in Supabase

### Data Protection

- **Encryption**: All sensitive data encrypted in transit and at rest
- **Input Validation**: Comprehensive validation on all API endpoints
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Properly configured cross-origin resource sharing

## Performance Considerations

### Backend Optimization

- **Database Indexing**: Optimized queries with proper indexes
- **Caching Strategy**: Redis for frequently accessed data
- **Async Operations**: Celery for background tasks
- **Connection Pooling**: Efficient database connection management

### Frontend Optimization

- **Code Splitting**: Dynamic imports for route-based splitting
- **Image Optimization**: Next.js Image component with WebP support
- **Bundle Analysis**: Regular bundle size monitoring
- **CDN**: Vercel's global CDN for static assets

## Deployment Architecture

### Backend (Railway)

- **Containerization**: Docker containers for consistent deployment
- **Environment Management**: Separate staging and production environments
- **Database Migrations**: Alembic for schema versioning
- **Health Checks**: Automated health monitoring

### Frontend (Vercel)

- **Static Generation**: Pre-rendered pages for optimal performance
- **Edge Functions**: Serverless functions for API routes
- **Preview Deployments**: Automatic previews for pull requests
- **Analytics**: Built-in performance and usage analytics

## Monitoring and Observability

### Application Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Logging**: Structured logging with appropriate log levels
- **Metrics**: Custom metrics for business logic monitoring
- **Health Checks**: Automated system healtabase Monitoring

- **Query Performance**: Slow query identification and optimization
- **Connection Monitoring**: Database connection pool health
- **Backup Verification**: Regular backup integrity checks
- **Storage Monitoring**: Database size and growth tracking

## Scalability Considerations

### Horizontal Scaling

- **Stateless Design**: Backend services designed for horizontal scaling
- **Database Sharding**: Future consideration for user-based sharding
- **CDN Distribution**: Global content delivery for reduced latency
- **Load Balancing**: Multiple backend instances with load distribution

### Vertical Scaling

- **Resource Optimization**: Efficient memory and CPU usage
- **Database Optimization**: Query optimization and indexing strategies
- **Caching Layers**: Multiple caching levels for performance
- **Background Processing**: Async task processing for heavy operations

---
*Last Updated: 2025-01-25*
*Relevance Score: 1.0*
*Category: architecture*
*Tags: [architecture, backend, frontend, database, deployment, security]*

