/**
 * OCGS hooks for Pi and oh-my-pi: the 12 CCGS hooks listed in README.md ("Hooks Mapping").
 * Logic lives in ./core. Each harness emits only some of the events below; a handler for
 * an event the running harness never emits simply never fires.
 *   Pi:  agent_settled, session_compact (context fallback), ui_prompt_start
 *   omp: session_stop, session.compacting (context into the summary), tool_approval_requested
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	buildCompactionContext,
	detectPushToProtected,
	detectSkillChange,
	editedPaths,
	getAgentType,
	git,
	handleDetectGaps,
	handleLogAgent,
	handleLogAgentStop,
	handlePostCompact,
	handleSessionCreated,
	handleSessionIdle,
	isBashTool,
	isGitRepo,
	isTaskTool,
	logAudit,
	logCompactionEvent,
	normalizePath,
	showNotification,
	validateAssetPath,
	validateCommitFiles,
} from "./core";

interface HookContext {
	cwd?: string;
	hasUI?: boolean;
	ui?: { notify(message: string, type?: "info" | "warning" | "error"): void };
	agent?: { kind?: string };
}

interface ContentBlock {
	type: "text";
	text: string;
}

interface ToolCallEvent {
	toolName: string;
	input?: Record<string, unknown>;
}

interface ToolResultEvent extends ToolCallEvent {
	content: ContentBlock[] | string;
	isError: boolean;
}

/** The subset of the Pi/omp ExtensionAPI this extension uses. omp's event map is not in Pi's typings. */
interface HookRegistrar {
	on<E>(event: string, handler: (event: E, ctx: HookContext) => unknown): void;
	sendMessage(message: { customType: string; content: string; display: boolean }): void;
}

/** Every handler resolves the project from the event's cwd. The fallback is shared, so it stays a named function. */
function rootOf(ctx: HookContext): string {
	return ctx.cwd || process.cwd();
}

/** Hook failures are recorded, never thrown: omp fails closed on tool_call errors. */
function reportError(root: string, label: string, error: unknown): void {
	logAudit(root, `ERROR in ${label}: ${String(error)}`);
}

/** Returns the reason to block a bash command, or undefined to allow it. */
function checkBashCommand(root: string, command: string, ctx: HookContext): string | undefined {
	if (!isGitRepo(root)) return undefined;

	if (/^git\s+push/.test(command)) {
		const matched = detectPushToProtected(command, git(root, "rev-parse", "--abbrev-ref", "HEAD"));
		if (matched) {
			const message = `Push to protected branch '${matched}' detected.`;
			logAudit(root, message);
			logAudit(root, "Reminder: Ensure build passes, unit tests pass, and no S1/S2 bugs exist.");
			if (ctx.hasUI) ctx.ui?.notify(`${message} Ensure build and tests pass first.`, "warning");
		}
		return undefined;
	}

	if (!/^git\s+commit/.test(command)) return undefined;

	const staged = git(root, "diff", "--cached", "--name-only");
	if (!staged) return undefined;

	const result = validateCommitFiles(root, staged.split("\n"));
	for (const warning of result.warnings) logAudit(root, warning);
	if (result.errors.length > 0) {
		for (const error of result.errors) logAudit(root, `Commit blocked: ${error}`);
		return result.errors.join("\n");
	}
	if (result.warnings.length > 0 && ctx.hasUI) ctx.ui?.notify(result.warnings.join("\n"), "warning");
	return undefined;
}

/** Asset and skill checks for a completed write or edit. Errors are appended to the tool result. */
function checkEditedFiles(root: string, event: ToolResultEvent): { content: ContentBlock[] } | undefined {
	const errors: string[] = [];
	for (const filePath of editedPaths(event.toolName, event.input ?? {})) {
		const asset = validateAssetPath(root, filePath);
		for (const warning of asset.warnings) logAudit(root, warning);
		if (asset.warnings.length > 0) logAudit(root, "(Warnings are advisory. Fix before final commit.)");
		for (const error of asset.errors) {
			logAudit(root, error);
			errors.push(error);
		}

		const skill = detectSkillChange(normalizePath(filePath));
		if (skill) {
			logAudit(root, `=== Skill Modified: ${skill} ===`);
			logAudit(root, `Run /skill-test static ${skill} to validate structural compliance.`);
		}
	}

	if (errors.length === 0) return undefined;
	const existing: ContentBlock[] = Array.isArray(event.content)
		? event.content
		: [{ type: "text", text: String(event.content) }];
	return {
		content: [
			...existing,
			{ type: "text", text: "Asset validation failed. Fix errors before proceeding." },
			...errors.map((text): ContentBlock => ({ type: "text", text })),
		],
	};
}

