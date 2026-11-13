/**
 * Forbid `as` type assertions except `as const`.
 *
 * `as` assertions bypass the type checker and hide type errors.
 * Use type guards, `satisfies`, or refine your types instead.
 */
export const noTypeAssertion = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `as` type assertions except `as const`',
		},
		messages: {
			noTypeAssertion:
				'Type assertion with `as` is forbidden. Use type guards, `satisfies`, or refine your types instead. Only `as const` is allowed.',
		},
		schema: [],
	},
	create(context) {
		const reportUnlessConst = node => {
			const { typeAnnotation } = node

			const isAsConst =
				typeAnnotation.type === 'TSTypeReference' &&
				typeAnnotation.typeName?.type === 'Identifier' &&
				typeAnnotation.typeName.name === 'const'

			if (isAsConst) {
				return
			}

			context.report({
				node,
				messageId: 'noTypeAssertion',
			})
		}

		return {
			TSAsExpression: reportUnlessConst,
			TSTypeAssertion: reportUnlessConst,
		}
	},
}
