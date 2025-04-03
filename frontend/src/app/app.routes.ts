// app.routes.ts
import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: LandingComponent }, // Default route
  { path: 'home', component: HomeComponent },
  { path: '**', redirectTo: '' } // Wildcard redirect to landing
];