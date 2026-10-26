# Production-quality multi-stage build for the NewStart API Gateway.
# Build context MUST be the repository root.
#   docker build -f gateway/Dockerfile .

ARG NODE_VERSION=22

# ---------- build stage ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/shared-events/package.json packages/shared-events/
COPY services/user-service/package.json services/user-service/
COPY services/opportunity-service/package.json services/opportunity-service/
COPY services/checklist-service/package.json services/checklist-service/
COPY services/notification-service/package.json services/notification-service/
COPY gateway/package.json gateway/
COPY frontend/package.json frontend/
RUN npm ci

COPY packages ./packages
COPY gateway ./gateway
RUN npm run build --workspace=packages/shared-types \
 && npm run build --workspace=packages/shared-utils \
 && npm run build --workspace=gateway
RUN npm prune --omit=dev

# ---------- runtime stage ----------
# ---------- runtime stage ----------
FROM node:${NODE_VERSION}-alpine AS runtime
# tini as PID 1; then remove package managers the gateway never uses at runtime
RUN apk add --no-cache tini \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/gateway/dist ./gateway/dist
COPY --from=build /app/gateway/package.json ./gateway/package.json

USER node
WORKDIR /app/gateway
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
