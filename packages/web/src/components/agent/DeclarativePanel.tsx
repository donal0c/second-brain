import type { AgentDeclarativeAction, AgentState } from "../../hooks/useAgent";

type DeclarativePanelProps = {
  state: AgentState;
  onAction?: (action: AgentDeclarativeAction) => void;
};

function actionButtonClass(kind: AgentDeclarativeAction["kind"]): string {
  if (kind === "primary") {
    return "px-3 py-1.5 text-sm rounded-lg bg-neural-pulse-500/30 text-neural-pulse-200 border border-neural-pulse-400/40 hover:bg-neural-pulse-500/40 transition-colors";
  }
  return "px-3 py-1.5 text-sm rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition-colors";
}

export function DeclarativePanel({ state, onAction }: DeclarativePanelProps) {
  const ui = state.ui;
  if (!ui || !Array.isArray(ui.blocks) || ui.blocks.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-neural p-4 border border-neural-memory-500/20 space-y-3">
      {ui.title && (
        <div className="text-xs uppercase tracking-wide text-neural-memory-400">{ui.title}</div>
      )}

      {ui.blocks.map((block, index) => {
        if (block.type === "card") {
          return (
            <div key={`card-${index}`} className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-3">
              <div className="text-sm font-medium text-white">{block.title}</div>
              {block.body && <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{block.body}</p>}
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <div key={`list-${index}`} className="space-y-2">
              {block.title && <div className="text-sm font-medium text-slate-200">{block.title}</div>}
              <ul className="space-y-1.5">
                {block.items.map((item, itemIndex) => (
                  <li key={`item-${itemIndex}`} className="text-sm text-slate-200 flex gap-2">
                    <span className="text-neural-memory-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === "actions") {
          return (
            <div key={`actions-${index}`} className="space-y-2">
              {block.title && <div className="text-sm font-medium text-slate-200">{block.title}</div>}
              <div className="flex flex-wrap gap-2">
                {block.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onAction?.(action)}
                    className={actionButtonClass(action.kind)}
                    type="button"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={`notice-${index}`} className="text-sm text-slate-300 bg-slate-900/30 rounded-lg p-3 border border-slate-700/40">
            {block.text}
          </div>
        );
      })}
    </div>
  );
}
