# Install dependencies
FROM node:lts-alpine AS install

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Build the application
FROM node:lts-alpine AS build

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /usr/src/app
COPY --from=install /usr/src/app/node_modules ./node_modules

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN npm run build

# Prepare the production image
FROM node:lts-alpine AS production
WORKDIR /usr/src/app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy the built application
COPY --from=build /usr/src/app/dist ./dist

# App listens on PORT from environment variable (controlled by Doppler)
# No EXPOSE directive as port is dynamic (8080 in production)
CMD ["node", "dist/main"]