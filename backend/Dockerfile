FROM node:20-alpine

WORKDIR /app

# Copy package manifest and install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy application source
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/server.js"]
