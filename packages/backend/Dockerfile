FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package.json files
COPY package.json pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm --filter @img-api/backend build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["pnpm", "--filter", "@img-api/backend", "start:dev"]
