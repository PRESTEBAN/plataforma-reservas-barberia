import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precio: number;
  activo: boolean;
}

@Component({
  selector: 'app-servicios-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './servicios-catalogo.html',
  styleUrl: './servicios-catalogo.css'
})
export class ServiciosCatalogoComponent {
  servicios: Servicio[] = [
    {
      id: '1',
      nombre: 'Corte Tradicional',
      descripcion: 'Corte de cabello con acabado a tijeras o máquina y peinado.',
      duracionMinutos: 30,
      precio: 8.00,
      activo: true
    },
    {
      id: '2',
      nombre: 'Corte + Perfilado de Barba',
      descripcion: 'Servicio completo de corte y diseño de barba.',
      duracionMinutos: 45,
      precio: 12.00,
      activo: true
    },
    {
      id: '3',
      nombre: 'Barba Express',
      descripcion: 'Afeitado al vapor y perfilado rápido de barba.',
      duracionMinutos: 20,
      precio: 5.00,
      activo: true
    }
  ];
}