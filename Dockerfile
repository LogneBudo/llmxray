# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/bin ./bin
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
RUN npm ci --omit=dev

EXPOSE 5174 11435
ENV OLLAMA_URL=http://host.docker.internal:11434
ENV PORT=5174
ENV OBSERVE_PORT=11435
# Inside a container the ports must bind every interface to be published at all.
ENV HOST=0.0.0.0

CMD ["node", "server/index.mjs"]
