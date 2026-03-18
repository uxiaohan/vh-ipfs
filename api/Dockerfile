FROM node:22-bullseye-slim

ARG KUBO_VERSION

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     curl ca-certificates supervisor python3 make g++ pkg-config libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@10.32.1

WORKDIR /app

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

COPY package.json ./
RUN pnpm config set store-dir /tmp/pnpm-store \
  && pnpm install --prod \
  && rm -rf /tmp/pnpm-store

COPY server.js ./
COPY db.js ./
COPY start-ipfs.sh ./
COPY supervisord.conf ./
COPY public ./public
COPY db ./db

COPY web/package.json ./web/
COPY web/vite.config.js ./web/
COPY web/index.html ./web/
COPY web/src ./web/src

WORKDIR /app/web
RUN pnpm install && pnpm run build

WORKDIR /app

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start-ipfs.sh /usr/local/bin/start-ipfs.sh
RUN chmod +x /usr/local/bin/start-ipfs.sh

ENV IPFS_PATH=/data/ipfs

EXPOSE 16661 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
