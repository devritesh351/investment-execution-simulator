# AssetFlow - Asset Processing State Machine Visualization

> **Note**: The frontend works immediately without any backend! It uses localStorage as a fallback database. To use PostgreSQL, follow the backend setup below.

A fullstack web application demonstrating how different financial assets (Mutual Funds, Stocks, Crypto) are processed through their respective state machines. Built with React, Node.js/Express, and PostgreSQL.

## Features

### 🔐 Authentication
- Real-world login constraints with password strength validation
- Account lockout after 5 failed attempts (15 min cooldown)
- JWT-based session management with 24-hour expiry
- Role-based access (Investor / Registrar)

### 📊 State Machine Visualization
- **Mutual Funds**: 8-step process (T+1/T+2 settlement)
- **Stocks**: 8-step process (T+1 settlement)
- **Crypto**: 6-step process (near-instant)
- Click any completed step to view technical details (API calls, validations)

### 👤 User Dashboard
- Real-time transaction tracking
- Portfolio overview with returns
- Asset browser with quick buy
- Transaction detail modal with step-by-step breakdown

### 🏛️ Registrar Dashboard
- View all system transactions
- Manual state advancement
- Pipeline visualization
- User management and analytics

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT, bcrypt |
| Deployment | Railway, Docker |

## Project Structure

```
assetflow/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── context/            # React context (Auth)
│   ├── services/           # API client
│   └── utils/              # Helpers, validators
├── server/                 # Express backend
│   ├── src/
│   │   ├── db/             # Database connection, migrations
│   │   ├── middleware/     # Auth, validation, errors
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── package.json
├── docker-compose.yml      # Local development
└── railway.json            # Railway deployment
```

## Local Development

### 🚀 Quick Start (No Backend - Works Immediately!)

The frontend works out of the box using localStorage:

```bash
# Just run the frontend
npm install
npm run dev
```

Then open http://localhost:5173 - that's it!

**Demo Credentials:**
- User: `user@demo.com` / `Demo@123`  
- Registrar: `registrar@demo.com` / `Admin@123`

---

### 🐳 Full Stack with Docker (Recommended)

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Setup backend (new terminal)
cd server
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev

# 3. Start frontend (new terminal, from root)
npm run dev
```

---

### 🔧 Full Stack Manual Setup

**Prerequisites:**
- Node.js 18+
- PostgreSQL 15+

**Step 1: Start PostgreSQL**
```bash
# macOS (Homebrew)
brew services start postgresql

# Ubuntu
sudo service postgresql start

# Windows
# Start from Services or pgAdmin

# Create database
createdb assetflow
```

**Step 2: Setup Backend**
```bash
cd server
npm install
cp .env.example .env
# Edit .env if needed (defaults work for local postgres)
npm run db:migrate
npm run db:seed
npm run dev
```

**Step 3: Start Frontend**
```bash
# In project root (not server/)
npm install
npm run dev
```

**Step 4: Access**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health Check: http://localhost:3001/health

### Demo Credentials
- **User**: user@demo.com / Demo@123
- **Registrar**: registrar@demo.com / Admin@123

## Railway Deployment

### Backend Service

1. Create new project on [Railway](https://railway.app)
2. Add PostgreSQL service
3. Add new service from GitHub repo
4. Set root directory to `/server`
5. Add environment variables:
   ```
   JWT_SECRET=your-production-secret
   NODE_ENV=production
   CLIENT_URL=https://your-frontend-url.railway.app
   ```
6. Railway auto-injects `DATABASE_URL`

### Frontend Service

1. Add another service from same repo
2. Set root directory to `/` (root)
3. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| GET | /api/transactions/:id | Get transaction |
| POST | /api/transactions/:id/advance | Advance state (registrar) |
| POST | /api/transactions/:id/fail | Fail transaction |
| POST | /api/transactions/:id/cancel | Cancel (user) |

### Users (Registrar only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| GET | /api/users/stats | Get statistics |

## State Machines

### Mutual Fund Processing
```
Initiated → Payment Pending → Payment Confirmed → Order Queued 
    → Sent to AMC → NAV Applied → Units Allotted → Completed
```

### Stock Processing
```
Initiated → Margin Check → Sent to Exchange → Order Book 
    → Executed → Clearing → Settlement → Completed
```

### Crypto Processing
```
Initiated → Wallet Check → Order Matching 
    → Executed → Blockchain Confirm → Completed
```

## Offline Mode

The app includes localStorage fallback when the backend is unavailable. This allows the frontend to work independently for demos/testing.

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/assetflow
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## License

MIT
