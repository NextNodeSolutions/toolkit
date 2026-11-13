import { fail } from '../types/result.js'

import { createProviderUtils } from './base.js'

import type { Logger } from '@nextnode-solutions/logger'
import type { Attachment, CreateEmailOptions, Resend } from 'resend'
import type { EmailMessage } from '../types/email.js'
import type { EmailProvider } from '../types/provider.js'
import type { EmailError, SendResult } from '../types/result.js'

const HTTP_VALIDATION_ERROR = 422
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_RATE_LIMIT = 429

const RESEND_ERROR_RULES: ReadonlyArray<{
	needles: string[]
	code: EmailError['code']
	message: string | null
}> = [
	{
		needles: ['rate limit', String(HTTP_RATE_LIMIT)],
		code: 'RATE_LIMIT_ERROR',
		message: 'Rate limit exceeded',
	},
	{
		needles: [
			'unauthorized',
			'api key',
			String(HTTP_UNAUTHORIZED),
			String(HTTP_FORBIDDEN),
		],
		code: 'AUTHENTICATION_ERROR',
		message: 'Invalid API key or unauthorized',
	},
	{
		needles: ['validation', String(HTTP_VALIDATION_ERROR)],
		code: 'VALIDATION_ERROR',
		message: null,
	},
	{
		needles: ['network', 'econnrefused', 'timeout', 'fetch'],
		code: 'NETWORK_ERROR',
		message: null,
	},
]

const mapResendError = (error: unknown): EmailError => {
	if (!(error instanceof Error)) {
		return {
			code: 'UNKNOWN_ERROR',
			message: 'An unknown error occurred',
			provider: 'resend',
			originalError: error,
		}
	}

	const message = error.message.toLowerCase()
	const matched = RESEND_ERROR_RULES.find(rule =>
		rule.needles.some(needle => message.includes(needle)),
	)

	return {
		code: matched?.code ?? 'PROVIDER_ERROR',
		message: matched?.message ?? error.message,
		provider: 'resend',
		originalError: error,
	}
}

const mapOptionalContent = (
	message: EmailMessage,
): { text?: string; attachments?: Attachment[] } => ({
	...(message.text && { text: message.text }),
	...(message.attachments && {
		attachments: message.attachments.map((a): Attachment => ({
			filename: a.filename,
			content: a.content,
			...(a.contentType && { contentType: a.contentType }),
		})),
	}),
})

const mapOptionalMetadata = (
	message: EmailMessage,
): {
	headers?: Record<string, string>
	tags?: Array<{ name: string; value: string }>
	scheduledAt?: string
} => ({
	...(message.headers && {
		headers: Object.fromEntries(
			message.headers.map(h => [h.name, h.value]),
		),
	}),
	...(message.tags && {
		tags: message.tags.map(t => ({
			name: t.name,
			value: t.value,
		})),
	}),
	...(message.scheduledAt && {
		scheduledAt:
			message.scheduledAt instanceof Date
				? message.scheduledAt.toISOString()
				: message.scheduledAt,
	}),
})

type ProviderUtils = ReturnType<typeof createProviderUtils>

type ResendReply = {
	data: unknown
	error: { message: string; name?: string } | null
}

const RESEND_ERROR_NAME_CODES: ReadonlyMap<string, EmailError['code']> =
	new Map([
		['validation_error', 'VALIDATION_ERROR'],
		['missing_required_field', 'VALIDATION_ERROR'],
		['invalid_parameter', 'VALIDATION_ERROR'],
		['invalid_attachment', 'VALIDATION_ERROR'],
		['invalid_from_address', 'VALIDATION_ERROR'],
		['missing_api_key', 'AUTHENTICATION_ERROR'],
		['invalid_api_key', 'AUTHENTICATION_ERROR'],
		['restricted_api_key', 'AUTHENTICATION_ERROR'],
		['rate_limit_exceeded', 'RATE_LIMIT_ERROR'],
	])

const mapResendReplyError = (
	error: NonNullable<ResendReply['error']>,
): EmailError => {
	const mapped = mapResendError(new Error(error.message))
	const namedCode =
		typeof error.name === 'string'
			? RESEND_ERROR_NAME_CODES.get(error.name)
			: undefined
	return namedCode ? { ...mapped, code: namedCode } : mapped
}

const sentMessageIdOf = (sentEmail: unknown): string | null => {
	if (
		typeof sentEmail !== 'object' ||
		sentEmail === null ||
		!('id' in sentEmail) ||
		typeof sentEmail.id !== 'string'
	) {
		return null
	}
	return sentEmail.id
}

const mapOptionalRecipients = (
	message: EmailMessage,
	utils: ProviderUtils,
): { cc?: string[]; bcc?: string[]; replyTo?: string[] } => ({
	...(message.cc && {
		cc: utils.normalizeRecipients(message.cc),
	}),
	...(message.bcc && {
		bcc: utils.normalizeRecipients(message.bcc),
	}),
	...(message.replyTo && {
		replyTo: utils.normalizeRecipients(message.replyTo),
	}),
})

const mapToResendPayload = (
	message: EmailMessage,
	utils: ProviderUtils,
): CreateEmailOptions => ({
	from: utils.normalizeRecipient(message.from),
	to: utils.normalizeRecipients(message.to),
	subject: message.subject,
	html: message.html,
	...mapOptionalRecipients(message, utils),
	...mapOptionalContent(message),
	...mapOptionalMetadata(message),
})

const errorMessageOf = (error: unknown): string =>
	error instanceof Error ? error.message : 'unknown'

const sendViaResend = async (
	deps: { resendClient: Resend; logger: Logger; utils: ProviderUtils },
	message: EmailMessage,
): Promise<SendResult> => {
	const { resendClient, logger, utils } = deps

	const validation = utils.validateMessage(message)
	if (!validation.success) {
		return validation
	}

	logger.debug('Sending email via Resend', {
		details: {
			recipientCount: Array.isArray(message.to) ? message.to.length : 1,
		},
	})

	try {
		const payload = mapToResendPayload(message, utils)
		const { data, error }: ResendReply =
			await resendClient.emails.send(payload)

		if (error) {
			logger.error('Resend API returned error', {
				details: { errorMessage: error.message },
			})
			return fail(mapResendReplyError(error))
		}

		const messageId = sentMessageIdOf(data)
		if (messageId === null) {
			logger.error('No data returned from Resend')
			return fail({
				code: 'PROVIDER_ERROR',
				message: 'No data returned from Resend',
				provider: 'resend',
			})
		}

		logger.info('Email sent successfully', {
			details: { messageId },
		})

		return {
			success: true,
			data: { id: messageId, provider: 'resend', sentAt: new Date() },
		}
	} catch (error) {
		logger.error('Resend send failed', {
			details: { error: errorMessageOf(error) },
		})
		return fail(mapResendError(error))
	}
}

export const createResendProvider = (
	resendClient: Resend,
	logger: Logger,
): EmailProvider => {
	const utils = createProviderUtils('resend')

	return {
		name: 'resend',

		send: (message: EmailMessage): Promise<SendResult> =>
			sendViaResend({ resendClient, logger, utils }, message),

		async validateConfig(): Promise<boolean> {
			try {
				const { error }: ResendReply = await resendClient.domains.list()
				if (error) {
					logger.error('Resend validateConfig failed', {
						details: { error: error.message },
					})
					return false
				}
				return true
			} catch (error) {
				logger.error('Resend validateConfig failed', {
					details: { error: errorMessageOf(error) },
				})
				return false
			}
		},
	}
}
