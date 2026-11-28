import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservaService } from '../../services/reserva.service';
import { Reserva } from '../../services/models';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.css'
})
export class MisReservasComponent implements OnInit {
  reservas: Reserva[] = [];
  mensajeAlerta: string = '';
  cargando: boolean = true;

  reservaPorCancelar: Reserva | null = null;
  cancelando = false;

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

  pedirCancelacion(reserva: Reserva): void {
    this.reservaPorCancelar = reserva;
  }

  cerrarDialogo(): void {
    if (this.cancelando) return;
    this.reservaPorCancelar = null;
  }

  async confirmarCancelacion(): Promise<void> {
    const reserva = this.reservaPorCancelar;
    if (!reserva?.id) return;

    this.cancelando = true;
    try {
      await this.reservaService.cancelarReserva(reserva.id);
      this.mensajeAlerta = 'La reserva ha sido cancelada exitosamente.';
      await this.cargarReservas();
    } catch (e: any) {
      this.mensajeAlerta = e.message || 'No se pudo cancelar la reserva.';
    } finally {
      this.cancelando = false;
      this.reservaPorCancelar = null;
      this.cdr.markForCheck();
    }
  }
}