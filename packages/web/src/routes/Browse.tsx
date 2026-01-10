import { useState } from "react";
import {
  type Task,
  type Project,
  type Idea,
  type ApiError,
  type EntityType,
} from "../lib/api";
import {
  useTasks,
  useProjects,
  useIdeas,
  useUpdateTask,
  useUpdateProject,
  useUpdateIdea,
  useInterpretTask,
  useInterpretProject,
  useInterpretIdea,
  useFixEntity,
  useDeleteTask,
  useDeleteProject,
  useDeleteIdea,
} from "../lib/queries";

type TabType = "tasks" | "projects" | "ideas";
type EditingEntity =
  | { type: "task"; item: Task }
  | { type: "project"; item: Project }
  | { type: "idea"; item: Idea }
  | null;

export function Browse() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [editing, setEditing] = useState<EditingEntity>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch data with React Query
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const ideasQuery = useIdeas();

  // Mutations
  const updateTask = useUpdateTask();
  const updateProject = useUpdateProject();
  const updateIdea = useUpdateIdea();
  const interpretTask = useInterpretTask();
  const interpretProject = useInterpretProject();
  const interpretIdea = useInterpretIdea();
  const fixEntity = useFixEntity();
  const deleteTask = useDeleteTask();
  const deleteProject = useDeleteProject();
  const deleteIdea = useDeleteIdea();

  // Derive state from queries
  const taskList = tasksQuery.data?.items ?? [];
  const projectList = projectsQuery.data?.items ?? [];
  const ideaList = ideasQuery.data?.items ?? [];
  const loading = tasksQuery.isLoading || projectsQuery.isLoading || ideasQuery.isLoading;
  const error = tasksQuery.error || projectsQuery.error || ideasQuery.error;
  const saving =
    updateTask.isPending ||
    updateProject.isPending ||
    updateIdea.isPending ||
    interpretTask.isPending ||
    interpretProject.isPending ||
    interpretIdea.isPending ||
    fixEntity.isPending ||
    deleteTask.isPending ||
    deleteProject.isPending ||
    deleteIdea.isPending;

  const loadData = () => {
    tasksQuery.refetch();
    projectsQuery.refetch();
    ideasQuery.refetch();
  };

  const handleSave = async (data: Record<string, unknown>) => {
    if (!editing) return;

    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (editing.type === "task") {
        const updated = await updateTask.mutateAsync({ id: editing.item.id, data: data as Partial<Task> });
        setEditing({ type: "task", item: updated });
      } else if (editing.type === "project") {
        const updated = await updateProject.mutateAsync({ id: editing.item.id, data: data as Partial<Project> });
        setEditing({ type: "project", item: updated });
      } else if (editing.type === "idea") {
        const updated = await updateIdea.mutateAsync({ id: editing.item.id, data: data as Partial<Idea> });
        setEditing({ type: "idea", item: updated });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to save");
    }
  };

  const handleInterpret = async (instruction: string) => {
    if (!editing) return;

    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (editing.type === "task") {
        const result = await interpretTask.mutateAsync({ id: editing.item.id, instruction });
        setEditing({ type: "task", item: result.entity });
      } else if (editing.type === "project") {
        const result = await interpretProject.mutateAsync({ id: editing.item.id, instruction });
        setEditing({ type: "project", item: result.entity });
      } else if (editing.type === "idea") {
        const result = await interpretIdea.mutateAsync({ id: editing.item.id, instruction });
        setEditing({ type: "idea", item: result.entity });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to interpret");
    }
  };

  const handleFix = async (correction: string) => {
    if (!editing) return;

    setSaveError(null);
    setSaveSuccess(false);

    try {
      const entityTypeMap: Record<string, EntityType> = {
        task: "tasks",
        project: "projects",
        idea: "ideas",
      };

      const entityType = entityTypeMap[editing.type];
      const result = await fixEntity.mutateAsync({ entityType, id: editing.item.id, correction }) as { newEntity: Task | Project | Idea; oldEntity: Task | Project | Idea };

      // Update editing state with new entity
      const newEntity = result.newEntity;
      if ("title" in newEntity && "nextAction" in newEntity) {
        // It's a task
        setEditing({ type: "task", item: newEntity as Task });
      } else if ("name" in newEntity) {
        // It's a project
        setEditing({ type: "project", item: newEntity as Project });
      } else {
        // It's an idea
        setEditing({ type: "idea", item: newEntity as Idea });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to fix");
    }
  };

  const handleDelete = async () => {
    if (!editing) return;

    const entityName = editing.type === "task" ? editing.item.title :
                       editing.type === "project" ? editing.item.name :
                       editing.item.title;

    if (!window.confirm(`Are you sure you want to delete "${entityName}"?`)) {
      return;
    }

    setSaveError(null);

    try {
      if (editing.type === "task") {
        await deleteTask.mutateAsync(editing.item.id);
      } else if (editing.type === "project") {
        await deleteProject.mutateAsync(editing.item.id);
      } else if (editing.type === "idea") {
        await deleteIdea.mutateAsync(editing.item.id);
      }
      setEditing(null);
    } catch (err) {
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to delete");
    }
  };

  const tabs = [
    { id: "tasks" as const, label: "Tasks", count: taskList.length },
    { id: "projects" as const, label: "Projects", count: projectList.length },
    { id: "ideas" as const, label: "Ideas", count: ideaList.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Browse</h2>
        <button
          onClick={loadData}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {(error as unknown as ApiError).message || (error as unknown as ApiError).error || "Failed to load data"}
          <button onClick={loadData} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-3">
              {taskList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No tasks yet. Capture something to get started!
                </div>
              ) : (
                taskList.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setEditing({ type: "task", item: task })}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{task.nextAction}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === "active" ? "bg-green-100 text-green-700" :
                        task.status === "completed" ? "bg-gray-100 text-gray-600" :
                        task.status === "waiting" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    {task.context && (
                      <span className="mt-2 inline-block text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {task.context}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <div className="space-y-3">
              {projectList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No projects yet.
                </div>
              ) : (
                projectList.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setEditing({ type: "project", item: project })}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        {project.desiredOutcome && (
                          <p className="text-sm text-gray-600 mt-1">{project.desiredOutcome}</p>
                        )}
                        {project.nextAction && (
                          <p className="text-sm text-gray-500 mt-1">Next: {project.nextAction}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === "active" ? "bg-green-100 text-green-700" :
                        project.status === "completed" ? "bg-gray-100 text-gray-600" :
                        project.status === "on_hold" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Ideas Tab */}
          {activeTab === "ideas" && (
            <div className="space-y-3">
              {ideaList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No ideas yet.
                </div>
              ) : (
                ideaList.map((idea) => (
                  <div
                    key={idea.id}
                    onClick={() => setEditing({ type: "idea", item: idea })}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <h4 className="font-medium text-gray-900">{idea.title}</h4>
                    {idea.summary && (
                      <p className="text-sm text-gray-600 mt-1">{idea.summary}</p>
                    )}
                    {idea.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {idea.links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {new URL(link).hostname}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit {editing.type.charAt(0).toUpperCase() + editing.type.slice(1)}
                </h3>
                <button
                  onClick={() => {
                    setEditing(null);
                    setSaveError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                  Saved successfully!
                </div>
              )}

              {editing.type === "task" && (
                <TaskEditForm
                  task={editing.item}
                  onSave={handleSave}
                  onInterpret={handleInterpret}
                  onFix={handleFix}
                  onDelete={handleDelete}
                  onCancel={() => setEditing(null)}
                  saving={saving}
                />
              )}

              {editing.type === "project" && (
                <ProjectEditForm
                  project={editing.item}
                  onSave={handleSave}
                  onInterpret={handleInterpret}
                  onFix={handleFix}
                  onDelete={handleDelete}
                  onCancel={() => setEditing(null)}
                  saving={saving}
                />
              )}

              {editing.type === "idea" && (
                <IdeaEditForm
                  idea={editing.item}
                  onSave={handleSave}
                  onInterpret={handleInterpret}
                  onFix={handleFix}
                  onDelete={handleDelete}
                  onCancel={() => setEditing(null)}
                  saving={saving}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Edit Forms
// =============================================================================

function TaskEditForm({
  task,
  onSave,
  onInterpret,
  onFix,
  onDelete,
  onCancel,
  saving,
}: {
  task: Task;
  onSave: (data: Record<string, unknown>) => void;
  onInterpret: (instruction: string) => void;
  onFix: (correction: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [correction, setCorrection] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [nextAction, setNextAction] = useState(task.nextAction);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [context, setContext] = useState(task.context || "");
  const [status, setStatus] = useState(task.status);

  const handleQuickStatus = (newStatus: Task["status"]) => {
    onSave({ status: newStatus });
  };

  const handleInterpret = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
    }
  };

  const handleFix = (e: React.FormEvent) => {
    e.preventDefault();
    if (correction.trim()) {
      onFix(correction.trim());
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      nextAction,
      dueDate: dueDate || null,
      context: context || null,
      status,
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Buttons */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Status</label>
        <div className="flex gap-2">
          {(["completed", "waiting", "someday"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleQuickStatus(s)}
              disabled={saving || task.status === s}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                task.status === s
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : s === "completed"
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : s === "waiting"
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {s === "completed" ? "Complete" : s === "waiting" ? "Waiting" : "Someday"}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Move to September, change context to @phone"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !instruction.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            {saving ? "..." : "Update"}
          </button>
        </div>
      </form>

      {/* Fix/Correction (may change entity type) */}
      <form onSubmit={handleFix} className="border-t border-gray-200 pt-4">
        <label className="block text-xs font-medium text-orange-600 mb-2">
          Fix (can change entity type)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="e.g., This is actually a project, not a task"
            className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !correction.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "..." : "Fix"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Use this to make corrections that might change the entity type
        </p>
      </form>

      {/* Collapsible Manual Fields */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowAllFields(!showAllFields)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllFields ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAllFields ? "Hide all fields" : "Show all fields"}
        </button>

        {showAllFields && (
          <form onSubmit={handleManualSave} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context</label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., @home, @work, @phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              >
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="someday">Someday</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          disabled={saving}
        >
          Delete Task
        </button>
      </div>

      {/* Cancel */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          disabled={saving}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ProjectEditForm({
  project,
  onSave,
  onInterpret,
  onFix,
  onDelete,
  onCancel,
  saving,
}: {
  project: Project;
  onSave: (data: Record<string, unknown>) => void;
  onInterpret: (instruction: string) => void;
  onFix: (correction: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [correction, setCorrection] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [name, setName] = useState(project.name);
  const [desiredOutcome, setDesiredOutcome] = useState(project.desiredOutcome || "");
  const [nextAction, setNextAction] = useState(project.nextAction || "");
  const [status, setStatus] = useState(project.status);

  const handleQuickStatus = (newStatus: Project["status"]) => {
    onSave({ status: newStatus });
  };

  const handleInterpret = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
    }
  };

  const handleFix = (e: React.FormEvent) => {
    e.preventDefault();
    if (correction.trim()) {
      onFix(correction.trim());
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      desiredOutcome: desiredOutcome || null,
      nextAction: nextAction || null,
      status,
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Buttons */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Status</label>
        <div className="flex gap-2">
          {(["completed", "on_hold", "someday"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleQuickStatus(s)}
              disabled={saving || project.status === s}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                project.status === s
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : s === "completed"
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : s === "on_hold"
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {s === "completed" ? "Complete" : s === "on_hold" ? "On Hold" : "Someday"}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Change next action to review proposal"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !instruction.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            {saving ? "..." : "Update"}
          </button>
        </div>
      </form>

      {/* Fix/Correction (may change entity type) */}
      <form onSubmit={handleFix} className="border-t border-gray-200 pt-4">
        <label className="block text-xs font-medium text-orange-600 mb-2">
          Fix (can change entity type)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="e.g., This is actually a task, not a project"
            className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !correction.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "..." : "Fix"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Use this to make corrections that might change the entity type
        </p>
      </form>

      {/* Collapsible Manual Fields */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowAllFields(!showAllFields)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllFields ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAllFields ? "Hide all fields" : "Show all fields"}
        </button>

        {showAllFields && (
          <form onSubmit={handleManualSave} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desired Outcome</label>
              <textarea
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Project["status"])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="someday">Someday</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          disabled={saving}
        >
          Delete Project
        </button>
      </div>

      {/* Cancel */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          disabled={saving}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function IdeaEditForm({
  idea,
  onSave,
  onInterpret,
  onFix,
  onDelete,
  onCancel,
  saving,
}: {
  idea: Idea;
  onSave: (data: Record<string, unknown>) => void;
  onInterpret: (instruction: string) => void;
  onFix: (correction: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [correction, setCorrection] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [summary, setSummary] = useState(idea.summary || "");
  const [links, setLinks] = useState(idea.links.join("\n"));

  const handleInterpret = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
    }
  };

  const handleFix = (e: React.FormEvent) => {
    e.preventDefault();
    if (correction.trim()) {
      onFix(correction.trim());
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      summary: summary || null,
      links: links.split("\n").map((l) => l.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-4">
      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Add more detail to the summary"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !instruction.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            {saving ? "..." : "Update"}
          </button>
        </div>
      </form>

      {/* Fix/Correction (may change entity type) */}
      <form onSubmit={handleFix} className="border-t border-gray-200 pt-4">
        <label className="block text-xs font-medium text-orange-600 mb-2">
          Fix (can change entity type)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="e.g., This should be a project, not an idea"
            className="flex-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !correction.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "..." : "Fix"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Use this to make corrections that might change the entity type
        </p>
      </form>

      {/* Collapsible Manual Fields */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowAllFields(!showAllFields)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllFields ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAllFields ? "Hide all fields" : "Show all fields"}
        </button>

        {showAllFields && (
          <form onSubmit={handleManualSave} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Links (one per line)</label>
              <textarea
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                rows={3}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          disabled={saving}
        >
          Delete Idea
        </button>
      </div>

      {/* Cancel */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          disabled={saving}
        >
          Close
        </button>
      </div>
    </div>
  );
}
