# Use a Node.js base image. Using a specific version (20) and a smaller variant (alpine) is good practice.
FROM node:20-alpine

# Set the working directory inside the container. All subsequent commands will run from here.
WORKDIR /app

# Copy package.json and package-lock.json first. This allows Docker to cache the npm install step.
# If only your source code changes, this layer won't need to be rebuilt.
COPY package*.json ./

# Install application dependencies
RUN npm install --production # --production flag installs only production dependencies

# Copy the rest of your application code into the container
COPY . .

# Expose the port your Express app listens on.
# Cloud Run (and many other platforms) expects applications to listen on port 8080 by default.
# Ensure your Node.js app is configured to listen on process.env.PORT or 8080.
EXPOSE 8080

# Define the command to run your application when the container starts.
# Ensure you have a "start" script in your package.json (e.g., "start": "node server.js").
CMD ["npm", "start"]