import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'servicios', pathMatch: 'full' },
  { 
    path: 'servicios', 
    loadComponent: () => import('./pages/servicios-catalogo/servicios-catalogo').then(m => m.ServiciosCatalogoComponent) 
  },
  { 
    path: 'reservar', 
    loadComponent: () => import('./pages/crear-reserva/crear-reserva').then(m => Object.values(m)[0] as any) 
  },
  { 
    path: 'mis-reservas', 
    loadComponent: () => import('./pages/mis-reservas/mis-reservas').then(m => Object.values(m)[0] as any) 
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard').then(m => Object.values(m)[0] as any) 
  },
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login').then(m => Object.values(m)[0] as any) 
  },
  { 
    path: 'registro', 
    loadComponent: () => import('./pages/registro/registro').then(m => Object.values(m)[0] as any) 
  },
  { path: '**', redirectTo: 'servicios' }
];