# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shopulse is a research-driven e-commerce prototype that explores user interactions with different UI paradigms:
- **CUI (Conversational UI)**: AI chatbot-powered product discovery using OpenAI Assistant API
- **GUI (Graphical UI)**: Traditional e-commerce interface with search and filters
- **Hybrid UI**: Dual-pane layout combining AI chat with product browsing

The system integrates MongoDB for data storage, real-time communication via Server-Sent Events (SSE), and web scraping capabilities for product data collection.

## Architecture

### Backend (`/backend`)
- **Framework**: Express.js with Node.js
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: OpenAI Assistant API and Google Dialogflow for intent detection
- **Real-time Communication**: Server-Sent Events for chat functionality
- **Key Components**:
  - Routes: `/chat`, `/products`, `/user`
  - Models: User, Thread, Product (in `db/model/`)
  - Middleware: User validation, search parameter validation, logging
  - WebSocket/SSE connections for live chat

### Frontend (`/frontend`)
- **Framework**: React 18 with Vite build system
- **Styling**: Tailwind CSS
- **State Management**: React Context (UserSessionContext)
- **Routing**: React Router with three main routes:
  - `/chat` - Conversational UI
  - `/gui` - Traditional GUI with nested product details
  - `/hybrid` - Dual-pane interface
- **Key Features**: Real-time chat, product search/filtering, image zoom, toast notifications

### Infrastructure
- **Containerization**: Docker with docker-compose
- **Cloud Deployment**: AWS (EC2, CloudFront, S3, ELB)
- **Infrastructure as Code**: Terraform configurations in `/terraform`
- **Web Scraping**: Puppeteer-based crawler for Amazon/Walmart product data

## Common Development Commands

### Backend
```bash
cd backend
npm install
npm start  # Starts server on port 3000
```

### Frontend
```bash
cd frontend
yarn install
yarn run dev    # Development server
yarn run build  # Production build
yarn run lint   # ESLint checking
yarn run preview # Preview production build
```

### Docker Development
```bash
# Full stack with docker-compose
docker-compose up

# Individual services
docker build -t shopulse-backend ./backend
```

### Testing
The project has test files in `backend/test/` for:
- OpenAI integration (`openAi.js`)
- Dialogflow intent detection (`dialogflow.js`) 
- Chat functionality (`chat.js`)

No automated test runner is configured - tests appear to be manual/exploratory.

## Environment Configuration

### Backend (`.env`)
- `MONGODB_URL` - MongoDB connection string (Atlas recommended for text search)
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_ASSISTANT_ID` - Pre-configured OpenAI assistant
- `PORT` - Server port (default: 3000)

### Frontend (`.env`)
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:3000)

## Database Architecture

Uses MongoDB with specific requirements:
- **Atlas Text Search**: Requires search index configuration for product search functionality
- **Collections**: Users, Threads (chat history), Products
- **Search**: Full-text search across product names and specifications with fuzzy matching
- **Sample Data**: Available in `backend/sample.json`

## Key Integration Points

### OpenAI Assistant API
- Configured assistant handles product recommendations and conversations
- Thread-based conversation management
- Streaming responses via SSE

### Real-time Communication
- Server-Sent Events for chat updates
- Connection management per thread ID
- Keep-alive mechanisms for long-lived connections

### Product Search System
- MongoDB Atlas text search with fuzzy matching
- Multi-parameter filtering (price, brand, screen type, etc.)
- Aggregation pipelines for complex queries

## Development Notes

- Frontend uses ES modules (`"type": "module"` in package.json)
- Backend uses CommonJS require syntax
- CORS configured for multiple domains including localhost and production
- Logging implemented with rotating file streams
- No TypeScript - pure JavaScript codebase
- Image optimization and zoom functionality integrated
- Responsive design with Tailwind CSS utilities

## Deployment Options

### Original Architecture (EC2-based)
- Production builds separate frontend static files
- Nginx reverse proxy configuration included
- Docker images published to Docker Hub (`leeminchen/shopulse-backend`)

### Serverless Architecture (Recommended)
- **Frontend**: S3 + CloudFront static hosting
- **Backend**: Individual Lambda functions with Response Streaming for SSE
- **Infrastructure**: Fully defined in Terraform
- **Migration Guide**: See `SERVERLESS_MIGRATION.md` for complete migration instructions

## Serverless Components

### Lambda Functions (`/lambda-functions`)
- **chat-function**: SSE streaming using Lambda Response Streaming
- **products-function**: Product search and filtering API
- **user-function**: User management API

### Deployment Commands (Serverless)
```bash
# Package and deploy Lambda functions
./deploy-lambda.sh

# Deploy infrastructure
cd terraform && terraform apply

# Build and deploy frontend
cd frontend && npm run build:production
aws s3 sync dist/ s3://your-bucket-name --delete
```

### Environment Configuration (Serverless)
- `terraform/terraform.tfvars`: Lambda environment variables
- `frontend/.env.production`: Lambda Function URLs
- DynamoDB tables for SSE connection management