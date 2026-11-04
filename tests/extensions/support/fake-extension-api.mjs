// Minimal ExtensionAPI stand-in for testing Node-only OCGS extensions.
// Records handlers per event type; emit() runs them in registration order and
// returns each handler's result. Tools and commands are recorded as no-ops.
export function createFakeExtensionApi() {
	const handlers = new Map();
	return {
		on(type, handler) {
			if (!handlers.has(type)) handlers.set(type, []);
			handlers.get(type).push(handler);
		},
		async emit(type, event, ctx) {
			const results = [];
			for (const handler of handlers.get(type) ?? []) {
				results.push(await handler(event, ctx));
			}
			return results;
		},
		registerTool() {},
		registerCommand() {},
	};
}
