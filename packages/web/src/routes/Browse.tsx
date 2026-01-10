import { useState, useEffect } from "react";
import {
  tasks,
  projects,
  ideas,
  type Task,
  type Project,
  type Idea,
  type ApiError,
} from "../lib/api";

type TabType = "tasks" | "projects" | "ideas";

export function Browse() {
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [ideaList, setIdeaList] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tasksRes, projectsRes, ideasRes] = await Promise.all([
        tasks.list(),
        projects.list(),
        ideas.list(),
      ]);
      setTaskList(tasksRes.items);
      setProjectList(projectsRes.items);
      setIdeaList(ideasRes.items);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          {error}
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
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4">
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
                  <div key={project.id} className="bg-white rounded-lg border border-gray-200 p-4">
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
                  <div key={idea.id} className="bg-white rounded-lg border border-gray-200 p-4">
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
    </div>
  );
}
