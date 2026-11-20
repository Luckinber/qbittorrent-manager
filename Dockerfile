FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY app.js .

# Run the application
ENTRYPOINT ["node", "app.js"]
