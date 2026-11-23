# Project purpose

This project is a minimal, dependency-free Node.js HTTP server that demonstrates the built-in `http` module end to end: one exact-match route (`GET /hello`), one catch-all `404` for every other request, one log line per request, a port validated from the `PORT` environment variable, and a clean shutdown on CTRL+C. It imports nothing but `http`, so there are no dependencies, no build step and no configuration file.

# Prerequisites

Node.js 18.0.0 or newer. The manifest states the floor as `>=18.0.0`, and every version at or above it runs this server unchanged.

```bash
node --version
```

Compare the output with `v18.0.0`: anything from that version upward is sufficient.

# Installation

There is nothing to install. The server uses only the built-in `http` module, so no packages are fetched, no package-manager step is needed and no `node_modules` directory is ever created. With Node.js present, the project runs as it stands.

# Execution

Start the server from the project root:

```bash
node server.js
```

It stays in the foreground and prints one line once the socket is bound:

```text
Server listening on port 3000
```

`npm start` runs the same command through the manifest's start script, and npm prints its two banner lines above the server's own output:

```bash
npm start
```

```text
> nodejs-tutorial-hello-world@1.0.0 start
> node server.js

Server listening on port 3000
```

The port in that line is the port actually bound: `3000` unless `PORT` is set, as the last section explains. Leave the server running in its own terminal for the next section.

# Testing / verification

In a second terminal, request the one defined route:

```bash
curl http://localhost:3000/hello
```

```text
Hello world
```

Request any other path:

```bash
curl -i http://localhost:3000/invalid
```

The reply is the `404` shown in the next section. A defined path reached by a method other than `GET` is answered the same way, because the server has no `405` response and sends no `Allow` header:

```bash
curl -i -X POST http://localhost:3000/hello
```

```http
HTTP/1.1 404 Not Found
Content-Type: text/plain
Content-Length: 9

Not Found
```

A query string is ignored, so `http://localhost:3000/hello?x=1` answers exactly as `/hello` does. Each of these requests also prints a log line in the terminal running the server.

# Expected output

`GET /hello` answers `200` with the body `Hello world`:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

Hello world
```

Every other request answers `404` with the body `Not Found`:

```http
HTTP/1.1 404 Not Found
Content-Type: text/plain
Content-Length: 9

Not Found
```

`Content-Length` is the body's length in bytes, and neither body ends with a newline. Node also sends its own `Date`, `Connection: keep-alive` and `Keep-Alive` headers, so `curl -i` shows lines these blocks do not list.

Each request prints one line to the server's console: the timestamp in ISO-8601 UTC form, the HTTP method and the request path, separated by single spaces.

```text
2026-11-23T10:23:45.123Z GET /hello
```

The timestamp is the current time, so it normally varies between requests, though requests handled within the same millisecond print identical lines. The query string is not printed. A request target that carries a byte outside printable ASCII is rejected by Node's own HTTP parser with `400 Bad Request` before the server's handler runs, so it produces no log line at all.

# Shutdown

Press CTRL+C in the terminal running the server. It logs one line and stops:

```text
Shutting down server
```

A second CTRL+C is harmless: if it arrives while the first shutdown is still closing connections, the server logs `Shutdown already in progress` and does not shut down twice. Either way the server process exits with status `0`. On a host without an interactive terminal, `kill -INT <pid>` sends the same signal that CTRL+C sends, where `<pid>` is the node process running `node server.js`. If you started the server with `npm start`, send the signal to that node process rather than to the npm process: npm does not pass the signal on, so the server keeps running.

# Environment variable configuration

The server reads one environment variable, `PORT`, and nothing else. Unset, it defaults to `3000`; set, it must be an integer between `1024` and `65535`. Choose another port by setting it on the command line:

```bash
PORT=4000 node server.js
```

```text
Server listening on port 4000
```

A value outside that range, or one that is not an integer, stops the server before it binds. The message names the offending value and the exit status is `1`:

```bash
PORT=80 node server.js
```

```text
Invalid PORT value "80": expected an integer between 1024 and 65535. Set PORT to a port in that range, or unset it to use the default 3000.
```

The same message appears for values such as `abc` or `70000`, and an empty `PORT=` is rejected the same way; only an unset `PORT` falls back to `3000`.

Characters in the rejected value that fall outside printable ASCII are printed escaped in that message — `\xNN` for a value up to `0xFF`, `\uNNNN` above it — so the message stays on one line whatever value was set.
