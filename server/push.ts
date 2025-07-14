import "dotenv/config";
import webpush from "web-push";
import { storage } from "./storage";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.ADMIN_EMAIL || "";

if (publicKey && privateKey) {
  webpush.setVapidDetails(`mailto:${contact}`, publicKey, privateKey);
}

export async function addSubscription(sub: any): Promise<void> {
  await storage.addPushSubscription(sub);
}

export async function sendPushNotification(payload: any): Promise<void> {
  const subs = await storage.getPushSubscriptions();
  const message = JSON.stringify(payload);
  await Promise.all(
    subs.map((s: any) =>
      webpush.sendNotification(s, message).catch((err) => {
        console.error("Push error", err);
      }),
    ),
  );
}
