import { NeuralCard } from "../ui/neural/NeuralCard";
import type { Task } from "../../lib/api";
import { formatDueDate } from "../../lib/dateUtils";

type BrowseTaskListProps = {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
};

export function BrowseTaskList({ tasks, onSelectTask }: BrowseTaskListProps) {
  if (tasks.length === 0) {
    return <div className="text-sm text-slate-400">No tasks to show.</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const due = formatDueDate(task.dueDate);
        return (
          <NeuralCard
            key={task.id}
            entityType="task"
            padding="md"
            onClick={onSelectTask ? () => onSelectTask(task) : undefined}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{task.title}</div>
                {task.nextAction && (
                  <div className="text-sm text-slate-400 mt-1">{task.nextAction}</div>
                )}
              </div>
              {due && (
                <span className={`text-xs font-medium whitespace-nowrap ${due.color}`}>
                  {due.text}
                </span>
              )}
            </div>
          </NeuralCard>
        );
      })}
    </div>
  );
}
