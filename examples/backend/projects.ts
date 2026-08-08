// Sanitized extract from the private production application.
// Demonstrates typed Supabase access and derived project-budget reads.

import { createClient } from "@/lib/supabase/server";
import type { Database } from "./types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectWithPlanned = Project & { planned_amount: number };

/**
 * Read the live planned amount from the database view that owns the
 * aggregation rule, rather than trusting a denormalized snapshot column.
 */
export async function plannedByProject(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_planned")
    .select("project_id, planned_amount");

  if (error) throw error;

  const result = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.project_id) {
      result.set(row.project_id, Number(row.planned_amount ?? 0));
    }
  }
  return result;
}

export async function listProjectsWithPlanned(): Promise<ProjectWithPlanned[]> {
  const [projects, planned] = await Promise.all([
    listProjects(),
    plannedByProject(),
  ]);

  return projects.map((project) => ({
    ...project,
    planned_amount:
      planned.get(project.id) ?? Number(project.total_budget ?? 0),
  }));
}

export async function listProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createProject(input: {
  name: string;
  address?: string;
  start_date?: string;
  target_end_date?: string;
}): Promise<Project> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, created_by: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}
