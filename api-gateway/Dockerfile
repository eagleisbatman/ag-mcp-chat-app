FROM node:20-alpine

# Install OpenSSL and other dependencies required by Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copy package files and prisma schema first
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy remaining source files
COPY . .

EXPOSE 3000

# Start script will run prisma db push then node index.js
CMD ["npm", "start"]
