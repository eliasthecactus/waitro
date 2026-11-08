# One image: Node serves the web app and answers /api. The catalog (data/) is baked in at build time.
FROM node:24-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data CATALOG_DIR=/app/data WEB_DIR=/app/web
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY server/src server/src
COPY server/entrypoint.sh /entrypoint.sh
COPY data data
COPY web web
RUN node --disable-warning=ExperimentalWarning -e "import('/app/server/src/catalog.js').then(m => m.loadCatalog('/app/data'))"
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "--disable-warning=ExperimentalWarning", "server/src/server.js"]
