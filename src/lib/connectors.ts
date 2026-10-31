/** Browser-safe connector catalog. "ready"/"connected" require a verified server adapter (adapterAvailable). */
export type ConnectorStatus = "not-configured" | "setup-required" | "needs-authorization" | "not-built" | "ready" | "connected" | "unsupported";
export type ConnectorGroup = "AI agents" | "Custom MCP" | "Custom API" | "Websites & services";

export interface Connector {
  id: string;
  group: ConnectorGroup;
  name: string;
  summary: string;
  status: ConnectorStatus;
  /** Why it can't connect yet, shown to the user. */
  blocker: string;
  scopes: string[];
  /** Capabilities this connector will never receive. */
  never: string[];
  steps: string[];
  /** True only when a verified backend adapter exists. */
  adapterAvailable: boolean;
  /** Terminal command that exercises this connector, prefilled when opening the Terminal. */
  command?: string;
}

export const STATUS_LABEL: Record<ConnectorStatus, string> = {
  "not-configured": "Not configured",
  "setup-required": "Setup required",
  "needs-authorization": "Needs authorization",
  "not-built": "Not built",
  ready: "Works in Terminal",
  connected: "Connected",
  unsupported: "Unsupported",
};

const SECRET_NOTE = "Keys are entered only on your own computer or a secure settings screen — never in chat.";

