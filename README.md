# Sycloseouts

This project serves the API and client from a single Express server.

## Configuration

The server reads the port from the `PORT` environment variable. If `PORT` is not set or is invalid, the server falls back to port `5000`.

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
For wire transfer payments, configure `WIRE_INSTRUCTIONS` with the bank details you want emailed to buyers.
