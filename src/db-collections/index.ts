import { z } from "zod";

const MessageSchema = z.object({
	id: z.number(),
	text: z.string(),
	user: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

// Cloudflare Workers prohibit async I/O, timeouts, and random values in global scope
// We must defer all createCollection calls to runtime in the browser only

// Type import only - no runtime code execution
import type { Collection } from "@tanstack/react-db";

let _messagesCollection: Collection<Message> | null = null;

// Export a getter function that consumers can call in useEffect/handlers
export async function getMessagesCollection(): Promise<Collection<Message>> {
	if (_messagesCollection) return _messagesCollection;

	// Dynamic import to avoid loading @tanstack/react-db in Workers global scope
	const { createCollection, localOnlyCollectionOptions } = await import(
		"@tanstack/react-db"
	);

	_messagesCollection = createCollection(
		localOnlyCollectionOptions({
			getKey: (message: Message) => message.id,
			schema: MessageSchema,
		}),
	);

	return _messagesCollection;
}

// For backwards compatibility - client-side only proxy
// On server, this is a stub that will throw if accessed
export const messagesCollection = (
	typeof window !== "undefined"
		? new Proxy({} as Collection<Message>, {
				get(_, prop: string | symbol) {
					if (!_messagesCollection) {
						throw new Error(
							"messagesCollection not initialized. Call getMessagesCollection() first.",
						);
					}
					return Reflect.get(_messagesCollection, prop);
				},
			})
		: null
) as Collection<Message>;
