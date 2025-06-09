# Sycloseouts

This project serves the API and client from a single Express server.

## Configuration

The server reads the port from the `PORT` environment variable. If `PORT` is not set or is invalid, the server falls back to port `5000`.

```bash
PORT=3000 npm run dev
```

If the specified port is already in use, the server logs an error message.
