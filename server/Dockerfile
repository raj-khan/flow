# Built from the repository root, since the server reads the app's own domain
# code in src/domain: docker build -f server/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci
COPY src/domain src/domain
COPY src/mcp/protocol.js src/mcp/protocol.js
COPY server server
RUN cd server && npm run build && npm prune --omit=dev

FROM node:22-alpine
# DejaVu Sans is the font the link-preview PNGs draw text with.
RUN apk add --no-cache font-dejavu
WORKDIR /repo
ENV NODE_ENV=production PORT=3000
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/package.json package.json
COPY --from=build /repo/src/domain src/domain
COPY --from=build /repo/src/mcp/protocol.js src/mcp/protocol.js
COPY --from=build /repo/server/node_modules server/node_modules
COPY --from=build /repo/server/package.json server/package.json
COPY --from=build /repo/server/migrations server/migrations
COPY --from=build /repo/server/dist server/dist
USER node
EXPOSE 3000
CMD ["node", "server/dist/src/main.js"]
