import { config } from "dotenv";
import { cleanEnv, num, str } from "envalid";

await config({ export: true });

export default cleanEnv(Deno.env.toObject(), {
  BOT_TOKEN: str(),
  OWNERS: str(),
  LOG_CHAT: num(),
});
