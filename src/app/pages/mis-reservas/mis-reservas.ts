import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservaService } from '../../services/reserva.service';
import { Reserva } from '../../services/models';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.css'
})
export class MisReservasComponent implements OnInit {
  reservas: Reserva[] = [];
  mensajeAlerta: string = '';
  cargando: boolean = true;

  constructor(
    private reservaService: ReservaService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarReservas();
  }

  async cargarReservas(): Promise<void> {
    this.cargando = true;
    try {
      this.reservas = await this.reservaService.listarMisReservas();
    } catch (e: any) {
      this.mensajeAlerta = e.message || 'Error al cargar tus reservas.';
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  async cancelarReserva(id: string): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas cancelar tu cita en TAURUS?')) return;

    try {
      await this.reservaService.cancelarReserva(id);
      this.mensajeAlerta = 'La reserva ha sido cancelada exitosamente.';
      await this.cargarReservas();
    } catch (e: any) {
      this.mensajeAlerta = e.message || 'No se pudo cancelar la reserva.';
      this.cdr.markForCheck();
    }
  }
}