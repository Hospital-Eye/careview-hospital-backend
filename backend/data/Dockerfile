# Use official Node.js base image
FROM node:18

# Create and set working directory
WORKDIR /app

#env variables
ENV MONGODB_URI mongodb+srv://backendService:sigmahealth25@cluster0.zwoygaq.mongodb.net/Hospital_Eye
ENV GOOGLE_REDIRECT_URI https://hospital-eye-backend-service-1078754960579.us-central1.run.app/api/authRoutes/auth/google/callback
ENV GOOGLE_CLIENT_ID 1078754960579-mpb1hh1ou9jjph466cv539jed0a9087k.apps.googleusercontent.com
ENV GOOGLE_CLIENT_SECRET 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
ENV PORT 8080
ENV JWT_SECRET 68394446d1d7eef08057490a0f2ae8eac91502c63524111e3826877decc2736b
ENV FROTNEND_BASE_URL https://hospital-eye-frontend-1078754960579.us-central1.run.app
ENV NODE_ENV development


# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
