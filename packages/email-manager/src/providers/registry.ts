import { createLogger } from '@nextnode-solutions/logger'

import { createResendProvider } from './resend.js'

import type { Logger } from '@nextnode-solutions/logger'
import type { EmailProvider, ProviderConfigMap } from '../types/provider.js'

async function initResend(
	config: unknown,
	logger: Logger,
): Promise<EmailProvider> {
	if (
		typeof config !== 'object' ||
		config === null ||
		!('apiKey' in config) ||
		typeof config.apiKey !== 'string' ||
		!config.apiKey.trim().length
	) {
		throw new Error('Resend API key is required and cannot be empty')
	}

	const resendModule = await import('resend').catch(() => {
		throw new Error(
			'The "resend" package is required to use the Resend provider. Install it with: pnpm add resend',
		)
	})

	const client = new resendModule.Resend(config.apiKey)
	return createResendProvider(client, logger)
}

export async function createProvider<K extends keyof ProviderConfigMap>(
	name: K,
	config: ProviderConfigMap[K],
	logger?: Logger,
): Promise<EmailProvider>
export async function createProvider(
	name: unknown,
	config: ProviderConfigMap[keyof ProviderConfigMap],
	logger?: Logger,
): Promise<EmailProvider> {
	if (name !== 'resend') {
		throw new Error(`Unknown provider: ${String(name)}`)
	}

	return initResend(config, logger ?? createLogger({ silent: true }))
}
