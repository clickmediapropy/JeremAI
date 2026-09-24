// Shared by the desk server and the desk page. One source for what the agent may touch.

export const STEP_CATALOG = [
  { id: "set-up", label: "Set up", cli: "init", purpose: "Prepare this brand's library on this computer.", runnable: true },
  { id: "add-notes", label: "Add notes", cli: "brief", purpose: "Add the winning-ad notes the work starts from. Needs the notes file path.", runnable: true },
  { id: "find-footage", label: "Find footage", cli: "search-broll", purpose: "Search clips already on file before making a new one. Needs footage words.", runnable: true },
  { id: "write-script", label: "Write the script", cli: "script", purpose: "Draft a script and run the claims check. It is not approved.", runnable: true },
  { id: "approve-script", label: "Approve the script", cli: "script --approve", purpose: "A human reads the script and approves it. The agent never does this.", runnable: false },
  { id: "check-price", label: "Check the price", cli: "estimate", purpose: "Quote a clip. Nothing is charged. Needs seconds, backend, resolution.", runnable: true },
  { id: "make-clip", label: "Make the clip", cli: "generate", purpose: "Makes a practice clip. Refuses without --confirm. Only the human confirms, from the sheet.", runnable: false },
  { id: "rough-cut", label: "Build the rough cut", cli: "assemble", purpose: "Files for the editor. The ad is not posted.", runnable: true },
  { id: "spending", label: "See spending", cli: "cost", purpose: "What has been counted against the budget.", runnable: true },
  { id: "practice", label: "Practice run", cli: "demo", purpose: "The packaged path in its own library. It makes practice clips, so the human runs it.", runnable: false },
  { id: "keys", label: "Keys", cli: "", purpose: "Save API keys on this computer and copy install commands.", runnable: false },
];

export const AGENT_STEPS = STEP_CATALOG.map((step) => step.id);
export const AGENT_RUNNABLE = STEP_CATALOG.filter((step) => step.runnable).map((step) => step.id);

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "go_to_step",
      description: "Open a step on the desk so the person can see its blanks and keys.",
      parameters: {
        type: "object",
        properties: { step: { type: "string", enum: AGENT_STEPS } },
        required: ["step"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fill_blanks",
      description: "Type into the blanks of the open step. Only send the blanks you want to change.",
      parameters: {
        type: "object",
        properties: {
          notesPath: { type: "string", description: "Path to a notes file on this computer." },
          footage: { type: "string", description: "Everyday words for the clips to look for." },
          seconds: { type: "integer", minimum: 1, description: "Clip length in seconds." },
          backend: { type: "string", enum: ["runpod-h3", "fal-ai", "minimax-h3-api"] },
          resolution: { type: "string", enum: ["768P", "2K"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_step",
      description:
        "Press a step's key for the person. Only steps that spend nothing are allowed. The result sentence comes back.",
      parameters: {
        type: "object",
        properties: { step: { type: "string", enum: AGENT_RUNNABLE } },
        required: ["step"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_state",
      description: "Read the brand's fresh state: budget, library, notes, script, last clip.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export const AGENT_TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.function.name);
