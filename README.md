# AssetFlow - Asset Processing State Machine Visualization

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Netlify](https://img.shields.io/badge/netlify-%23000000.svg?style=for-the-badge&logo=netlify&logoColor=#00C7B7)
![Railway](https://img.shields.io/badge/railway-%230B0D0E.svg?style=for-the-badge&logo=railway&logoColor=white)

**🔴 Live Demo:** [https://investment-execution-simulator.netlify.app](https://investment-execution-simulator.netlify.app)

> **Note**: The live demo connects to a real PostgreSQL database on Railway. If the backend sleeps, it automatically falls back to localStorage so you can still test the UI.

A fullstack web application demonstrating how different financial assets (Mutual Funds, Stocks, Crypto) are processed through their respective state machines. Built with React, Node.js/Express, and PostgreSQL.
##Screenshots
<img width="1912" height="869" alt="Image" src="https://github.com/user-attachments/assets/be1767f2-2f09-4c77-9423-9fb6c1cede1b" />
<img width="1919" height="836" alt="Image" src="https://github.com/user-attachments/assets/82913a53-7371-4b1f-94d4-bb4600cb3ac6" />
<img width="1919" height="859" alt="Image" src="https://github.com/user-attachments/assets/e68f94d3-43d6-40e9-a3dd-dc65b6ce9321" />
<img width="1917" height="831" alt="Image" src="https://github.com/user-attachments/assets/61a6d4be-645d-4fe4-b454-9701ac67db4c" />
<img width="1919" height="811" alt="Image" src="https://github.com/user-attachments/assets/fee4818e-b1e8-4444-9b8c-461e7448a49c" />
<img width="1918" height="864" alt="Image" src="https://github.com/user-attachments/assets/9dff2be2-f4e7-4941-98f4-d060bcacf38f" />

## Features

### 🔐 Authentication
- Real-world login constraints with password strength validation
- Account lockout after 5 failed attempts (15 min cooldown)
- Role-based access (Investor / Registrar)

### 📊 State Machine Visualization
- **Mutual Funds**: 8-step process (T+1/T+2 settlement)
- **Stocks**: 8-step process (T+1 settlement)
- **Crypto**: 6-step process (near-instant)

### 👤 User & Registrar Dashboards
- Real-time transaction tracking
- Portfolio overview with returns
- Manual state advancement (Registrar view)
- Pipeline visualization

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS (Deployed on Netlify)
- **Backend:** Node.js, Express (Deployed on Railway)
- **Database:** PostgreSQL (Hosted on Railway)
- **Auth:** JWT, bcrypt
- **DevOps:** Docker

## Project Structure
assetflow/
├── src/ # React frontend
├── server/ # Express backend
├── public/ # Static assets
└── docker-compose.yml # Local development

text


## Local Development

You can run the project locally using Docker (recommended) or npm.

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Docker)

### Quick Start (Frontend Only)
The frontend works immediately using localStorage fallback:

```bash
npm install
npm run dev
Full Stack Setup (Docker)
Bash

# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Setup backend
cd server
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev

# 3. Start frontend (root folder)
npm run dev
Demo Credentials:

User: user@demo.com / Demo@123
Registrar: registrar@demo.com / Admin@123
Environment Variables
To run the backend locally, create a .env file in server/:

env

DATABASE_URL=postgresql://user:pass@host:5432/assetflow
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5173
License
MIT
