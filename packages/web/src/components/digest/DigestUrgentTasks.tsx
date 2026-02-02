import { NeuralCard } from "../ui/neural/NeuralCard";
import { formatDueDate } from "../../lib/dateUtils";

type DigestTask = {
  id: string;
  title: string;
  dueDate?: string | null;
};

type DigestUrgentTasksProps = {
  tasks: DigestTask[];
  onSelectTask?: (id: string) => void;
};

export function DigestUrgentTasks({ tasks, onSelectTask }: DigestUrgentTasksProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-white">Urgent Tasks</h3>
      <div className="space-y-3">
        {tasks.map((task) => {
          const due = formatDueDate(task.dueDate || null);
          return (
            <NeuralCard
              key={task.id}
              entityType="task"
              padding="md"
              onClick={onSelectTask ? () => onSelectTask(task.id) : undefined}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white">{task.title}</h4>
                </div>
                {due && (
                  <span className={`text-sm font-medium whitespace-nowrap ${due.color}`}>
                    {due.text}
                  </span>
                )}
              </div>
            </NeuralCard>
          );
        })}
      </div>
    </div>
  );
}
