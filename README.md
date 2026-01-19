# StudyFlow 📚✨

A beautiful, aesthetic SaaS study planner application built with Next.js 16, designed for students aged 16-30. Features a Notion-like UI with modern design patterns, dark/light mode, and smooth animations.

## 🚀 Features

### 📱 Landing Page
- **Stunning Hero Section** with animated gradients and floating elements
- **Features Showcase** with beautiful card animations
- **Pricing Section** with Free, Pro, and Team plans
- **Testimonials** from satisfied students
- **FAQ Section** with accordion component
- **CTA Section** for conversions

### 📊 Dashboard
- **Overview Dashboard** with stats, tasks, and progress tracking
- **Today's Tasks** with interactive checklist
- **Study Plans** with progress visualization
- **Focus Timer** (Pomodoro technique) with ambient sounds
- **Weekly Study Progress** with circular progress indicator
- **Upcoming Schedule** with mini calendar

### 🤖 AI Features
- **AI-Powered Schedule Generation** with Google Gemini
- **Smart Study Suggestions** based on your habits
- **Personalized Tips** to improve productivity

### 🎨 Design System
- **Beautiful purple gradient theme** that students love
- **Dark/Light mode** with smooth transitions
- **Glassmorphism effects** for modern aesthetic
- **Micro-interactions** with Framer Motion
- **Responsive design** for all devices
- **Custom scrollbar** styling

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB 7
- **Authentication**: JWT with jose library
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS 4.0
- **Components**: shadcn/ui
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theme**: next-themes
- **Typography**: Geist Font
- **Containerization**: Docker with microservices

## 🐳 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Google Gemini API key (for AI features)

### Run with Docker Compose

1. **Clone the repository and configure environment:**
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

2. **Start all services:**
```bash
docker-compose up -d
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Auth Service: http://localhost:3001
- Plans Service: http://localhost:3002
- Tasks Service: http://localhost:3003
- Timer Service: http://localhost:3004
- Analytics Service: http://localhost:3005
- AI Service: http://localhost:3006
- MongoDB: localhost:27017
- Redis: localhost:6379

4. **Stop all services:**
```bash
docker-compose down
```

## 💻 Local Development (Without Docker)

### Prerequisites
- Node.js 20+
- MongoDB (local or cloud like MongoDB Atlas)
- Google Gemini API key

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key
```

3. **Run development server:**
```bash
npm run dev
```

4. **Open** http://localhost:3000

## 📦 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout with theme provider
│   ├── globals.css           # Global styles & CSS variables
│   ├── login/                # Login page
│   ├── signup/               # Signup page
│   └── dashboard/
│       ├── layout.tsx        # Dashboard layout with sidebar
│       ├── page.tsx          # Dashboard overview
│       ├── tasks/            # Tasks management
│       ├── plans/            # Study plans
│       └── timer/            # Focus timer (Pomodoro)
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── providers/            # Theme provider
│   ├── landing/              # Landing page sections
│   └── dashboard/            # Dashboard components
├── lib/
│   ├── api.ts                # Frontend API client
│   ├── utils.ts              # Utility functions
│   └── db/
│       └── mongodb.ts        # MongoDB connection
└── app/api/                  # API routes (microservices)
    ├── auth/                 # Auth endpoints
    ├── plans/                # Plans CRUD
    ├── tasks/                # Tasks CRUD
    ├── timer/                # Timer sessions/settings
    ├── analytics/            # Reports & stats
    └── ai/                   # Gemini AI endpoints
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📱 Pages Overview

| Route | Description |
|-------|-------------|
| `/` | Landing page with all marketing sections |
| `/login` | User authentication |
| `/signup` | New user registration |
| `/dashboard` | Main dashboard overview |
| `/dashboard/tasks` | Task management |
| `/dashboard/plans` | Study plans |
| `/dashboard/timer` | Pomodoro focus timer |

## 🏗️ Microservices Architecture

The application uses a microservices architecture with Docker:

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| Auth | 3001 | Authentication & user management |
| Plans | 3002 | Study plan CRUD operations |
| Tasks | 3003 | Task management API |
| Timer | 3004 | Pomodoro sessions & settings |
| Analytics | 3005 | Weekly reports & statistics |
| AI | 3006 | Gemini-powered suggestions |
| MongoDB | 27017 | Primary database |
| Redis | 6379 | Session cache |

## 🔐 Environment Variables

Create a `.env` file with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/studyflow

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🎯 Completed Features

- [x] Backend with MongoDB integration
- [x] User authentication with JWT
- [x] AI study recommendations with Google Gemini
- [x] Pomodoro timer with session tracking
- [x] Task management with CRUD operations
- [x] Study plans with progress tracking
- [x] Analytics and weekly reports
- [x] Docker containerization

## 🚀 Future Enhancements

- [ ] Calendar integration (Google Calendar API)
- [ ] Flashcard system with spaced repetition
- [ ] Real-time collaboration
- [ ] Mobile app (React Native)
- [ ] Team workspaces
- [ ] Export/Import functionality
Built with 💜 for students everywhere
