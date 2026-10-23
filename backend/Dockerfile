# Stage 1: build the React client
FROM node:20-slim AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# Stage 2: Express server + built client
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY backend/server/package*.json ./backend/server/
RUN cd backend/server && npm install --omit=dev
COPY backend/server ./backend/server
COPY --from=client /client/dist ./client/dist
EXPOSE 8080
CMD ["node", "backend/server/src/server.js"]
