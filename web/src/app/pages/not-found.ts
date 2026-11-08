import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="wrap pt-28 text-center">
      <p class="num text-sm text-faint">404</p>
      <h1 class="mt-2 text-4xl font-semibold tracking-tight">This page doesn’t exist</h1>
      <a routerLink="/" class="btn btn-primary mt-8">Back to search</a>
    </div>
  `,
})
export class NotFoundPage {}
