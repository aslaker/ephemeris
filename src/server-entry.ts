import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { CopilotAgent } from "./lib/copilot/agent-class";

const handler = createStartHandler(defaultStreamHandler);

export { CopilotAgent };

export default {
	async fetch(request: Request, env: any, ctx: any) {
		return await (handler as any)(request, env, ctx);
	},
};
