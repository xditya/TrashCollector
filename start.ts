import bot from "./bot.ts";

console.log(`Started bot as @${bot.botInfo.username}`);

bot.start({
  drop_pending_updates: true,
  allowed_updates: ["message", "callback_query"],
});

Deno.addSignalListener("SIGINT", () => bot.stop());
Deno.addSignalListener("SIGTERM", () => bot.stop());
