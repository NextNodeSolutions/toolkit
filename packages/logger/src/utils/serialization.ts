/**
 * Serialization utilities for NextNode Logger
 * Zero dependencies, using only Node.js built-in modules
 */

// Centralized string conversion for special types
const typeToString = (subject: unknown): string | undefined => {
	if (subject === null) return 'null'
	if (typeof subject === 'undefined') return 'undefined'
	if (typeof subject === 'function')
		return `[Function: ${subject.name || 'anonymous'}]`
	if (typeof subject === 'symbol') return subject.toString()
	if (typeof subject === 'bigint') return subject.toString()
	return undefined
}

type JsonReplacer = (this: unknown, key: string, field: unknown) => unknown

const errorFields = (error: Error): Record<string, string> => ({
	name: error.name,
	message: error.message,
	...(error.stack && { stack: error.stack }),
})

// Only an ancestor is a cycle: a shared reference elsewhere in the tree is serialized again.
export const createCycleSafeReplacer = (): JsonReplacer => {
	const ancestors: unknown[] = []
	return function cycleSafe(this: unknown, _key, field) {
		if (typeof field !== 'object' || field === null) return field
		while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop()
		if (ancestors.includes(field)) return '[Circular Reference]'
		const replacement = field instanceof Error ? errorFields(field) : field
		ancestors.push(replacement)
		return replacement
	}
}

export const safeStringify = (subject: unknown): string => {
	try {
		// Fast path for primitives
		const primitiveString = typeToString(subject)
		if (typeof primitiveString !== 'undefined') return primitiveString

		// Direct string conversion for simple types
		if (typeof subject === 'string') return subject
		if (typeof subject === 'number' || typeof subject === 'boolean') {
			return String(subject)
		}

		const cycleSafe = createCycleSafeReplacer()

		const replacer: JsonReplacer = function special(
			this: unknown,
			key,
			val,
		) {
			return cycleSafe.call(this, key, typeToString(val) ?? val)
		}

		return JSON.stringify(subject, replacer, 2)
	} catch (error) {
		// Business rule: logger internals MUST NOT log through the logger
		// (would recurse through the same serialization path). Embedding
		// the error message in the returned string still surfaces the
		// failure reason in whichever log line triggered serialization.
		return `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`
	}
}
