# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=23.10.0

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

# Run the application as a non-root user.
USER node

# Copy the rest of the source files into the image.

COPY package.json package-lock.json /usr/src/app/

COPY server.js .

COPY src/ .

COPY public/ .

# Expose the port that the application listens on.
EXPOSE 3000

# To access server.js
EXPOSE 5001

# Expose dev port
EXPOSE 5002

# Run the application.
CMD npm run start:prod
