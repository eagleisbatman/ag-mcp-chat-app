FROM node:20-alpine

# Install OpenSSL and other dependencies required by Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copy package files and prisma schema first
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for prisma generate)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy remaining source files
COPY . .

# Remove dev dependencies for smaller image
RUN npm prune --production

EXPOSE 3000
CMD ["node", "index.js"]
