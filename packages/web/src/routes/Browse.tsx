import { useState, useEffect, useMemo, useCallback } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  extractErrorMessage,
  type Task,
  type Project,
  type Idea,
  type Person,
  type EntityType,
} from "../lib/api";
import {
  useTasks,
  useProjects,
  useIdeas,
  usePersons,
  useUpdateTask,
  useUpdateProject,
  useUpdateIdea,
  useUpdatePerson,
  useInterpretTask,
  useInterpretProject,
  useInterpretIdea,
  useInterpretPerson,
  useFixEntity,
  useReprocessEntity,
  useDeleteTask,
  useDeleteProject,
  useDeleteIdea,
  useDeletePerson,
} from "../lib/queries";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { TaskEditForm } from "../components/TaskEditForm";

type TabType = "tasks" | "projects" | "ideas" | "persons";
type PersonSortOption = "name-asc" | "name-desc" | "lastTouched-desc" | "lastTouched-asc";
type PersonFilter = "all" | "follow_up_needed" | "no_follow_up" | "recently_touched" | "stale";

// Sort and filter types
type TaskSortField = "dueDate" | "createdAt" | "title";
type ProjectSortField = "createdAt" | "name";
type SortDirection = "asc" | "desc";

interface TaskFilters {
  sort: TaskSortField;
  sortDir: SortDirection;
  status: Task["status"] | "all";
  search: string;
}

interface ProjectFilters {
  sort: ProjectSortField;
  sortDir: SortDirection;
  status: Project["status"] | "all";
  search: string;
}

// localStorage keys
const TASK_FILTERS_KEY = "browse_task_filters";
const PROJECT_FILTERS_KEY = "browse_project_filters";

// Default filters
const defaultTaskFilters: TaskFilters = {
  sort: "createdAt",
  sortDir: "desc",
  status: "all",
  search: "",
};

const defaultProjectFilters: ProjectFilters = {
  sort: "createdAt",
  sortDir: "desc",
  status: "all",
  search: "",
};

// Load filters from localStorage
function loadTaskFilters(): TaskFilters {
  try {
    const stored = localStorage.getItem(TASK_FILTERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultTaskFilters, ...parsed, search: "" }; // Don't persist search
    }
  } catch {
    // Ignore parse errors
  }
  return defaultTaskFilters;
}

function loadProjectFilters(): ProjectFilters {
  try {
    const stored = localStorage.getItem(PROJECT_FILTERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultProjectFilters, ...parsed, search: "" }; // Don't persist search
    }
  } catch {
    // Ignore parse errors
  }
  return defaultProjectFilters;
}

// Save filters to localStorage
function saveTaskFilters(filters: TaskFilters) {
  const { search, ...toSave } = filters; // Don't save search
  localStorage.setItem(TASK_FILTERS_KEY, JSON.stringify(toSave));
}

function saveProjectFilters(filters: ProjectFilters) {
  const { search, ...toSave } = filters; // Don't save search
  localStorage.setItem(PROJECT_FILTERS_KEY, JSON.stringify(toSave));
}
type EditingEntity =
  | { type: "task"; item: Task }
  | { type: "project"; item: Project }
  | { type: "idea"; item: Idea }
  | { type: "person"; item: Person }
  | null;

