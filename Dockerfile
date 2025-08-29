# Use official Node.js base image
FROM node:18

# Create and set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose port (Cloud Run expects 8080)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
