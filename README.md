# Image API Monorepo

A monorepo for the Image API project with TypeScript, NestJS, and GraphQL.

## Project Structure

This project is organized as a monorepo with the following packages:

- `packages/backend`: NestJS backend with GraphQL API
- `packages/shared`: Shared types and utilities
- `packages/sam-api`: AWS SAM API (for serverless deployments)

## Getting Started

### Prerequisites

- Node.js (v16+)
- pnpm
- Docker and Docker Compose

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development

To start the development environment:

```bash
# Start all services with Docker Compose
docker-compose up

# Or start just the backend in development mode
pnpm dev
```

The GraphQL playground will be available at http://localhost:3000/graphql

## Backend (NestJS + GraphQL)

The backend is built with:

- NestJS: A progressive Node.js framework
- GraphQL (Apollo): API query language
- TypeScript: For type safety

## Features

- GraphQL API with Apollo Server
- User management with CRUD operations
- Shared types across packages
- Docker containerization
- pnpm workspaces for efficient package management

## License

MIT
