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

interface Barbero {
  id: string;
  nombre: string;
  especialidad: string;
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
      nombre: 'Corte TAURUS al Pelito',
      descripcion: 'Corte con acabado a tijeras o máquina, lavado y peinado impecable para salir fino.',
      duracionMinutos: 30,
      precio: 8.00,
      activo: true
    },
    {
      id: '2',
      nombre: 'Corte + Barba de Caballero',
      descripcion: 'Perfilado de barba con toalla caliente e hidratación completa junto al corte de tu preferencia.',
      duracionMinutos: 45,
      precio: 12.00,
      activo: true
    },
    {
      id: '3',
      nombre: 'Perfilado de Barba Express',
      descripcion: 'Afeitado al vapor, alineación de contornos y aceite nutritivo.',
      duracionMinutos: 20,
      precio: 5.00,
      activo: true
    }
  ];

  // Lista oficial de barberos de Barbería TAURUS
  barberos: Barbero[] = [
    { id: 'b1', nombre: 'Efren', especialidad: 'Master Fade & Degradados', activo: true },
    { id: 'b2', nombre: 'Edgardo', especialidad: 'Estilos Clásicos & Tijera', activo: true },
    { id: 'b3', nombre: 'Julio', especialidad: 'Diseños & Perfilado de Barba', activo: true },
    { id: 'b4', nombre: 'Carlos', especialidad: 'Tratamientos & Acabados', activo: true }
  ];
}