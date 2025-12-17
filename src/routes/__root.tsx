import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Ephemeris - ISS Tracker",
			},
			{
				name: "description",
				content:
					"Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			// Open Graph tags
			{
				property: "og:title",
				content: "Ephemeris - ISS Tracker",
			},
			{
				property: "og:description",
				content:
					"Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			{
				property: "og:image",
				content: "https://ephemeris.observer/og-image.png",
			},
			{
				property: "og:url",
				content: "https://ephemeris.observer",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:site_name",
				content: "Ephemeris",
			},
			// Twitter Cards
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:site",
				content: "@ephaboratory",
			},
			{
				name: "twitter:url",
				content: "https://ephemeris.observer",
			},
			{
				name: "twitter:title",
				content: "Ephemeris - ISS Tracker",
			},
			{
				name: "twitter:description",
				content:
					"Track the International Space Station in real-time. View live ISS position, crew manifest, and orbital map.",
			},
			{
				name: "twitter:image",
				content: "https://ephemeris.observer/og-image.png",
			},
			// SEO
			{
				name: "robots",
				content: "index, follow",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "canonical",
				href: "https://ephemeris.observer",
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap",
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
