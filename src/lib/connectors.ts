/** Browser-safe connector catalog. No connector is live yet: statuses must never claim "connected" without a verified backend adapter. */
export type ConnectorStatus = "not-configured" | "setup-required" | "connected" | "unsupported";
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
}

export const STATUS_LABEL: Record<ConnectorStatus, string> = {
  "not-configured": "Not configured",
  "setup-required": "Setup required",
  connected: "Connected",
  unsupported: "Unsupported",
};

const SECRET_NOTE = "Keys are entered only on your own computer or a secure settings screen — never in chat.";

export const CONNECTORS: Connector[] = [
  {
    id: "codex-cli", group: "AI agents", name: "Codex CLI", status: "setup-required", adapterAvailable: false,
    summary: "Coding agent that would run on your paired Mac through an approved helper.",
    blocker: "Can't run in the browser terminal. The Mac app passed sandbox tests only (not yet on your own Mac); the add-on that runs this agent inside it isn't built.",
    scopes: ["Chosen project folder only", "Proposed commands shown for your approval"],
    never: ["Whole-disk access", "Admin privileges", "Running without your approval"],
    steps: ["Pass QuickConnect on your Mac", "Install Codex CLI on the Mac yourself and sign in there", "Pick one project folder", "Run a connection test"],
  },
  {
    id: "claude-code-cli", group: "AI agents", name: "Claude Code CLI", status: "setup-required", adapterAvailable: false,
    summary: "Coding agent that would run on your paired Mac through an approved helper.",
    blocker: "Can't run in the browser terminal. The Mac app passed sandbox tests only (not yet on your own Mac); the add-on that runs this agent inside it isn't built.",
    scopes: ["Chosen project folder only", "Proposed commands shown for your approval"],
    never: ["Whole-disk access", "Admin privileges", "Running without your approval"],
    steps: ["Pass QuickConnect on your Mac", "Install Claude Code on the Mac yourself and sign in there", "Pick one project folder", "Run a connection test"],
  },
  {
    id: "perplexity", group: "AI agents", name: "Perplexity research", status: "not-configured", adapterAvailable: false,
    summary: "Research answers with sources. Research only — not a coding agent.",
    blocker: "No Perplexity connection has been chosen or approved yet.",
    scopes: ["Send a research question", "Receive cited answers"],
    never: ["Terminal access", "File editing", "Acting on your Mac"],
    steps: ["Owner approves a Perplexity connection", "Key is stored in secure backend settings", "Run a test question"],
  },
  {
    id: "gemini-api", group: "AI agents", name: "Google Gemini API", status: "not-configured", adapterAvailable: false,
    summary: "Optional Gemini answers and drafting through a server-side connection. Not a terminal agent.",
    blocker: "No Gemini connection has been approved or built yet.",
    scopes: ["Send a prompt you choose", "Receive text answers", "Your account only"],
    never: ["Terminal access", "File editing on your Mac", "Seeing other users' data"],
    steps: ["Owner approves a Gemini connection", "Key is stored in secure backend settings, never in chat", "Run a test prompt", "Disconnect any time"],
  },
  {
    id: "gemini-cli", group: "AI agents", name: "Gemini CLI", status: "setup-required", adapterAvailable: false,
    summary: "Coding agent that would run on your paired Mac through an approved helper.",
    blocker: "Can't run in the browser terminal. The Mac app passed sandbox tests only (not yet on your own Mac); the add-on that runs this agent inside it isn't built.",
    scopes: ["Chosen project folder only", "Proposed commands shown for your approval"],
    never: ["Whole-disk access", "Admin privileges", "Running without your approval"],
    steps: ["Pass QuickConnect on your Mac", "Install Gemini CLI on the Mac yourself and sign in there", "Pick one project folder", "Run a connection test"],
  },
  {
    id: "custom-mcp", group: "Custom MCP", name: "Custom MCP server", status: "not-configured", adapterAvailable: false,
    summary: "Connect a compatible AI tool using the Model Context Protocol.",
    blocker: "Needs agent sign-in for Honeycomb and your approval to publish, neither done yet.",
    scopes: ["List your approved computers", "Request a connection (you approve each one)"],
    never: ["Direct shell control", "Installing software", "Changing permissions"],
    steps: ["Enter the server address", "Choose allowed tools", "Approve on this device", "Run a connection test"],
  },
  {
    id: "custom-api", group: "Custom API", name: "Custom API", status: "not-configured", adapterAvailable: false,
    summary: "Your own service calling Honeycomb with a scoped, signed-in connection.",
    blocker: "Scoped API access and its activity log aren't built yet.",
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
  if (c.status === "connected" && !c.adapterAvailable) return "setup-required";
  return c.status;
}

export const CONNECTOR_SECRET_NOTE = SECRET_NOTE;