export default function ocgsHooks(pi: ExtensionAPI): void {
	const api = pi as unknown as HookRegistrar;
	// Set when omp's session.compacting has already placed the context in the summary, so
	// session_compact does not send it a second time. Pi never emits session.compacting.
	let contextInjectedBeforeCompaction = false;
	logAudit(process.cwd(), "Plugin loaded");

	// 1. session-start.sh + detect-gaps.sh
	api.on("session_start", (_event: unknown, ctx: HookContext) => {
		if (ctx.agent?.kind === "sub") return undefined;
		const root = rootOf(ctx);
		try {
			const summary = handleSessionCreated(root);
			const gaps = handleDetectGaps(root);
			for (const gap of gaps) logAudit(root, gap);
			if (ctx.hasUI) {
				if (summary) ctx.ui?.notify(summary, "info");
				if (gaps.length > 0) ctx.ui?.notify(gaps.join("\n"), "warning");
			}
		} catch (error) {
			reportError(root, "session_start", error);
		}
		return undefined;
	});

	// 2. session-stop.sh: Pi emits agent_settled after each run; omp emits session_stop.
	const archiveSessionState = (_event: unknown, ctx: HookContext) => {
		if (ctx.agent?.kind === "sub") return undefined;
		const root = rootOf(ctx);
		try {
			handleSessionIdle(root);
		} catch (error) {
			reportError(root, "session_idle", error);
		}
		return undefined;
	};
	api.on("agent_settled", archiveSessionState);
	api.on("session_stop", archiveSessionState);

	// 10. pre-compact.sh: audit every compaction, before it runs (both harnesses).
	api.on("session_before_compact", (_event: unknown, ctx: HookContext) => {
		const root = rootOf(ctx);
		try {
			logCompactionEvent(root);
		} catch (error) {
			reportError(root, "session_before_compact", error);
		}
		return undefined;
	});

	// 10. pre-compact.sh on omp: the context enters the compaction summary itself.
	api.on("session.compacting", (_event: unknown, ctx: HookContext) => {
		if (ctx.agent?.kind === "sub") return undefined;
		const root = rootOf(ctx);
		try {
			const context = buildCompactionContext(root);
			contextInjectedBeforeCompaction = true;
			return { context: [context] };
		} catch (error) {
			reportError(root, "session.compacting", error);
			return undefined;
		}
	});

	// 10 + 11. pre-compact.sh context (Pi fallback) and post-compact.sh restore notice.
	api.on("session_compact", (_event: unknown, ctx: HookContext) => {
		if (ctx.agent?.kind === "sub") return undefined;
		const root = rootOf(ctx);
		const alreadyInjected = contextInjectedBeforeCompaction;
		contextInjectedBeforeCompaction = false;
		try {
			if (!alreadyInjected) {
				api.sendMessage({
					customType: "ocgs-compaction-context",
					content: buildCompactionContext(root),
					display: false,
				});
			}
			const message = handlePostCompact(root);
			logAudit(root, `Post-compact: ${message}`);
			if (ctx.hasUI) ctx.ui?.notify(message, "info");
		} catch (error) {
			reportError(root, "session_compact", error);
		}
		return undefined;
	});

	// 4, 7, 8. log-agent.sh (task start), validate-commit.sh, validate-push.sh (bash)
	api.on("tool_call", (event: ToolCallEvent, ctx: HookContext) => {
		const root = rootOf(ctx);
		try {
			const input = event.input ?? {};
			if (isBashTool(event.toolName) && typeof input.command === "string") {
				const reason = checkBashCommand(root, input.command, ctx);
				if (reason) return { block: true, reason };
			}
			if (isTaskTool(event.toolName)) handleLogAgent(root, getAgentType(input));
		} catch (error) {
			reportError(root, "tool_call", error);
		}
		return undefined;
	});

	// 5, 6, 9. log-agent-stop.sh (task end), validate-assets.sh, validate-skill-change.sh (write/edit)
	api.on("tool_result", (event: ToolResultEvent, ctx: HookContext) => {
		if (event.isError) return undefined;
		const root = rootOf(ctx);
		try {
			if (isTaskTool(event.toolName)) {
				handleLogAgentStop(root, getAgentType(event.input ?? {}));
				return undefined;
			}
			return checkEditedFiles(root, event);
		} catch (error) {
			reportError(root, "tool_result", error);
			return undefined;
		}
	});

	// 12. notify.sh: Pi raises ui_prompt_start, omp raises tool_approval_requested, when the agent waits on the user.
	const awaitingInput = (): undefined => {
		showNotification("OCGS: the agent is waiting for your input");
		return undefined;
	};
	api.on("ui_prompt_start", awaitingInput);
	api.on("tool_approval_requested", awaitingInput);
}
