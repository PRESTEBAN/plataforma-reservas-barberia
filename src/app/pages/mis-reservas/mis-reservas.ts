import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Reserva {
  id: string;
  servicioNombre: string;
  barberoNombre: string;
  fechaHora: string;
  precio: number;
  estado: 'CONFIRMADA' | 'CANCELADA' | 'ATENDIDA';
}

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.css'
})
export class MisReservasComponent implements OnInit {
  mensajeAlerta: string = '';

  reservas: Reserva[] = [
    {
      id: 'res-101',
      servicioNombre: 'Corte TAURUS al Pelito',
      barberoNombre: 'Efren',
      fechaHora: '2026-11-28T10:00',
      precio: 8.00,
      estado: 'CONFIRMADA'
    },
    {
      id: 'res-102',
      servicioNombre: 'Corte + Barba de Caballero',
      barberoNombre: 'Julio',
      fechaHora: '2026-11-20T15:30',
      precio: 12.00,
      estado: 'ATENDIDA'
    }
  ];

  ngOnInit(): void {}

  cancelarReserva(id: string): void {
    const reserva = this.reservas.find(r => r.id === id);
    if (reserva && reserva.estado === 'CONFIRMADA') {
      if (confirm('¿Estás seguro de que deseas cancelar tu cita en TAURUS, mi pana?')) {
        reserva.estado = 'CANCELADA';
        this.mensajeAlerta = `La reserva de "${reserva.servicioNombre}" ha sido cancelada.`;
      }
    }
  }
}