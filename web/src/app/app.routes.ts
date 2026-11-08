import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then(m => m.HomePage), title: 'Waitro · Which AI is the right one?' },
  { path: 'models', loadComponent: () => import('./pages/models').then(m => m.ModelsPage), title: 'All models · Waitro' },
  { path: 'm/:id', loadComponent: () => import('./pages/model').then(m => m.ModelPage) },
  { path: 'tasks', loadComponent: () => import('./pages/tasks').then(m => m.TasksPage), title: 'Tasks · Waitro' },
  { path: 't/:id', loadComponent: () => import('./pages/task').then(m => m.TaskPage) },
  { path: 'about', loadComponent: () => import('./pages/about').then(m => m.AboutPage), title: 'About · Waitro' },
  { path: '**', loadComponent: () => import('./pages/not-found').then(m => m.NotFoundPage), title: 'Not found · Waitro' },
];
