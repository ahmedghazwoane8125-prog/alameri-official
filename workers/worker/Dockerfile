FROM node:24-slim
WORKDIR /app
COPY worker.js ./worker.js
USER node
CMD ["node", "worker.js"]
