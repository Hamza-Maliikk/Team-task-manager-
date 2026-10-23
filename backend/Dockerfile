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
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server ./server
COPY --from=client /client/dist ./client/dist
EXPOSE 8080
CMD ["node", "server/src/server.js"]