export const CONNECTORS: Connector[] = [
  {
    id: "codex-cli", group: "AI agents", name: "Codex CLI", status: "not-built", adapterAvailable: false,
    summary: "Coding agent that would run on your paired Mac through an approved helper.",
    blocker: "This is a program that must run on a real computer. The browser terminal and the Honeycomb server can't start programs, and the Mac add-on that would run it isn't built. The Mac app itself has passed sandbox tests only, not on your Mac yet.",
    scopes: ["Chosen project folder only", "Proposed commands shown for your approval"],
    never: ["Whole-disk access", "Admin privileges", "Running without your approval"],
    steps: ["Pass QuickConnect on your Mac", "Install Codex CLI on the Mac yourself and sign in there", "Pick one project folder", "Run a connection test"],
  },
  {
    id: "claude-code-cli", group: "AI agents", name: "Claude Code CLI", status: "not-built", adapterAvailable: false,
    summary: "Coding agent that would run on your paired Mac through an approved helper.",
    blocker: "This is a program that must run on a real computer. The browser terminal and the Honeycomb server can't start programs, and the Mac add-on that would run it isn't built. The Mac app itself has passed sandbox tests only, not on your Mac yet.",
    scopes: ["Chosen project folder only", "Proposed commands shown for your approval"],
    never: ["Whole-disk access", "Admin privileges", "Running without your approval"],
    steps: ["Pass QuickConnect on your Mac", "Install Claude Code on the Mac yourself and sign in there", "Pick one project folder", "Run a connection test"],
  },
  {
    id: "perplexity", group: "AI agents", name: "Perplexity research", status: "needs-authorization", adapterAvailable: true, command: "ask perplexity ",
    summary: "Research answers with sources. Research only — not a coding agent.",
    blocker: "The Terminal command is built, but the owner hasn't created and linked a Perplexity connection yet. Until then it replies BLOCKED.",
    scopes: ["Send a research question", "Receive cited answers"],
    never: ["Terminal access", "File editing", "Acting on your Mac"],
    steps: ["Owner creates a Perplexity connection in Lovable Connectors (managed, or with their own pplx- key)", "Owner asks for it to be linked to Honeycomb", "In Terminal: ask perplexity <question>"],
  },
  {
    id: "gemini-api", group: "AI agents", name: "Google Gemini", status: "ready", adapterAvailable: true, command: "ask gemini ",
    summary: "Gemini answers inside Terminal, sent from the Honeycomb server with Lovable AI. No Google key needed.",
    blocker: "Uses Lovable AI credits. Gemini answers only; it can't run commands or edit files.",
    scopes: ["Send a prompt you choose", "Receive text answers", "Your account only"],
    never: ["Terminal access", "File editing on your Mac", "Seeing other users' data"],
    steps: ["Sign in", "Open Terminal", "Type: ask gemini <question>"],
  },
  {
    id: "claude-api", group: "AI agents", name: "Claude (API model)", status: "ready", adapterAvailable: true, command: "ask claude ",
    summary: "Claude answers inside Terminal through Lovable AI. This is the Claude model, not the Claude Code program.",
    blocker: "Uses Lovable AI credits. Answers only; it can't run commands or edit files.",
    scopes: ["Send a prompt you choose", "Receive text answers"],
    never: ["Terminal access", "File editing on your Mac"],
    steps: ["Sign in", "Open Terminal", "Type: ask claude <question>"],
  },
  {
    id: "openai-api", group: "AI agents", name: "OpenAI GPT (API model)", status: "ready", adapterAvailable: true, command: "ask openai ",
    summary: "OpenAI GPT answers inside Terminal through Lovable AI. This is not the Codex program.",
    blocker: "Uses Lovable AI credits. Answers only; it can't run commands or edit files.",
    scopes: ["Send a prompt you choose", "Receive text answers"],
    never: ["Terminal access", "File editing on your Mac"],
    steps: ["Sign in", "Open Terminal", "Type: ask openai <question>"],
  },
  {
    id: "gemini-cli", group: "AI agents", name: "Gemini CLI", status: "not-built", adapterAvailable: false,
    summary: "Coding agent that would run on your paired Mac through an approved helper.",
    blocker: "This is a program that must run on a real computer. The browser terminal and the Honeycomb server can't start programs, and the Mac add-on that would run it isn't built. The Mac app itself has passed sandbox tests only, not on your Mac yet.",
    scopes: ["Chosen project folder only", "Proposed commands shown for your approval"],
    never: ["Whole-disk access", "Admin privileges", "Running without your approval"],
    steps: ["Pass QuickConnect on your Mac", "Install Gemini CLI on the Mac yourself and sign in there", "Pick one project folder", "Run a connection test"],
  },
  {
    id: "custom-mcp", group: "Custom MCP", name: "Custom MCP server", status: "ready", adapterAvailable: true, command: "connect mcp https://",
    summary: "Connect a compatible AI tool using the Model Context Protocol.",
    blocker: "Terminal can test a public https MCP server (handshake only). Saved servers, sign-in tokens and calling tools aren't built yet.",
    scopes: ["List your approved computers", "Request a connection (you approve each one)"],
    never: ["Direct shell control", "Installing software", "Changing permissions"],
    steps: ["Enter the server address", "Choose allowed tools", "Approve on this device", "Run a connection test"],
  },
  {
    id: "custom-api", group: "Custom API", name: "Custom API", status: "ready", adapterAvailable: true, command: "connect api https://",
    summary: "Your own service calling Honeycomb with a scoped, signed-in connection.",
    blocker: "Terminal can send a test request to a public https address. Saved connections, keys and other services calling Honeycomb aren't built yet.",
    scopes: ["Read status of your own computers"],
    never: ["Other users' data", "Shell access", "Unlimited requests"],
    steps: ["Name the connection", "Pick allowed actions", "Create a revocable access grant", "Run a connection test"],
  },
  {
    id: "web-services", group: "Websites & services", name: "Website / service integration", status: "unsupported", adapterAvailable: false,
    summary: "Authorized sites and services you choose (for example, publishing).",
    blocker: "Not available yet. Honeycomb will never bypass a site's sign-in or security.",
    scopes: ["Only actions you approve on that service"],
    never: ["Storing your site passwords", "Final publish without your approval"],
    steps: ["Choose a supported service", "Sign in on that service yourself", "Approve each final action"],
  },
];

/** A connector may show Connected only with a verified adapter. */
export function effectiveStatus(c: Connector): ConnectorStatus {
  if ((c.status === "connected" || c.status === "ready") && !c.adapterAvailable) return "setup-required";
  return c.status;
}

export const CONNECTOR_SECRET_NOTE = SECRET_NOTE;
