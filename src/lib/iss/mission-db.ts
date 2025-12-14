/**
 * Mission Database
 * Local lookup table for crew enrichment with images, roles, and mission dates.
 * The Open Notify API only provides names, so we enrich with this data.
 */

import type { MissionProfile } from "./types";

export const MISSION_DB: Record<string, MissionProfile> = {
	// Starliner (Extended Stay)
	"Sunita Williams": {
		start: "2024-06-05",
		role: "Commander",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Sunita_Williams_official_portrait_2018.jpg/480px-Sunita_Williams_official_portrait_2018.jpg",
	},
	"Suni Williams": { aliasFor: "Sunita Williams", role: "", agency: "" },
	"Barry Wilmore": {
		start: "2024-06-05",
		role: "Pilot",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Barry_Wilmore_official_portrait_2014.jpg/480px-Barry_Wilmore_official_portrait_2014.jpg",
	},
	"Butch Wilmore": { aliasFor: "Barry Wilmore", role: "", agency: "" },

	// Crew-9
	"Nick Hague": {
		start: "2024-09-28",
		role: "Commander",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Nick_Hague_official_portrait_2016.jpg/480px-Nick_Hague_official_portrait_2016.jpg",
	},
	"Aleksandr Gorbunov": {
		start: "2024-09-28",
		role: "Mission Specialist",
		agency: "Roscosmos",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Aleksandr_Gorbunov_official_portrait.jpg/480px-Aleksandr_Gorbunov_official_portrait.jpg",
	},

	// Soyuz MS-26
	"Donald Pettit": {
		start: "2024-09-11",
		role: "Flight Engineer",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Donald_Pettit_official_portrait_2011.jpg/480px-Donald_Pettit_official_portrait_2011.jpg",
	},
	"Don Pettit": { aliasFor: "Donald Pettit", role: "", agency: "" },
	"Alexey Ovchinin": {
		start: "2024-09-11",
		role: "Commander",
		agency: "Roscosmos",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Alexey_Ovchinin_official_portrait.jpg/480px-Alexey_Ovchinin_official_portrait.jpg",
	},
	"Ivan Vagner": {
		start: "2024-09-11",
		role: "Flight Engineer",
		agency: "Roscosmos",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Ivan_Vagner_official_portrait.jpg/480px-Ivan_Vagner_official_portrait.jpg",
	},

	// Soyuz MS-25
	"Oleg Kononenko": {
		start: "2023-09-15",
		role: "Commander",
		agency: "Roscosmos",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Oleg_Kononenko_official_portrait_2011.jpg/480px-Oleg_Kononenko_official_portrait_2011.jpg",
	},
	"Nikolai Chub": {
		start: "2023-09-15",
		role: "Flight Engineer",
		agency: "Roscosmos",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Nikolai_Chub_official_portrait.jpg/480px-Nikolai_Chub_official_portrait.jpg",
	},
	"Tracy Caldwell Dyson": {
		start: "2024-03-23",
		role: "Flight Engineer",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Tracy_Caldwell_Dyson_official_portrait_2010.jpg/480px-Tracy_Caldwell_Dyson_official_portrait_2010.jpg",
	},
	"Tracy Dyson": { aliasFor: "Tracy Caldwell Dyson", role: "", agency: "" },

	// Crew-8
	"Matthew Dominick": {
		start: "2024-03-04",
		role: "Commander",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Matthew_Dominick_official_portrait.jpg/480px-Matthew_Dominick_official_portrait.jpg",
	},
	"Michael Barratt": {
		start: "2024-03-04",
		role: "Pilot",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Michael_Reed_Barratt_v2.jpg/480px-Michael_Reed_Barratt_v2.jpg",
	},
	"Jeanette Epps": {
		start: "2024-03-04",
		role: "Mission Specialist",
		agency: "NASA",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Jeanette_Epps_official_portrait_2016.jpg/480px-Jeanette_Epps_official_portrait_2016.jpg",
	},
	"Alexander Grebenkin": {
		start: "2024-03-04",
		role: "Flight Engineer",
		agency: "Roscosmos",
		image:
			"https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Alexander_Grebenkin_official_portrait.jpg/480px-Alexander_Grebenkin_official_portrait.jpg",
	},
};

/**
 * Find mission profile in database with fuzzy matching
 */
export const findMissionProfile = (
	name: string,
): MissionProfile | undefined => {
	const normalize = (s: string) =>
		s
			.toLowerCase()
			.replace(/[^a-z ]/g, "")
			.trim();
	const searchName = normalize(name);

	const dbKeys = Object.keys(MISSION_DB);

	// 1. Exact Match
	const exactKey = dbKeys.find((k) => normalize(k) === searchName);
	if (exactKey) {
		const entry = MISSION_DB[exactKey];
		return entry.aliasFor && MISSION_DB[entry.aliasFor]
			? MISSION_DB[entry.aliasFor]
			: entry;
	}

	// 2. Fuzzy Last Name Match
	const searchParts = searchName.split(" ");
	const searchLast = searchParts[searchParts.length - 1];

	const fallbackKey = dbKeys.find((k) => {
		const nKey = normalize(k);
		return (
			nKey.includes(searchLast) &&
			(nKey.includes(searchName) || searchName.includes(nKey))
		);
	});

	if (fallbackKey) {
		const entry = MISSION_DB[fallbackKey];
		return entry.aliasFor && MISSION_DB[entry.aliasFor]
			? MISSION_DB[entry.aliasFor]
			: entry;
	}

	return undefined;
};
