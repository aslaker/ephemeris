/**
 * Knowledge Base Search
 *
 * Keyword-based search for ISS knowledge entries.
 * Feature: 007-observation-copilot
 */

import { KNOWLEDGE_BASE } from "./knowledge-data";
import type { KnowledgeEntry } from "./types";

/**
 * Search knowledge base using keyword matching
 * Returns entries sorted by relevance score
 */
export function searchKnowledgeBase(params: {
	query: string;
	maxResults?: number;
}): Array<KnowledgeEntry & { relevanceScore: number }> {
	const { query, maxResults = 3 } = params;
	const queryLower = query.toLowerCase();
	const queryWords = queryLower.split(/\s+/);

	// Score each entry based on keyword matches
	const scored = KNOWLEDGE_BASE.map((entry) => {
		let score = 0;

		// Check title match (highest weight)
		if (entry.title.toLowerCase().includes(queryLower)) {
			score += 10;
		}

		// Check content match
		if (entry.content.toLowerCase().includes(queryLower)) {
			score += 5;
		}

		// Check keyword matches
		for (const keyword of entry.keywords) {
			if (queryLower.includes(keyword.toLowerCase())) {
				score += 3;
			}
			// Check individual query words
			for (const word of queryWords) {
				if (keyword.toLowerCase().includes(word)) {
					score += 1;
				}
			}
		}

		return {
			...entry,
			relevanceScore: score,
		};
	}).filter((entry) => entry.relevanceScore > 0);

	// Sort by relevance score (descending)
	scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

	// Return top results
	return scored.slice(0, maxResults);
}
