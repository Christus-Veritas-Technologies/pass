import { Mastra } from "@mastra/core";
import { passAgent } from "./agents/pass.agent";

export const mastra = new Mastra({
  agents: { passAgent },
});

export { passAgent };
