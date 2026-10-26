# Production build for the NewStart frontend: build with Vite, serve static files with nginx.
# Build context MUST be the repository root.
#   docker build -f frontend/Dockerfile --build-arg VITE_API_BASE_URL=http://localhost:8080 .

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

RUN npm ci --no-audit --no-fund

COPY frontend ./frontend
# The API base URL is baked in at build time (the browser calls it directly).
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build --workspace=frontend

# ---------- runtime stage ----------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
# Image runs as non-root (uid 101): switch to root only to patch/trim OS packages
USER root
# Apply Alpine security fixes; remove curl (nginx doesn't need it at runtime)
RUN apk upgrade --no-cache \
 && apk del --no-cache curl
USER 101
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
# nginx handles SIGTERM/SIGQUIT for graceful shutdown by default.
CMD ["nginx", "-g", "daemon off;"]
