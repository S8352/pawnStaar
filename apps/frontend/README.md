# PawnStaar - AI Chess Coach & Community Platform

PawnStaar is a revolutionary chess platform that combines AI-powered coaching with an engaging community experience. Built with Next.js 15, TypeScript, and modern web technologies.

## 🚀 Features

- **AI-Powered Game Analysis**: Deep analysis of your chess games with actionable insights
- **Personalized Training**: Daily workouts tailored to your specific weaknesses
- **Live Chess Play**: Play against opponents in Bullet, Blitz, and Rapid time controls
- **Progress Tracking**: Visual reports showing improvement across different skill areas
- **Community Features**: Connect with friends and share your chess journey
- **Coach Integration**: Share progress with your chess coach for better lessons

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Deployment**: Vercel

## 🎨 Design System

### Color Palette
- **Primary**: #1E1E2F (Dark Slate)
- **Accent**: #FFD700 (Gold)
- **Background**: #F8F9FA (Light Gray)
- **Text**: #1A1A1A

### Logo
The PawnStaar logo features:
- A stylized chess pawn (black) on the left
- A vertically split half star (gold) on the right
- Minimal, flat design suitable for all contexts

## 📁 Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # User dashboard
│   ├── analysis/          # Game analysis
│   ├── live/             # Live chess play
│   ├── login/            # Authentication
│   ├── settings/         # User settings
│   └── layout.tsx        # Root layout
├── components/
│   ├── features/         # Feature-specific components
│   │   ├── navbar.tsx
│   │   ├── hero.tsx
│   │   ├── dashboard-tabs.tsx
│   │   └── ...
│   └── ui/              # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── chessboard.tsx
│       └── ...
├── lib/                 # Utilities and helpers
│   └── mock-data.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── public/
    └── logo.svg        # PawnStaar logo
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd pawnstaar-frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Add your environment variables:
\`\`\`env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Tailwind CSS
The project uses a custom Tailwind configuration with PawnStaar brand colors. See `tailwind.config.js` for the complete setup.

### API Integration
The frontend is designed to work with a backend API. Set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend service.

## 📱 Pages Overview

### Landing Page (`/`)
- Hero section with value proposition
- Feature highlights
- Call-to-action for user registration

### Dashboard (`/dashboard`)
- User profile header with stats
- Tabbed interface: Daily Workout, Progress, Lessons
- Personalized training recommendations

### Game Analysis (`/analysis`)
- Game import from Chess.com/Lichess
- PGN upload functionality
- List of analyzed games with insights

### Live Play (`/live`)
- Time control selection (Bullet, Blitz, Rapid)
- Opponent matching
- Live game interface with chessboard

### Authentication (`/login`)
- Email/password and Google OAuth
- Sign up and sign in forms
- Responsive design

### Settings (`/settings`)
- Profile management
- Connected accounts
- Subscription management

## 🎯 Key Components

### Chessboard
A responsive 8x8 grid component that displays chess positions. Currently shows the initial chess position as a placeholder.

### Navbar
Responsive navigation with logo, menu items, and user dropdown. Adapts to authentication state.

### Dashboard Tabs
Tabbed interface for organizing dashboard content:
- Daily Workout: Personalized training exercises
- Progress: Visual charts and metrics
- Lessons: Curated chess lessons

## 🔐 Authentication

The app includes mock authentication logic. In production, integrate with:
- NextAuth.js for OAuth providers
- Your backend authentication service
- JWT token management

## 📊 Mock Data

The application includes comprehensive mock data for development:
- User profiles with ratings and stats
- Game history with analysis results
- Training exercises and lessons
- Progress tracking data

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
\`\`\`bash
npm run build
npm start
\`\`\`

## 🔮 Future Enhancements

- Real-time multiplayer chess games
- Advanced AI coaching features
- Mobile app development
- Tournament system
- Video lessons integration
- Coach marketplace

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

Built with ❤️ by the PawnStaar team.