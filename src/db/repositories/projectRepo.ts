import { db, moveToTrash, nowISO } from '..';
import type { Project } from '../schema';
import { newId } from '@/lib/id';

export interface NewProjectInput {
  name: string;
  color?: string;
}

export const projectRepo = {
  async listAll(): Promise<Project[]> {
    return db.projects.orderBy('order').toArray();
  },

  async create(input: NewProjectInput): Promise<Project> {
    const last = await db.projects.orderBy('order').last();
    const project: Project = {
      id: newId('proj'),
      name: input.name.trim(),
      color: input.color ?? '#7c3aed',
      order: (last?.order ?? 0) + 1,
      createdAt: nowISO(),
    };
    await db.projects.add(project);
    return project;
  },

  async update(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    await db.projects.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    const project = await db.projects.get(id);
    if (!project) return;
    // 项目下的任务退回收件箱，而不是被连带删除
    await db.todos.where('projectId').equals(id).modify({ projectId: undefined });
    await moveToTrash('projects', id, project.name);
  },
};
