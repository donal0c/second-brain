type UISpecSection = {
  id: string;
  type:
    | "alert"
    | "entity-card"
    | "entity-list"
    | "action-list"
    | "summary"
    | "chart"
    | "timeline"
    | "calendar"
    | "empty-state";
  title?: string;
  style?: "urgent" | "info" | "success" | "warning" | "neutral";
  data: Record<string, unknown>;
  actions?: Array<{ label: string; action: string; primary?: boolean }>;
};

type UISpec = {
  layout: "priority-focused" | "exploration" | "planning" | "review" | "minimal";
  sections: UISpecSection[];
  emphasis?: {
    urgency?: "low" | "medium" | "high";
    tone?: "actionable" | "reflective" | "celebratory" | "informational";
    density?: "compact" | "comfortable" | "spacious";
  };
};

type UISpecRendererProps = {
  spec: UISpec;
  renderSection: (section: UISpecSection) => React.ReactNode;
};

const layoutClasses: Record<UISpec["layout"], string> = {
  "priority-focused": "space-y-6",
  "exploration": "space-y-6",
  "planning": "space-y-6",
  "review": "space-y-6",
  "minimal": "space-y-4",
};

export function UISpecRenderer({ spec, renderSection }: UISpecRendererProps) {
  return (
    <div className={layoutClasses[spec.layout]} data-urgency={spec.emphasis?.urgency}>
      {spec.sections.map((section) => (
        <div key={section.id}>{renderSection(section)}</div>
      ))}
    </div>
  );
}

export type { UISpec, UISpecSection };
