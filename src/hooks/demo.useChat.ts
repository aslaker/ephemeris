import type { Collection } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { useEffect, useRef, useState } from "react";
import { getMessagesCollection, type Message } from "@/db-collections";

function useStreamConnection(
	url: string,
	getCollection: () => Promise<Collection<Message, number, Message>>,
) {
	const loadedRef = useRef(false);
	const urlRef = useRef(url);
	const getCollectionRef = useRef(getCollection);

	useEffect(() => {
		const fetchData = async () => {
			if (loadedRef.current) return;
			loadedRef.current = true;

			const collection = await getCollectionRef.current();
			const response = await fetch(urlRef.current);
			const reader = response.body?.getReader();
			if (!reader) {
				return;
			}

			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				for (const chunk of decoder
					.decode(value, { stream: true })
					.split("\n")
					.filter((chunk) => chunk.length > 0)) {
					collection.insert(JSON.parse(chunk));
				}
			}
		};
		fetchData();
	}, []);
}

export function useChat() {
	useStreamConnection("/demo/db-chat-api", getMessagesCollection);

	const sendMessage = (message: string, user: string) => {
		fetch("/demo/db-chat-api", {
			method: "POST",
			body: JSON.stringify({ text: message.trim(), user: user.trim() }),
		});
	};

	return { sendMessage };
}

export function useMessages() {
	const [collection, setCollection] = useState<Collection<
		Message,
		number,
		Message
	> | null>(null);

	useEffect(() => {
		getMessagesCollection().then(setCollection);
	}, []);

	const { data: messages } = useLiveQuery(
		(q) =>
			collection
				? q.from({ message: collection }).select(({ message }) => ({
						...message,
					}))
				: null,
		{ enabled: !!collection },
	);

	return (messages ?? []) as Message[];
}
