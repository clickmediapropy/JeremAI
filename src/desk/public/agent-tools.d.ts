export interface CatalogStep {
  id: string;
  label: string;
  cli: string;
  purpose: string;
  runnable: boolean;
}

export interface AgentTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const STEP_CATALOG: CatalogStep[];
export const AGENT_STEPS: string[];
export const AGENT_RUNNABLE: string[];
export const AGENT_TOOLS: AgentTool[];
export const AGENT_TOOL_NAMES: string[];
