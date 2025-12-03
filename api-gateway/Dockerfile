FROM node:20-alpine

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
