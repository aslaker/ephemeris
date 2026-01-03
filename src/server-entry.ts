import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { CopilotAgent } from "./lib/copilot/agent-class";

const handler = createStartHandler(defaultStreamHandler);

export { CopilotAgent };

export default {
	// biome-ignore lint/suspicious/noExplicitAny: Handler types from TanStack Start aren't fully typed
	async fetch(request: Request, env: any, ctx: any) {
		// biome-ignore lint/suspicious/noExplicitAny: Handler types from TanStack Start aren't fully typed
		return await (handler as any)(request, env, ctx);
	},
};
