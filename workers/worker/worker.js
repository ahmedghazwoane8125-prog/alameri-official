'use strict';

const { createServer } = require('node:http');

const PORT = 1234;
let stopping = false;

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(stopping ? 503 : 200, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(stopping ? 'stopping\n' : 'ok\n');
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('not found\n');
});

// Infrastructure smoke test only. No queue or business job source is configured.
const heartbeat = setInterval(() => {
  console.log('Daemon heartbeat: no job source configured');
}, 60_000);

function stop(signal) {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeat);
  console.log(`Received ${signal}; shutting down gracefully`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Vercel daemon smoke test listening on port ${PORT}`);
});
