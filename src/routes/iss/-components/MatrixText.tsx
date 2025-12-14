import { useEffect, useRef, useState } from "react";
import type { MatrixTextProps } from "@/lib/iss/types";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*[]{}<>";

/**
 * MatrixText - Animated text with Matrix-style scramble effect
 * Text characters scramble randomly before "locking in" to the final value.
 */
export const MatrixText = ({
	text,
	speed = 30,
	className = "",
	preserveSpace = true,
}: MatrixTextProps) => {
	const [display, setDisplay] = useState(text);
	const iterations = useRef(0);
	const intervalRef = useRef<number | null>(null);

	useEffect(() => {
		// Reset iterations on text change
		iterations.current = 0;

		if (intervalRef.current) window.clearInterval(intervalRef.current);

		intervalRef.current = window.setInterval(() => {
			setDisplay(() => {
				const result = text
					.split("")
					.map((char, index) => {
						if (index < iterations.current) {
							return text[index];
						}
						if (preserveSpace && char === " ") return " ";
						return CHARS[Math.floor(Math.random() * CHARS.length)];
					})
					.join("");

				if (iterations.current >= text.length) {
					if (intervalRef.current) window.clearInterval(intervalRef.current);
				}

				iterations.current += 1 / 3; // Slow down the "lock in" effect
				return result;
			});
		}, speed);

		return () => {
			if (intervalRef.current) window.clearInterval(intervalRef.current);
		};
	}, [text, speed, preserveSpace]);

	return <span className={className}>{display}</span>;
};
