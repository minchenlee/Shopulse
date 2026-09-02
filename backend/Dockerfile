# Stage 1: Build
# Use a specific version of the Node.js Alpine image for a smaller final image
FROM node:18-alpine as builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
# Adding 'npm cache clean' to reduce image size
RUN npm install && npm cache clean --force

# Copy the rest of the application's code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
