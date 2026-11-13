import { createLogger } from '@nextnode-solutions/logger'

import type { Logger } from '@nextnode-solutions/logger'

export const callerLoggerOrSilent = (logger: Logger | undefined): Logger =>
	logger ?? createLogger({ silent: true })
