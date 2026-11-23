// A dependency-free teaching server: one route, one catch-all, one log line per
// request, a validated port and a clean shutdown. It imports nothing but Node's
// built-in `http` module, so there is nothing to install, build or transpile.
//
// Run it with `node server.js` (or `PORT=4000 node server.js` to pick the port)
// and stop it with CTRL+C.

const http = require('http');

const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;
const ROUTE_HELLO = '/hello';

let server;
const sockets = new Set();
let shuttingDown = false;

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function logRequest(req, pathname) {
  console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
}

function handleHello(req, res) {
  sendText(res, 200, 'Hello world');
}

function handleNotFound(req, res) {
  sendText(res, 404, 'Not Found');
}

function requestHandler(req, res) {
  const pathname = req.url.split('?')[0];
  logRequest(req, pathname); // Runs before routing, so no response can go unlogged.
  if (req.method === 'GET' && pathname === ROUTE_HELLO) {
    return handleHello(req, res);
  }
  return handleNotFound(req, res);
}

function resolvePort(rawValue) {
  if (rawValue === undefined) {
    return DEFAULT_PORT;
  }

  // Validated before binding: a port outside the range either needs privileges or
  // cannot be listened on, so the value is reported instead of attempted.
  const port = /^[0-9]+$/.test(rawValue) ? Number(rawValue) : NaN;
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(
      `Invalid PORT value "${rawValue}": expected an integer between 1024 and 65535. ` +
        'Set PORT to a port in that range, or unset it to use the default 3000.'
    );
  }

  return port;
}

function startServer(port) {
  server = http.createServer(requestHandler);

  // Sockets are tracked so shutdown can release idle keep-alive connections that
  // server.close() would otherwise wait out; the entry is dropped on 'close' so
  // the set shrinks as connections end.
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const alternative = port === MAX_PORT ? port - 1 : port + 1;
      console.error(
        `Port ${port} is already in use. Stop the process using it, or choose another port with PORT=${alternative}.`
      );
    } else {
      console.error(`Failed to start server: ${error.code}. ${error.message}`);
    }
    for (const socket of sockets) {
      socket.destroy();
    }
    process.exitCode = 1;
  });

  server.on('listening', () => {
    console.log(`Server listening on port ${port}`);
  });

  server.listen(port);
}

function shutdown() {
  if (shuttingDown) {
    console.log('Shutdown already in progress');
    return;
  }
  shuttingDown = true;
  console.log('Shutting down server');

  server.close(() => {
    process.exitCode = 0;
  });

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  } else {
    for (const socket of sockets) {
      socket.destroy();
    }
  }
}

function main() {
  let port;
  try {
    port = resolvePort(process.env.PORT);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  startServer(port);
  process.on('SIGINT', shutdown);
}

main();
