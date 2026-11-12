import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then(m => m.HomePage), title: 'Waitro · Which AI is the right one?' },
  { path: 'models', loadComponent: () => import('./pages/models').then(m => m.ModelsPage), title: 'All models · Waitro' },
  { path: 'm/:id', loadComponent: () => import('./pages/model').then(m => m.ModelPage) },
  { path: 'agents', loadComponent: () => import('./pages/agents').then(m => m.AgentsPage), title: 'Agents · Waitro' },
  { path: 'a/:id', loadComponent: () => import('./pages/agent').then(m => m.AgentPage) },
  { path: 'providers', loadComponent: () => import('./pages/providers').then(m => m.ProvidersPage), title: 'Providers · Waitro' },
  { path: 'p/:id', loadComponent: () => import('./pages/provider').then(m => m.ProviderPage) },
  { path: 'tasks', loadComponent: () => import('./pages/tasks').then(m => m.TasksPage), title: 'Tasks · Waitro' },
  { path: 't/:id', loadComponent: () => import('./pages/task').then(m => m.TaskPage) },
  { path: 'about', loadComponent: () => import('./pages/about').then(m => m.AboutPage), title: 'About · Waitro' },
  { path: '**', loadComponent: () => import('./pages/not-found').then(m => m.NotFoundPage), title: 'Not found · Waitro' },
];
