import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tasks,
  projects,
  ideas,
  persons,
  inbox,
  fix,
  process,
  type Task,
  type Project,
  type Idea,
  type Person,
  type TaskListResponse,
  type ProjectListResponse,
  type IdeaListResponse,
  type PersonListResponse,
  type EntityType,
} from "./api";

// Query keys
export const queryKeys = {
  tasks: ["tasks"] as const,
  projects: ["projects"] as const,
  ideas: ["ideas"] as const,
  persons: ["persons"] as const,
  inbox: ["inbox"] as const,
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

export function usePersons(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.persons, params],
    queryFn: () => persons.list(params),
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
    onSuccess: (updatedTask: Task) => {
      // Update the task in all relevant queries
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: queryKeys.tasks },
        (old: TaskListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task: Task) =>
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
    onSuccess: (updatedProject: Project) => {
      queryClient.setQueriesData<ProjectListResponse>(
        { queryKey: queryKeys.projects },
        (old: ProjectListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((project: Project) =>
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
    onSuccess: (updatedIdea: Idea) => {
      queryClient.setQueriesData<IdeaListResponse>(
        { queryKey: queryKeys.ideas },
        (old: IdeaListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((idea: Idea) =>
              idea.id === updatedIdea.id ? updatedIdea : idea
            ),
          };
        }
      );
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Person> }) =>
      persons.update(id, data),
    onSuccess: (updatedPerson: Person) => {
      queryClient.setQueriesData<PersonListResponse>(
        { queryKey: queryKeys.persons },
        (old: PersonListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((person: Person) =>
              person.id === updatedPerson.id ? updatedPerson : person
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
    onSuccess: (result: { entity: Task }) => {
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: queryKeys.tasks },
        (old: TaskListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((task: Task) =>
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
    onSuccess: (result: { entity: Project }) => {
      queryClient.setQueriesData<ProjectListResponse>(
        { queryKey: queryKeys.projects },
        (old: ProjectListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((project: Project) =>
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
    onSuccess: (result: { entity: Idea }) => {
      queryClient.setQueriesData<IdeaListResponse>(
        { queryKey: queryKeys.ideas },
        (old: IdeaListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((idea: Idea) =>
              idea.id === result.entity.id ? result.entity : idea
            ),
          };
        }
      );
    },
  });
}

export function useInterpretPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) =>
      persons.interpret(id, instruction),
    onSuccess: (result: { entity: Person }) => {
      queryClient.setQueriesData<PersonListResponse>(
        { queryKey: queryKeys.persons },
        (old: PersonListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((person: Person) =>
              person.id === result.entity.id ? result.entity : person
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
    onSuccess: (_result: unknown) => {
      // Invalidate all queries since the entity type might have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
      queryClient.invalidateQueries({ queryKey: queryKeys.persons });
    },
  });
}

export function useReprocessEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entityType,
      id,
    }: {
      entityType: EntityType;
      id: string;
    }) => process.reprocess(entityType, id),
    onSuccess: (_result: unknown) => {
      // Invalidate all queries since the entity type might have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
      queryClient.invalidateQueries({ queryKey: queryKeys.persons });
    },
  });
}

export function useReprocessInboxItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inbox.reprocess(id),
    onSuccess: (_result: unknown) => {
      // Invalidate inbox and all entity queries since reprocessing may create new entities
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
      queryClient.invalidateQueries({ queryKey: queryKeys.persons });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasks.delete(id),
    onSuccess: (_: void, deletedId: string) => {
      queryClient.setQueriesData<TaskListResponse>(
        { queryKey: queryKeys.tasks },
        (old: TaskListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((task: Task) => task.id !== deletedId),
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
    onSuccess: (_: void, deletedId: string) => {
      queryClient.setQueriesData<ProjectListResponse>(
        { queryKey: queryKeys.projects },
        (old: ProjectListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((project: Project) => project.id !== deletedId),
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
    onSuccess: (_: void, deletedId: string) => {
      queryClient.setQueriesData<IdeaListResponse>(
        { queryKey: queryKeys.ideas },
        (old: IdeaListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((idea: Idea) => idea.id !== deletedId),
            total: old.total - 1,
          };
        }
      );
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => persons.delete(id),
    onSuccess: (_: void, deletedId: string) => {
      queryClient.setQueriesData<PersonListResponse>(
        { queryKey: queryKeys.persons },
        (old: PersonListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((person: Person) => person.id !== deletedId),
            total: old.total - 1,
          };
        }
      );
    },
  });
}

export function useCapture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => inbox.capture(text),
    onSuccess: () => {
      // Invalidate all entity queries since capture may create any entity type
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
      queryClient.invalidateQueries({ queryKey: queryKeys.persons });
    },
  });
}
