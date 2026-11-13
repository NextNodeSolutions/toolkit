# Email manager

This scope owns template rendering and email-provider integration.

- **Keep sends and rendering inside the public success-or-error result contract.** Callers handle delivery failures as results. Provider creation may reject invalid setup before a send begins.
- **Keep provider SDK imports lazy at setup.** An unused optional provider must not prevent the library from loading.
- **Keep logging opt-in through an injected logger.** The library must remain silent unless its caller chooses a logger.
- **Validate untrusted provider replies at the provider boundary.** A successful TypeScript SDK type does not establish what a remote service actually returned.
