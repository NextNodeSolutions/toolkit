/**
 * JSON formatter for NextNode Logger
 * Produces structured JSON output for production/log aggregation systems
 */

import { createCycleSafeReplacer } from '../utils/serialization.js'

import type { LogEntry } from '../types.js'

/**
 * Keys that are filtered out during object flattening to prevent
 * prototype pollution attacks.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const ENTRY_KEYS = new Set([
	'level',
	'message',
	'timestamp',
	'location',
	'requestId',
	'scope',
])

export interface JsonLogOutput {
	level: string
	message: string
	timestamp: string
	location: {
		function: string
		file?: string
		line?: number
	}
	requestId: string
	scope?: string
	[key: string]: unknown
}

/**
 * Builds the JSON output object from a log entry.
 * - Flattens object properties into root level for easier querying
 * - Filters out dangerous keys to prevent prototype pollution
 */
/**
 * Returns a log object's safe properties, skipping undefined values and
 * prototype-pollution-prone keys, ready to be flattened onto the output.
 */
const safeObjectEntries = (
	object: NonNullable<LogEntry['object']>,
): Record<string, unknown> => {
	const safe: Record<string, unknown> = {}
	for (const [key, fieldValue] of Object.entries(object)) {
		if (
			typeof fieldValue === 'undefined' ||
			DANGEROUS_KEYS.has(key) ||
			ENTRY_KEYS.has(key)
		)
			continue
		safe[key] = fieldValue
	}
	return safe
}

const buildJsonOutput = (entry: LogEntry): JsonLogOutput => {
	const { level, message, timestamp, location, requestId, scope, object } =
		entry

	return {
		level,
		message,
		timestamp,
		location,
		requestId,
		...(scope && { scope }),
		...(object && safeObjectEntries(object)),
	}
}

/**
 * Formats a log entry as structured JSON.
 * - Omits undefined/null optional fields for cleaner output
 * - Flattens object properties into root level for easier querying
 * - Produces single-line JSON optimized for log aggregation
 */
export const formatAsJson = (entry: LogEntry): string =>
	JSON.stringify(buildJsonOutput(entry), createCycleSafeReplacer())

/**
 * Formats a log entry as pretty-printed JSON.
 * Useful for debugging and development with structured output.
 */
export const formatAsJsonPretty = (entry: LogEntry): string =>
	JSON.stringify(buildJsonOutput(entry), createCycleSafeReplacer(), 2)