export function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [editing, setEditing] = useState<EditingEntity>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [personSort, setPersonSort] = useState<PersonSortOption>("name-asc");
  const [personFilter, setPersonFilter] = useState<PersonFilter>("all");

  // Filter state (loaded from localStorage)
  const [taskFilters, setTaskFilters] = useState<TaskFilters>(loadTaskFilters);
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(loadProjectFilters);

  // Persist filter changes (except search)
  const updateTaskFilters = useCallback((updates: Partial<TaskFilters>) => {
    setTaskFilters(prev => {
      const updated = { ...prev, ...updates };
      saveTaskFilters(updated);
      return updated;
    });
  }, []);

  const updateProjectFilters = useCallback((updates: Partial<ProjectFilters>) => {
    setProjectFilters(prev => {
      const updated = { ...prev, ...updates };
      saveProjectFilters(updated);
      return updated;
    });
  }, []);

  // Fetch data with React Query (includes built-in abort handling)
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const ideasQuery = useIdeas();
  const personsQuery = usePersons();

  // Mutations
  const updateTask = useUpdateTask();
  const updateProject = useUpdateProject();
  const updateIdea = useUpdateIdea();
  const updatePerson = useUpdatePerson();
  const interpretTask = useInterpretTask();
  const interpretProject = useInterpretProject();
  const interpretIdea = useInterpretIdea();
  const interpretPerson = useInterpretPerson();
  const fixEntity = useFixEntity();
  const reprocessEntity = useReprocessEntity();
  const deleteTask = useDeleteTask();
  const deleteProject = useDeleteProject();
  const deleteIdea = useDeleteIdea();
  const deletePerson = useDeletePerson();

  // Derive state from queries
  const rawTaskList = tasksQuery.data?.items ?? [];
  const rawProjectList = projectsQuery.data?.items ?? [];
  const ideaList = ideasQuery.data?.items ?? [];
  const personList = personsQuery.data?.items ?? [];

  // Filter person list based on selected filter
  const filteredPersonList = useMemo(() => {
    return personList.filter((person) => {
      if (personFilter === "all") return true;
      if (personFilter === "follow_up_needed") return !!person.followUpNextAction;
      if (personFilter === "no_follow_up") return !person.followUpNextAction;
      if (personFilter === "recently_touched") {
        if (!person.lastTouchedAt) return false;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(person.lastTouchedAt) >= weekAgo;
      }
      if (personFilter === "stale") {
        if (!person.lastTouchedAt) return true; // Never touched = stale
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return new Date(person.lastTouchedAt) < monthAgo;
      }
      return true;
    });
  }, [personList, personFilter]);

  // Sort filtered persons list based on selected sort option
  const sortedPersonList = useMemo(() => {
    const sorted = [...filteredPersonList];
    switch (personSort) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "lastTouched-desc":
        return sorted.sort((a, b) => {
          const dateA = a.lastTouchedAt ? new Date(a.lastTouchedAt).getTime() : 0;
          const dateB = b.lastTouchedAt ? new Date(b.lastTouchedAt).getTime() : 0;
          return dateB - dateA;
        });
      case "lastTouched-asc":
        return sorted.sort((a, b) => {
          const dateA = a.lastTouchedAt ? new Date(a.lastTouchedAt).getTime() : 0;
          const dateB = b.lastTouchedAt ? new Date(b.lastTouchedAt).getTime() : 0;
          return dateA - dateB;
        });
      default:
        return sorted;
    }
  }, [filteredPersonList, personSort]);

  const loading = tasksQuery.isLoading || projectsQuery.isLoading || ideasQuery.isLoading || personsQuery.isLoading;
  const error = tasksQuery.error || projectsQuery.error || ideasQuery.error || personsQuery.error;

  // Filter and sort tasks
  const taskList = useMemo(() => {
    let filtered = rawTaskList;

    // Status filter
    if (taskFilters.status !== "all") {
      filtered = filtered.filter(t => t.status === taskFilters.status);
    }

    // Search filter
    if (taskFilters.search.trim()) {
      const searchLower = taskFilters.search.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.nextAction.toLowerCase().includes(searchLower) ||
        (t.context && t.context.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (taskFilters.sort) {
        case "dueDate": {
          // Null dates go to the end
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        }
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return taskFilters.sortDir === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [rawTaskList, taskFilters]);

  // Filter and sort projects
  const projectList = useMemo(() => {
    let filtered = rawProjectList;

    // Status filter
    if (projectFilters.status !== "all") {
      filtered = filtered.filter(p => p.status === projectFilters.status);
    }

    // Search filter
    if (projectFilters.search.trim()) {
      const searchLower = projectFilters.search.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.desiredOutcome && p.desiredOutcome.toLowerCase().includes(searchLower)) ||
        (p.nextAction && p.nextAction.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (projectFilters.sort) {
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return projectFilters.sortDir === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [rawProjectList, projectFilters]);
  const saving =
    updateTask.isPending ||
    updateProject.isPending ||
    updateIdea.isPending ||
    updatePerson.isPending ||
    interpretTask.isPending ||
    interpretProject.isPending ||
    interpretIdea.isPending ||
    interpretPerson.isPending ||
    fixEntity.isPending ||
    reprocessEntity.isPending ||
    deleteTask.isPending ||
    deleteProject.isPending ||
    deleteIdea.isPending ||
    deletePerson.isPending;

  const loadData = () => {
    tasksQuery.refetch();
    projectsQuery.refetch();
    ideasQuery.refetch();
    personsQuery.refetch();
  };

  // Handle URL parameters for deep linking from search results
  useEffect(() => {
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id || loading) return;

    // Map search result type to tab type
    const typeToTab: Record<string, TabType> = {
      task: "tasks",
      project: "projects",
      idea: "ideas",
      person: "persons",
    };

    const tab = typeToTab[type];
    if (!tab) return;

    // Set the active tab
    setActiveTab(tab);

    // Find and open the entity for editing
    let entity: EditingEntity = null;

    if (type === "task") {
      const task = taskList.find((t) => t.id === id);
      if (task) entity = { type: "task", item: task };
    } else if (type === "project") {
      const project = projectList.find((p) => p.id === id);
      if (project) entity = { type: "project", item: project };
    } else if (type === "idea") {
      const idea = ideaList.find((i) => i.id === id);
      if (idea) entity = { type: "idea", item: idea };
    } else if (type === "person") {
      const person = personList.find((p) => p.id === id);
      if (person) entity = { type: "person", item: person };
    }

    if (entity) {
      setEditing(entity);
      // Clear URL params after processing
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, loading, taskList, projectList, ideaList, personList, setSearchParams]);

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
      } else if (editing.type === "person") {
        const updated = await updatePerson.mutateAsync({ id: editing.item.id, data: data as Partial<Person> });
        setEditing({ type: "person", item: updated });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
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
      } else if (editing.type === "person") {
        const result = await interpretPerson.mutateAsync({ id: editing.item.id, instruction });
        setEditing({ type: "person", item: result.entity });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
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
        person: "persons",
      };

      const entityType = entityTypeMap[editing.type];
      const result = await fixEntity.mutateAsync({ entityType, id: editing.item.id, correction }) as { newEntity: Task | Project | Idea | Person; oldEntity: Task | Project | Idea | Person };

      // Update editing state with new entity
      const newEntity = result.newEntity;
      if ("title" in newEntity && "nextAction" in newEntity) {
        // It's a task
        setEditing({ type: "task", item: newEntity as Task });
      } else if ("name" in newEntity && "desiredOutcome" in newEntity) {
        // It's a project
        setEditing({ type: "project", item: newEntity as Project });
      } else if ("name" in newEntity && "relationshipContext" in newEntity) {
        // It's a person
        setEditing({ type: "person", item: newEntity as Person });
      } else {
        // It's an idea
        setEditing({ type: "idea", item: newEntity as Idea });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!editing) return;

    const entityName = editing.type === "task" ? editing.item.title :
                       editing.type === "project" ? editing.item.name :
                       editing.type === "person" ? editing.item.name :
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
      } else if (editing.type === "person") {
        await deletePerson.mutateAsync(editing.item.id);
      }
      setEditing(null);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    }
  };

  const handleReprocess = async () => {
    if (!editing) return;

    const entityName = editing.type === "task" ? editing.item.title :
                       editing.type === "project" ? editing.item.name :
                       editing.type === "person" ? editing.item.name :
                       editing.item.title;

    if (!window.confirm(`Reprocess "${entityName}" with AI? This will send the original text through classification again and may change the entity type.`)) {
      return;
    }

    setSaveError(null);
    setSaveSuccess(false);

    try {
      const entityTypeMap: Record<string, EntityType> = {
        task: "tasks",
        project: "projects",
        idea: "ideas",
        person: "persons",
      };

      const entityType = entityTypeMap[editing.type];
      await reprocessEntity.mutateAsync({ entityType, id: editing.item.id });

      setEditing(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    }
  };

  // Show filtered count vs total for tasks and projects
  const taskCountLabel = taskList.length !== rawTaskList.length
    ? `${taskList.length}/${rawTaskList.length}`
    : `${taskList.length}`;
  const projectCountLabel = projectList.length !== rawProjectList.length
    ? `${projectList.length}/${rawProjectList.length}`
    : `${projectList.length}`;

  const tabs = [
    { id: "tasks" as const, label: "Tasks", count: taskCountLabel },
    { id: "projects" as const, label: "Projects", count: projectCountLabel },
    { id: "ideas" as const, label: "Ideas", count: `${ideaList.length}` },
    { id: "persons" as const, label: "People", count: `${personList.length}` },
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
        <ErrorBanner
          error={extractErrorMessage(error)}
          onRetry={loadData}
        />
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <div className="space-y-3">
              {/* Task Filter Bar */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={taskFilters.search}
                      onChange={(e) => setTaskFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder="Search tasks..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Sort:</label>
                    <select
                      value={taskFilters.sort}
                      onChange={(e) => updateTaskFilters({ sort: e.target.value as TaskSortField })}
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="createdAt">Created</option>
                      <option value="dueDate">Due Date</option>
                      <option value="title">Title</option>
                    </select>
                    <button
                      onClick={() => updateTaskFilters({ sortDir: taskFilters.sortDir === "asc" ? "desc" : "asc" })}
                      className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                      title={taskFilters.sortDir === "asc" ? "Ascending" : "Descending"}
                    >
                      {taskFilters.sortDir === "asc" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1">
                    {(["all", "active", "waiting", "someday", "completed"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateTaskFilters({ status })}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          taskFilters.status === status
                            ? status === "all"
                              ? "bg-gray-900 text-white"
                              : status === "active"
                              ? "bg-green-600 text-white"
                              : status === "waiting"
                              ? "bg-yellow-600 text-white"
                              : status === "someday"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {taskList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  {rawTaskList.length === 0
                    ? "No tasks yet. Capture something to get started!"
                    : "No tasks match your filters."}
                </div>
              ) : (
                taskList.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setEditing({ type: "task", item: task })}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.nextAction}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                        task.status === "active" ? "bg-green-100 text-green-700" :
                        task.status === "completed" ? "bg-gray-100 text-gray-600" :
                        task.status === "waiting" ? "bg-yellow-100 text-yellow-700" :
                        "bg-primary-subtle text-primary-active"
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
              {/* Project Filter Bar */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={projectFilters.search}
                      onChange={(e) => setProjectFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder="Search projects..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Sort:</label>
                    <select
                      value={projectFilters.sort}
                      onChange={(e) => updateProjectFilters({ sort: e.target.value as ProjectSortField })}
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="createdAt">Created</option>
                      <option value="name">Name</option>
                    </select>
                    <button
                      onClick={() => updateProjectFilters({ sortDir: projectFilters.sortDir === "asc" ? "desc" : "asc" })}
                      className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                      title={projectFilters.sortDir === "asc" ? "Ascending" : "Descending"}
                    >
                      {projectFilters.sortDir === "asc" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1">
                    {(["all", "active", "on_hold", "someday", "completed"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateProjectFilters({ status })}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          projectFilters.status === status
                            ? status === "all"
                              ? "bg-gray-900 text-white"
                              : status === "active"
                              ? "bg-green-600 text-white"
                              : status === "on_hold"
                              ? "bg-yellow-600 text-white"
                              : status === "someday"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {status === "all" ? "All" : status === "on_hold" ? "On Hold" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {projectList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  {rawProjectList.length === 0
                    ? "No projects yet."
                    : "No projects match your filters."}
                </div>
              ) : (
                projectList.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setEditing({ type: "project", item: project })}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                        {project.desiredOutcome && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.desiredOutcome}</p>
                        )}
                        {project.nextAction && (
                          <p className="text-sm text-gray-500 mt-1 truncate">Next: {project.nextAction}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                        project.status === "active" ? "bg-green-100 text-green-700" :
                        project.status === "completed" ? "bg-gray-100 text-gray-600" :
                        project.status === "on_hold" ? "bg-yellow-100 text-yellow-700" :
                        "bg-primary-subtle text-primary-active"
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
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all min-w-0"
                  >
                    <h4 className="font-medium text-gray-900 truncate">{idea.title}</h4>
                    {idea.summary && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{idea.summary}</p>
                    )}
                    {idea.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {idea.links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-hover hover:underline"
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

          {/* People Tab */}
          {activeTab === "persons" && (
            <div className="space-y-3">
              {/* Sort Controls */}
              {personList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={personSort}
                    onChange={(e) => setPersonSort(e.target.value as PersonSortOption)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="lastTouched-desc">Last Touched (Newest)</option>
                    <option value="lastTouched-asc">Last Touched (Oldest)</option>
                  </select>
                </div>
              )}

              {/* Filter Controls */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all" as const, label: "All" },
                  { id: "follow_up_needed" as const, label: "Follow-up Needed" },
                  { id: "no_follow_up" as const, label: "No Follow-up" },
                  { id: "recently_touched" as const, label: "Recently Touched" },
                  { id: "stale" as const, label: "Stale Contacts" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setPersonFilter(filter.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      personFilter === filter.id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter.label}
                    {filter.id !== "all" && (
                      <span className="ml-1.5 text-xs opacity-75">
                        ({personList.filter((p) => {
                          if (filter.id === "follow_up_needed") return !!p.followUpNextAction;
                          if (filter.id === "no_follow_up") return !p.followUpNextAction;
                          if (filter.id === "recently_touched") {
                            if (!p.lastTouchedAt) return false;
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return new Date(p.lastTouchedAt) >= weekAgo;
                          }
                          if (filter.id === "stale") {
                            if (!p.lastTouchedAt) return true;
                            const monthAgo = new Date();
                            monthAgo.setDate(monthAgo.getDate() - 30);
                            return new Date(p.lastTouchedAt) < monthAgo;
                          }
                          return true;
                        }).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {personList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No people yet.
                </div>
              ) : filteredPersonList.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No people match this filter.
                </div>
              ) : (
sortedPersonList.map((person) => {
                  const hasFollowUp = !!person.followUpNextAction;
                  const daysSinceLastTouch = person.lastTouchedAt
                    ? Math.floor((Date.now() - new Date(person.lastTouchedAt).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = hasFollowUp && daysSinceLastTouch !== null && daysSinceLastTouch > 14;
                  const isStale = hasFollowUp && daysSinceLastTouch !== null && daysSinceLastTouch > 7 && !isOverdue;

                  return (
                    <div
                      key={person.id}
                      onClick={() => setEditing({ type: "person", item: person })}
                      className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-sm transition-all ${
                        isOverdue
                          ? "border-red-300 bg-red-50 hover:border-red-400"
                          : isStale
                          ? "border-yellow-300 bg-yellow-50 hover:border-yellow-400"
                          : hasFollowUp
                          ? "border-blue-300 bg-blue-50 hover:border-blue-400"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{person.name}</h4>
                            {hasFollowUp && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                isOverdue
                                  ? "bg-red-100 text-red-700"
                                  : isStale
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {isOverdue ? "Overdue" : isStale ? "Due soon" : "Follow-up"}
                              </span>
                            )}
                          </div>
                          {person.relationshipContext && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{person.relationshipContext}</p>
                          )}
                          {person.followUpNextAction && (
                            <p className="text-sm text-gray-700 mt-1 truncate">
                              <span className="font-medium">Next:</span> {person.followUpNextAction}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                          {daysSinceLastTouch !== null && (
                            <span className={`text-xs whitespace-nowrap ${
                              isOverdue ? "text-red-600 font-medium" : isStale ? "text-yellow-600" : "text-gray-400"
                            }`}>
                              {daysSinceLastTouch === 0 ? "Today" : daysSinceLastTouch === 1 ? "1 day ago" : `${daysSinceLastTouch} days ago`}
                            </span>
                          )}
                          {hasFollowUp && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePerson.mutate({
                                  id: person.id,
                                  data: {
                                    followUpNextAction: null,
                                    lastTouchedAt: new Date().toISOString(),
                                  },
                                });
                              }}
                              disabled={updatePerson.isPending}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => {
          setEditing(null);
          setSaveError(null);
        }}
        title={editing ? `Edit ${editing.type.charAt(0).toUpperCase() + editing.type.slice(1)}` : ""}
      >
        {saveError && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm animate-slide-up">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2 animate-scale-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Saved successfully!</span>
          </div>
        )}

        {editing?.type === "task" && (
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

        {editing?.type === "project" && (
          <ProjectEditForm
            project={editing.item}
            onSave={handleSave}
            onInterpret={handleInterpret}
            onFix={handleFix}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}

        {editing?.type === "idea" && (
          <IdeaEditForm
            idea={editing.item}
            onSave={handleSave}
            onInterpret={handleInterpret}
            onFix={handleFix}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}

        {editing?.type === "person" && (
          <PersonEditForm
            person={editing.item}
            onSave={handleSave}
            onInterpret={handleInterpret}
            onFix={handleFix}
            onReprocess={handleReprocess}
            onDelete={handleDelete}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  );
}

// =============================================================================
// Edit Forms
// =============================================================================

function ProjectEditForm({
  project,
  onSave,
  onInterpret,
  onFix,
  onReprocess,
  onDelete,
  onCancel,
  saving,
}: {
  project: Project;
  onSave: (data: Record<string, unknown>) => void;
  onInterpret: (instruction: string) => void;
  onFix: (correction: string) => void;
  onReprocess: () => void;
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

  const handleInterpret = (e: FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
    }
  };

  const handleFix = (e: FormEvent) => {
    e.preventDefault();
    if (correction.trim()) {
      onFix(correction.trim());
    }
  };

  const handleManualSave = (e: FormEvent) => {
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
                  : "bg-primary-subtle text-primary-active hover:bg-primary-200"
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

      {/* Reprocess with AI */}
      {project.sourceInboxItemId && (
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-xs font-medium text-purple-600 mb-2">
            Reprocess with AI
          </label>
          <button
            type="button"
            onClick={onReprocess}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            disabled={saving}
          >
            {saving ? "..." : "Reprocess"}
          </button>
          <p className="mt-1 text-xs text-gray-500">
            Send the original text through AI classification again. May change entity type.
          </p>
        </div>
      )}

      {/* Delete - Moved above "Show all fields" for better visibility */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          disabled={saving}
        >
          Delete Project
        </button>
      </div>

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
  onReprocess,
  onDelete,
  onCancel,
  saving,
}: {
  idea: Idea;
  onSave: (data: Record<string, unknown>) => void;
  onInterpret: (instruction: string) => void;
  onFix: (correction: string) => void;
  onReprocess: () => void;
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

  const handleInterpret = (e: FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
    }
  };

  const handleFix = (e: FormEvent) => {
    e.preventDefault();
    if (correction.trim()) {
      onFix(correction.trim());
    }
  };

  const handleManualSave = (e: FormEvent) => {
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

      {/* Reprocess with AI */}
      {idea.sourceInboxItemId && (
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-xs font-medium text-purple-600 mb-2">
            Reprocess with AI
          </label>
          <button
            type="button"
            onClick={onReprocess}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            disabled={saving}
          >
            {saving ? "..." : "Reprocess"}
          </button>
          <p className="mt-1 text-xs text-gray-500">
            Send the original text through AI classification again. May change entity type.
          </p>
        </div>
      )}

      {/* Delete - Moved above "Show all fields" for better visibility */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          disabled={saving}
        >
          Delete Idea
        </button>
      </div>

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

function PersonEditForm({
  person,
  onSave,
  onInterpret,
  onFix,
  onReprocess,
  onDelete,
  onCancel,
  saving,
}: {
  person: Person;
  onSave: (data: Record<string, unknown>) => void;
  onInterpret: (instruction: string) => void;
  onFix: (correction: string) => void;
  onReprocess: () => void;
  onDelete: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [correction, setCorrection] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [name, setName] = useState(person.name);
  const [relationshipContext, setRelationshipContext] = useState(person.relationshipContext || "");
  const [followUpNextAction, setFollowUpNextAction] = useState(person.followUpNextAction || "");
  const [lastTouchedAt, setLastTouchedAt] = useState(
    person.lastTouchedAt ? new Date(person.lastTouchedAt).toISOString().split("T")[0] : ""
  );

  const handleInterpret = (e: FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
    }
  };

  const handleFix = (e: FormEvent) => {
    e.preventDefault();
    if (correction.trim()) {
      onFix(correction.trim());
    }
  };

  const handleManualSave = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      relationshipContext: relationshipContext || null,
      followUpNextAction: followUpNextAction || null,
      lastTouchedAt: lastTouchedAt ? new Date(lastTouchedAt).toISOString() : null,
    });
  };

  const handleMarkComplete = () => {
    onSave({
      followUpNextAction: null,
      lastTouchedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Mark Follow-up Complete Button */}
      {person.followUpNextAction && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Follow-up pending</p>
              <p className="text-sm text-blue-700 mt-1">{person.followUpNextAction}</p>
            </div>
            <button
              type="button"
              onClick={handleMarkComplete}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
            >
              {saving ? "..." : "Mark Complete"}
            </button>
          </div>
        </div>
      )}

      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Add follow-up to schedule a call"
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
            placeholder="e.g., This is actually a task, not a person"
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

      {/* Reprocess with AI */}
      {person.sourceInboxItemId && (
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-xs font-medium text-purple-600 mb-2">
            Reprocess with AI
          </label>
          <button
            type="button"
            onClick={onReprocess}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            disabled={saving}
          >
            {saving ? "..." : "Reprocess"}
          </button>
          <p className="mt-1 text-xs text-gray-500">
            Send the original text through AI classification again. May change entity type.
          </p>
        </div>
      )}

      {/* Delete */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          disabled={saving}
        >
          Delete Person
        </button>
      </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Context</label>
              <textarea
                value={relationshipContext}
                onChange={(e) => setRelationshipContext(e.target.value)}
                rows={2}
                placeholder="e.g., Work colleague, met at conference..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Next Action</label>
              <input
                type="text"
                value={followUpNextAction}
                onChange={(e) => setFollowUpNextAction(e.target.value)}
                placeholder="e.g., Schedule lunch meeting"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Touched</label>
              <input
                type="date"
                value={lastTouchedAt}
                onChange={(e) => setLastTouchedAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">When you last interacted with this person</p>
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
