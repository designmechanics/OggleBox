FROM node:20-slim

# Install system dependencies including ffmpeg for thumbnail generation
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build the application (Vite + Express bundle)
RUN npm run build

# Ensure public media directory exists
RUN mkdir -p public

EXPOSE 3000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
