import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig(({ mode }) => {
	const isTest = mode === "test";

	return {
		plugins: [
			devtools(),
			// Exclude Cloudflare plugin during tests to avoid CommonJS module issues
			...(isTest ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
			// this is the plugin that enables path aliases
			viteTsConfigPaths({
				projects: ["./tsconfig.json"],
			}),
			tailwindcss(),
			...(isTest ? [] : [tanstackStart()]),
			viteReact({
				babel: {
					plugins: [
						"babel-plugin-react-compiler",
						["@babel/plugin-proposal-decorators", { legacy: true }],
						["@babel/plugin-proposal-class-properties", { loose: true }],
					],
				},
			}),
		],
		test: {
			globals: true,
			environment: "jsdom",
			setupFiles: [],
			passWithNoTests: true,
		},
		build: {
			rollupOptions: {
				external: ["cloudflare:workers"],
			},
		},
	};
});

export default config;
