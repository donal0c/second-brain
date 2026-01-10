import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tasks,
  projects,
  ideas,
  fix,
  type Task,
  type Project,
  type Idea,
  type TaskListResponse,
  type ProjectListResponse,
  type IdeaListResponse,
  type EntityType,
} from "./api";

// Query keys
export const queryKeys = {
  tasks: ["tasks"] as const,
  projects: ["projects"] as const,
  ideas: ["ideas"] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

export function useTasks(params?: { status?: string; context?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.tasks, params],
    queryFn: () => tasks.list(params),
  });
}

export function useProjects(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.projects, params],
    queryFn: () => projects.list(params),
  });
}

export function useIdeas(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.ideas, params],
    queryFn: () => ideas.list(params),
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasks.update(id, data),
    onSuccess: (updatedTask) => {
      // Update the task in all relevant queries
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: queryKeys.tasks },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            ),
          };
        }
      );
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projects.update(id, data),
    onSuccess: (updatedProject) => {
      queryClient.setQueriesData<ProjectListResponse>(
        { queryKey: queryKeys.projects },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((project) =>
              project.id === updatedProject.id ? updatedProject : project
            ),
          };
        }
      );
    },
  });
}

export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Idea> }) =>
      ideas.update(id, data),
    onSuccess: (updatedIdea) => {
      queryClient.setQueriesData<IdeaListResponse>(
        { queryKey: queryKeys.ideas },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((idea) =>
              idea.id === updatedIdea.id ? updatedIdea : idea
            ),
          };
        }
      );
    },
  });
}

export function useInterpretTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) =>
      tasks.interpret(id, instruction),
    onSuccess: (result) => {
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: queryKeys.tasks },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task) =>
              task.id === result.entity.id ? result.entity : task
            ),
          };
        }
      );
    },
  });
}

export function useInterpretProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) =>
      projects.interpret(id, instruction),
    onSuccess: (result) => {
      queryClient.setQueriesData<ProjectListResponse>(
        { queryKey: queryKeys.projects },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((project) =>
              project.id === result.entity.id ? result.entity : project
            ),
          };
        }
      );
    },
  });
}

export function useInterpretIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) =>
      ideas.interpret(id, instruction),
    onSuccess: (result) => {
      queryClient.setQueriesData<IdeaListResponse>(
        { queryKey: queryKeys.ideas },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((idea) =>
              idea.id === result.entity.id ? result.entity : idea
            ),
          };
        }
      );
    },
  });
}

export function useFixEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      id,
      correction,
    }: {
      entityType: EntityType;
      id: string;
      correction: string;
    }) => fix.entity(entityType, id, correction),
    onSuccess: (result) => {
      // Invalidate all queries since the entity type might have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasks.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: queryKeys.tasks },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((task) => task.id !== deletedId),
            total: old.total - 1,
          };
        }
      );
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projects.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData<ProjectListResponse>(
        { queryKey: queryKeys.projects },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((project) => project.id !== deletedId),
            total: old.total - 1,
          };
        }
      );
    },
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ideas.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData<IdeaListResponse>(
        { queryKey: queryKeys.ideas },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((idea) => idea.id !== deletedId),
            total: old.total - 1,
          };
        }
      );
    },
  });
}
