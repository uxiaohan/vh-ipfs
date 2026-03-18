FROM node:22-bullseye-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     curl ca-certificates python3 make g++ pkg-config libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG KUBO_VERSION
RUN set -e; \
  arch="$(uname -m)"; \
  if [ "$arch" = "x86_64" ]; then KUBO_ARCH=amd64; \
  elif [ "$arch" = "aarch64" ]; then KUBO_ARCH=arm64; \
  else echo "Unsupported arch: $arch"; exit 1; fi; \
  if [ -z "$KUBO_VERSION" ]; then \
    KUBO_VERSION=$(curl -fsSL https://api.github.com/repos/ipfs/kubo/releases/latest \
      | sed -n 's/.*"tag_name": "v\([^"]*\)".*/\1/p' \
      | head -n1); \
  fi; \
  echo "Using Kubo v$KUBO_VERSION for linux-$KUBO_ARCH"; \
  curl -L "https://github.com/ipfs/kubo/releases/download/v${KUBO_VERSION}/kubo_v${KUBO_VERSION}_linux-${KUBO_ARCH}.tar.gz" \
    | tar -xz -C /tmp; \
  install /tmp/kubo/ipfs /usr/local/bin/ipfs; \
  rm -rf /tmp/kubo

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/
RUN npm install -g pnpm \
  && pnpm config set store-dir /tmp/pnpm-store \
  && pnpm approve-builds --all \
  && pnpm install \
  && rm -rf /tmp/pnpm-store

COPY api ./api
COPY web ./web
RUN cd api && pnpm build
RUN cd web && pnpm build

FROM node:22-bullseye-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     curl ca-certificates supervisor libsqlite3-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/local/bin/ipfs /usr/local/bin/ipfs
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/public ./public

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start-ipfs.sh /usr/local/bin/start-ipfs.sh
RUN chmod +x /usr/local/bin/start-ipfs.sh

ENV IPFS_PATH=/data/ipfs

VOLUME ["/data", "/data/ipfs"]

EXPOSE 16661 16662

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
