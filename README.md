# Sycloseouts

This project serves the API and client from a single Express server.

## Configuration

Copy `.env.example` to `.env` and fill in your credentials. The server reads all
configuration values from this file. The `PORT` variable controls which port the
server listens on. If it is not set or invalid, the server falls back to port
`5000`.

```bash
PORT=3000 npm run dev
```

If no `PORT` is specified, running `npm run dev` starts the server on port `5000`.
If the specified port is already in use, the server logs an error message.

## Saved addresses and payment methods
The buyer and seller dashboards show your saved addresses and credit cards using radio buttons.
Selecting a saved option during checkout automatically fills the form, or you can choose **Add New Address** or **Add New Payment Method** to provide new details.
Any new address or card entered during checkout is saved to your profile automatically for next time.

## Shipment Tracking
To automatically update order statuses from tracking numbers, set the `TRACKTRY_API_KEY` environment variable with your Tracktry.com API key.
For wire transfer payments, configure `WIRE_INSTRUCTIONS` with any additional instructions. Specify your bank details using `WIRE_ACCOUNT_NUMBER` and `WIRE_ROUTING_NUMBER`. If these are not set, the server defaults to account number `12345678` and routing number `12345678` in the wire instructions email.
Buyers selecting this payment method receive a styled HTML email with the invoice total and a link to view their order.

When paying via wire, the buyer initially receives only the wire transfer instructions.
The invoice and seller notification emails are sent once the order status is updated to **ordered** after the wire is received.

## Support Tickets
When a user submits a support ticket they receive an email confirming the ticket number. Set `SUPPORT_EMAIL_FROM` to control the "from" address for these messages and `SUPPORT_EMAIL_CC` to copy another address on every ticket email.

## Deploying with Nginx
The `docs/nginx_proxy.conf` file contains an example Nginx configuration that
terminates TLS and forwards every request to the Express server. This allows the
server to inject dynamic Open Graph meta tags for product pages. Copy the file to
`/etc/nginx/sites-available` (adjusting paths to your certificates) and enable it
with a symlink in `sites-enabled`.

The Express app serves the built client and all API routes on the same port
(default `5000`), so Nginx only needs to proxy to `http://localhost:5000`.

Make sure the Express server is running on the port that Nginx forwards to.
In production you typically build the project and start the compiled server:

```bash
npm run build
PORT=5000 npm start
```

If you use a different port, update the `proxy_pass` line in
`docs/nginx_proxy.conf` to match. A port mismatch will result in a 502 Bad
Gateway error.

After editing the Nginx configuration, reload it so the changes take effect:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

If you still see a 502, verify the Express server is reachable from Nginx by
running `curl http://localhost:5000` on the same machine. The command should
return the HTML for the client. If it fails, ensure the server is running and
listening on that port.

Avoid configuring Nginx to serve the built `dist` directory directly. If you set
`root` or `try_files` the Node server never sees the request and the default Open
Graph tags remain. Use the provided proxy config so every path is handled by the
Express app and product pages get their dynamic metadata injected.
