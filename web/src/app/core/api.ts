import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Meta, ModelDetail, ModelSummary, SearchResult, TaskPage } from './types';

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  readonly meta = signal<Meta | null>(null);
  readonly models = signal<ModelSummary[] | null>(null);
  readonly modelById = computed(() => new Map((this.models() ?? []).map(m => [m.id, m])));
  readonly taskNames = computed(() => new Map((this.meta()?.domains ?? []).flatMap(d => d.tasks.map(t => [t.id, t.name] as const))));
  readonly taskDomain = computed(() => new Map((this.meta()?.domains ?? []).flatMap(d => d.tasks.map(t => [t.id, d.id] as const))));
  private modelsLoading?: Promise<ModelSummary[]>;

  async init(): Promise<void> {
    const [meta] = await Promise.all([this.get<Meta>('/meta'), this.loadModels()]);
    this.meta.set(meta);
  }

  loadModels(): Promise<ModelSummary[]> {
    this.modelsLoading ??= this.get<{ models: ModelSummary[] }>('/models').then(r => {
      this.models.set(r.models);
      return r.models;
    });
    return this.modelsLoading;
  }

  model(id: string) {
    return this.get<ModelDetail>(`/models/${encodeURIComponent(id)}`);
  }

  task(id: string) {
    return this.get<TaskPage>(`/tasks/${encodeURIComponent(id)}`);
  }

  search(q: string) {
    return this.request<SearchResult>(this.http.post<SearchResult>('/api/search', { q }));
  }

  taskName(id: string) {
    return this.taskNames().get(id) ?? id;
  }

  private get<T>(path: string) {
    return this.request<T>(this.http.get<T>(`/api${path}`));
  }

  private async request<T>(obs: import('rxjs').Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (e) {
      const err = e as HttpErrorResponse;
      throw Object.assign(new Error(err.error?.error || 'Something went wrong. Please try again.'), { status: err.status });
    }
  }
}
