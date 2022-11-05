import { serve } from "server";
import { webhookCallback } from "grammy/mod.ts";
import bot from "./bot.ts";

console.log(`Started bot as @${bot.botInfo.username}`);

const handleUpdate = webhookCallback(bot, "std/http");

serve(async (req) => {
  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.pathname.slice(1) === bot.token) {
      try {
        return await handleUpdate(req);
      } catch (err) {
        console.error(err);
      }
    }
  }
  return new Response();
});
