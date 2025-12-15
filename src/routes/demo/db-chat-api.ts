import type { Collection } from "@tanstack/db";
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { z } from "zod";

const IncomingMessageSchema = z.object({
	user: z.string(),
	text: z.string(),
});

const MessageSchema = IncomingMessageSchema.extend({
	id: z.number(),
});

export type Message = z.infer<typeof MessageSchema>;

// Lazy initialization for Cloudflare Workers compatibility
// Workers prohibit async I/O, timeouts, and random values in global scope
let serverMessagesCollection: Collection<Message, number, Message> | null =
	null;
let id = 0;

async function getServerCollection(): Promise<
	Collection<Message, number, Message>
> {
	if (serverMessagesCollection) return serverMessagesCollection;

	const { createCollection, localOnlyCollectionOptions } = await import(
		"@tanstack/db"
	);

	serverMessagesCollection = createCollection(
		localOnlyCollectionOptions({
			getKey: (message: Message) => message.id,
			schema: MessageSchema,
		}),
	);

	// Seed initial messages
	serverMessagesCollection.insert({
		id: id++,
		user: "Alice",
		text: "Hello, how are you?",
	});
	serverMessagesCollection.insert({
		id: id++,
		user: "Bob",
		text: "I'm fine, thank you!",
	});

	return serverMessagesCollection;
}

export const Route = createFileRoute("/demo/db-chat-api")({
	server: {
		handlers: {
			GET: async () => {
				const collection = await getServerCollection();
				const stream = new ReadableStream({
					start(controller) {
						for (const [_id, message] of collection.state) {
							controller.enqueue(`${JSON.stringify(message)}\n`);
						}
						collection.subscribeChanges((changes) => {
							for (const change of changes) {
								if (change.type === "insert") {
									controller.enqueue(`${JSON.stringify(change.value)}\n`);
								}
							}
						});
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "application/x-ndjson",
					},
				});
			},
			POST: async ({ request }) => {
				const collection = await getServerCollection();
				const message = IncomingMessageSchema.safeParse(await request.json());
				if (!message.success) {
					return new Response(message.error.message, { status: 400 });
				}
				collection.insert({
					id: id++,
					user: message.data.user,
					text: message.data.text,
				});
				return json(message.data);
			},
		},
	},
});
