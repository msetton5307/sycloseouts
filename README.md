# Sycloseouts

This project serves the API and client from a single Express server.

## Configuration

<<<<<<< codex/update-server-to-read-port-from-env
The server reads the port from the `PORT` environment variable. If `PORT` is not
provided or is invalid, the server falls back to port `5000`.
=======
The server reads the port from the `PORT` environment variable. If `PORT` is not set or is invalid, the server falls back to port `5000`.
>>>>>>> main

```bash
PORT=3000 npm run dev
```

<<<<<<< codex/update-server-to-read-port-from-env
If no `PORT` is specified, running `npm run dev` starts the server on port
`5000`.

=======
>>>>>>> main
If the specified port is already in use, the server logs an error message.
