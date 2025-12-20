/**
 * ISS Knowledge Base Data
 *
 * Curated facts about the ISS, spaceflight, and orbital mechanics.
 * Feature: 007-observation-copilot
 */

import type { KnowledgeEntry } from "./types";

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
	// Specifications
	{
		id: "kb-001",
		title: "ISS Size and Mass",
		content:
			"The International Space Station is approximately 109 meters (358 feet) wide and weighs about 420,000 kilograms (925,000 pounds). It's roughly the size of a football field.",
		category: "specifications",
		keywords: [
			"size",
			"dimensions",
			"mass",
			"weight",
			"big",
			"large",
			"football field",
		],
	},
	{
		id: "kb-002",
		title: "ISS Orbital Altitude",
		content:
			"The ISS orbits Earth at an average altitude of approximately 400-420 kilometers (250-260 miles) above Earth's surface.",
		category: "specifications",
		keywords: ["altitude", "height", "orbit", "high", "far", "distance"],
	},
	{
		id: "kb-003",
		title: "ISS Orbital Speed",
		content:
			"The ISS travels at approximately 27,600 km/h (17,150 mph), completing one full orbit around Earth every 90 minutes.",
		category: "specifications",
		keywords: [
			"speed",
			"velocity",
			"fast",
			"orbit time",
			"quick",
			"mph",
			"kmh",
		],
	},
	{
		id: "kb-004",
		title: "ISS Modules and Structure",
		content:
			"The ISS consists of multiple pressurized modules including the US Lab (Destiny), Russian modules (Zvezda, Zarya), European Columbus lab, Japanese Kibo lab, and several others.",
		category: "specifications",
		keywords: [
			"modules",
			"structure",
			"parts",
			"sections",
			"destiny",
			"kibo",
			"columbus",
		],
	},

	// History
	{
		id: "kb-010",
		title: "ISS Construction History",
		content:
			"Construction of the ISS began in 1998 with the launch of the Russian Zarya module. The first crew arrived in November 2000, and the station has been continuously occupied ever since.",
		category: "history",
		keywords: [
			"history",
			"built",
			"construction",
			"when",
			"started",
			"first",
			"1998",
			"zarya",
		],
	},
	{
		id: "kb-011",
		title: "International Collaboration",
		content:
			"The ISS is a joint project among five space agencies: NASA (USA), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada).",
		category: "history",
		keywords: [
			"collaboration",
			"countries",
			"international",
			"agencies",
			"nasa",
			"roscosmos",
			"who built",
		],
	},
	{
		id: "kb-012",
		title: "ISS Cost",
		content:
			"The International Space Station is one of the most expensive structures ever built, with total costs estimated at over $150 billion USD over its lifetime.",
		category: "history",
		keywords: ["cost", "expensive", "price", "money", "billion"],
	},

	// Orbital Mechanics
	{
		id: "kb-020",
		title: "ISS Orbital Inclination",
		content:
			"The ISS orbits at an inclination of 51.6 degrees to Earth's equator. This allows it to pass over most of Earth's populated areas.",
		category: "orbital_mechanics",
		keywords: [
			"inclination",
			"angle",
			"orbit angle",
			"51.6 degrees",
			"trajectory",
		],
	},
	{
		id: "kb-021",
		title: "Why the ISS is Visible",
		content:
			"The ISS is visible from Earth because its large solar panels reflect sunlight. It can appear as bright as Venus, making it easy to spot with the naked eye during twilight hours.",
		category: "orbital_mechanics",
		keywords: [
			"visible",
			"bright",
			"see",
			"solar panels",
			"reflection",
			"venus",
			"shine",
		],
	},
	{
		id: "kb-022",
		title: "ISS Orbit Decay",
		content:
			"The ISS loses altitude over time due to atmospheric drag, dropping about 100 meters per day. It requires periodic reboosts using Progress cargo ships or other spacecraft to maintain its orbit.",
		category: "orbital_mechanics",
		keywords: ["decay", "reboost", "altitude loss", "drag", "maintain orbit"],
	},
	{
		id: "kb-023",
		title: "ISS Orbital Period",
		content:
			"The ISS completes one full orbit around Earth every 90 minutes, meaning astronauts see approximately 16 sunrises and sunsets per day.",
		category: "orbital_mechanics",
		keywords: [
			"orbital period",
			"90 minutes",
			"sunrises",
			"sunsets",
			"orbit time",
		],
	},

	// Observation
	{
		id: "kb-030",
		title: "Best Time to See the ISS",
		content:
			"The best time to see the ISS is during twilight hours (shortly after sunset or before sunrise) when the sky is dark but the ISS is still in sunlight. It appears as a bright moving star.",
		category: "observation",
		keywords: [
			"see",
			"watch",
			"observe",
			"best time",
			"twilight",
			"sunset",
			"sunrise",
			"when to look",
		],
	},
	{
		id: "kb-031",
		title: "ISS Visibility Duration",
		content:
			"A typical ISS pass lasts 1-6 minutes, during which it moves from horizon to horizon. The duration depends on how high it rises in the sky (elevation angle).",
		category: "observation",
		keywords: [
			"duration",
			"how long",
			"pass length",
			"minutes",
			"visible time",
		],
	},
	{
		id: "kb-032",
		title: "ISS Brightness",
		content:
			"The ISS can reach a magnitude of -4 to -6, making it brighter than any star in the night sky and comparable to Venus. Higher passes (above 50° elevation) appear brightest.",
		category: "observation",
		keywords: ["brightness", "magnitude", "bright", "star", "how bright"],
	},
	{
		id: "kb-033",
		title: "ISS Direction of Travel",
		content:
			"The ISS typically appears from the western sky and moves toward the east, though the exact direction varies by pass. It travels from horizon to horizon in a smooth, steady arc.",
		category: "observation",
		keywords: ["direction", "where", "west", "east", "horizon", "path", "arc"],
	},

	// Crew
	{
		id: "kb-040",
		title: "ISS Crew Size",
		content:
			"The ISS typically hosts 6-7 astronauts and cosmonauts at a time, though this number can vary during crew rotations.",
		category: "crew",
		keywords: ["crew", "astronauts", "cosmonauts", "people", "how many"],
	},
	{
		id: "kb-041",
		title: "ISS Expedition Missions",
		content:
			"Crews are organized into expeditions, with each expedition lasting approximately 6 months. As of 2025, the ISS has hosted over 70 expeditions.",
		category: "crew",
		keywords: ["expedition", "mission", "crew rotation", "how long", "stay"],
	},
	{
		id: "kb-042",
		title: "Life on the ISS",
		content:
			"Astronauts on the ISS spend their time conducting scientific experiments, maintaining the station, exercising 2 hours daily, and enjoying views of Earth from the Cupola observation module.",
		category: "crew",
		keywords: [
			"life",
			"daily routine",
			"experiments",
			"living",
			"what do they do",
		],
	},
	{
		id: "kb-043",
		title: "ISS Resupply",
		content:
			"The ISS receives regular cargo deliveries from spacecraft including SpaceX Dragon, Northrop Grumman Cygnus, and Russian Progress vehicles, bringing food, water, experiments, and supplies.",
		category: "crew",
		keywords: ["resupply", "cargo", "food", "supplies", "dragon", "progress"],
	},

	// Missions and Purpose
	{
		id: "kb-050",
		title: "What is the ISS",
		content:
			"The International Space Station is a habitable space station and laboratory orbiting Earth. It serves as a microgravity research facility where scientific research is conducted in astrobiology, astronomy, meteorology, physics, and other fields.",
		category: "missions",
		keywords: ["what is", "iss", "space station", "definition", "purpose"],
	},
	{
		id: "kb-051",
		title: "ISS Scientific Research",
		content:
			"The ISS conducts research that cannot be done on Earth, including studies of microgravity effects on human biology, materials science, fluid physics, combustion, and Earth observation.",
		category: "missions",
		keywords: ["research", "science", "experiments", "study", "microgravity"],
	},
	{
		id: "kb-052",
		title: "ISS Expected Lifetime",
		content:
			"The ISS is currently approved to operate through at least 2030. After that, it may be extended further or eventually deorbited in a controlled manner.",
		category: "missions",
		keywords: ["lifetime", "how long", "deorbit", "end", "future", "2030"],
	},
	{
		id: "kb-053",
		title: "ISS Technology Testing",
		content:
			"The ISS serves as a testbed for technologies needed for future deep space missions, including life support systems, solar power, and closed-loop environmental systems.",
		category: "missions",
		keywords: ["technology", "testing", "future", "deep space", "mars"],
	},

	// Additional facts
	{
		id: "kb-060",
		title: "ISS Solar Panels",
		content:
			"The ISS has eight large solar array wings spanning 73 meters (240 feet) that generate about 120 kilowatts of power - enough to power about 40 homes.",
		category: "specifications",
		keywords: ["solar panels", "power", "energy", "electricity", "watts"],
	},
	{
		id: "kb-061",
		title: "ISS Cupola Window",
		content:
			"The Cupola is a seven-window observation module that provides 360-degree views of Earth and space. It's used for observing Earth, monitoring robotic operations, and docking spacecraft.",
		category: "specifications",
		keywords: ["cupola", "window", "view", "observation", "see earth"],
	},
	{
		id: "kb-062",
		title: "Microgravity Environment",
		content:
			"The ISS experiences microgravity (often called 'zero-g'), not because there's no gravity, but because it's in continuous free fall around Earth. Gravity at ISS altitude is about 90% of surface gravity.",
		category: "orbital_mechanics",
		keywords: ["microgravity", "zero-g", "weightless", "gravity", "float"],
	},
	{
		id: "kb-063",
		title: "ISS Spacewalks",
		content:
			"Astronauts perform spacewalks (EVAs - Extra-Vehicular Activities) for maintenance and upgrades. Over 270 spacewalks have been conducted from the ISS, totaling more than 1,700 hours.",
		category: "missions",
		keywords: ["spacewalk", "eva", "outside", "maintenance", "space suit"],
	},
	{
		id: "kb-064",
		title: "Viewing the ISS with Telescopes",
		content:
			"While the ISS is easily visible to the naked eye, small telescopes or binoculars can reveal its structure, including the solar panels and truss. Tracking it requires smooth, fast movement.",
		category: "observation",
		keywords: [
			"telescope",
			"binoculars",
			"magnification",
			"detail",
			"see structure",
		],
	},
	{
		id: "kb-065",
		title: "ISS Temperature",
		content:
			"The ISS experiences extreme temperature swings from -157°C (-250°F) in shadow to 121°C (250°F) in direct sunlight. Internal habitable areas are maintained at comfortable room temperature.",
		category: "specifications",
		keywords: ["temperature", "hot", "cold", "climate", "heat"],
	},
	{
		id: "kb-066",
		title: "ISS Communication",
		content:
			"The ISS communicates with Earth using radio systems and the Tracking and Data Relay Satellite System (TDRSS). High-speed data rates up to 300 Mbps allow for live video streaming.",
		category: "specifications",
		keywords: ["communication", "radio", "data", "contact", "internet"],
	},
	{
		id: "kb-067",
		title: "ISS Exercise Equipment",
		content:
			"Astronauts must exercise 2 hours daily to combat muscle and bone loss in microgravity. Equipment includes a treadmill (COLBERT), stationary bike (CEVIS), and resistance exercise device (ARED).",
		category: "crew",
		keywords: ["exercise", "workout", "fitness", "treadmill", "health"],
	},
	{
		id: "kb-068",
		title: "ISS Food and Water",
		content:
			"Astronauts eat pre-packaged meals including freeze-dried and thermostabilized foods. Water is recycled from humidity, sweat, and urine, achieving 93% recycling efficiency.",
		category: "crew",
		keywords: ["food", "water", "eat", "drink", "meals", "diet"],
	},
	{
		id: "kb-069",
		title: "ISS Sleep Schedules",
		content:
			"Astronauts follow a schedule based on GMT (Greenwich Mean Time) and get about 8.5 hours of sleep per 'day'. They sleep in sleeping bags attached to walls in small crew quarters.",
		category: "crew",
		keywords: ["sleep", "schedule", "rest", "sleeping bags", "quarters"],
	},
	{
		id: "kb-070",
		title: "ISS vs Other Objects",
		content:
			"The ISS is the third brightest object in the sky after the Sun and Moon. It's much brighter than any star or planet, making it unmistakable when it passes overhead.",
		category: "observation",
		keywords: ["brightest", "compare", "third brightest", "sun", "moon"],
	},
];
