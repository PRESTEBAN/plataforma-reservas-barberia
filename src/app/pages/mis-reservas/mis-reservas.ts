import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservaService } from '../../services/reserva.service';
import { Reserva } from '../../services/models';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.css'
})
export class MisReservasComponent implements OnInit {
  private reservaService = inject(ReservaService);

  reservas = signal<Reserva[]>([]);
  cargando = signal(true);
  mensajeAlerta = signal('');
  mensajeError = signal('');

  async ngOnInit(): Promise<void> {
    await this.cargarReservas();
  }

  async cargarReservas(): Promise<void> {
    this.cargando.set(true);
    try {
      this.reservas.set(await this.reservaService.listarMisReservas());
    } catch (e: any) {
      this.mensajeError.set(e.message || 'Error al cargar tus reservas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async cancelarReserva(id: string): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas cancelar tu cita en TAURUS, mi pana?')) {
      return;
    }
    this.mensajeAlerta.set('');
    this.mensajeError.set('');
    try {
      await this.reservaService.cancelarReserva(id);
      this.mensajeAlerta.set('La reserva ha sido cancelada y el horario quedó libre.');
      await this.cargarReservas();
    } catch (e: any) {
      this.mensajeError.set(e.message || 'No se pudo cancelar la reserva.');
    }
  }

  // El botón de cancelar solo aparece en reservas confirmadas que todavía no empiezan
  puedeCancelar(r: Reserva): boolean {
    return r.estado === 'CONFIRMADA' && r.inicio > Date.now();
  }
}