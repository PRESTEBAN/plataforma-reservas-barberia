import { Routes } from '@angular/router';
import { sesionGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'servicios', pathMatch: 'full' },
  {
    path: 'servicios',
    loadComponent: () => import('./pages/servicios-catalogo/servicios-catalogo').then(m => m.ServiciosCatalogoComponent)
  },
  {
    path: 'reservar',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/crear-reserva/crear-reserva').then(m => m.CrearReservaComponent)
  },
  {
    path: 'mis-reservas',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/mis-reservas/mis-reservas').then(m => m.MisReservasComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.RegistroComponent)
  },
  { path: '**', redirectTo: 'servicios' }
];