import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReservaService } from '../../services/reserva.service';
import { ServicioService } from '../../services/servicio.service';
import { Barbero, Reserva, Servicio } from '../../services/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private reservaService = inject(ReservaService);
  private servicioService = inject(ServicioService);
  private fb = inject(FormBuilder);

  reservas = signal<Reserva[]>([]);
  servicios = signal<Servicio[]>([]);
  barberos = signal<Barbero[]>([]);

  filtroFecha = signal('');
  filtroEstado = signal('');
  mensaje = signal('');
  error = signal('');
  cargando = signal(true);
  editandoId = signal<string | null>(null);

  reservasFiltradas = computed(() =>
    this.reservas().filter(
      (r) =>
        (!this.filtroFecha() || r.fecha === this.filtroFecha()) &&
        (!this.filtroEstado() || r.estado === this.filtroEstado())
    )
  );
  totalConfirmadas = computed(() => this.reservas().filter((r) => r.estado === 'CONFIRMADA').length);
  serviciosActivos = computed(() => this.servicios().filter((s) => s.activo).length);
  barberosActivos = computed(() => this.barberos().filter((b) => b.activo).length);

  servicioForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(5)]],
    duracionMinutos: [30, [Validators.required, Validators.min(10), Validators.max(240)]],
    precio: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.cargarTodo();
  }

  async cargarTodo(): Promise<void> {
    try {
      const [reservas, servicios, barberos] = await Promise.all([
        this.reservaService.listarTodas(),
        this.servicioService.listarServicios(),
        this.servicioService.listarBarberos()
      ]);
      this.reservas.set(reservas);
      this.servicios.set(servicios);
      this.barberos.set(barberos);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudieron cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async ejecutar(accion: () => Promise<void>, ok: string): Promise<void> {
    this.error.set('');
    this.mensaje.set('');
    try {
      await accion();
      this.mensaje.set(ok);
      await this.cargarTodo();
    } catch (e: any) {
      this.error.set(e.message ?? 'Ocurrió un error.');
    }
  }

  // ---------- RESERVAS ----------
  cancelarReserva(r: Reserva): void {
    if (!confirm(`¿Cancelar la reserva de ${r.clienteNombre}?`)) return;
    this.ejecutar(() => this.reservaService.cancelarReserva(r.id!), 'Reserva cancelada.');
  }

  marcarAtendida(r: Reserva): void {
    this.ejecutar(() => this.reservaService.marcarAtendida(r.id!), 'Reserva marcada como atendida.');
  }

  limpiarFiltros(): void {
    this.filtroFecha.set('');
    this.filtroEstado.set('');
  }

  // "Atendida" solo se ofrece cuando la cita ya terminó
  puedeAtender(r: Reserva): boolean {
    return r.fin <= Date.now();
  }

  // Carga servicios, barberos y reservas ficticias cuando Firestore está vacío
  sembrarDatos(): void {
    this.ejecutar(async () => {
      await this.servicioService.sembrarDatos();
      await this.reservaService.sembrarReservasEjemplo();
    }, 'Datos de ejemplo cargados: servicios, barberos y reservas de prueba (horarios ocupados).');
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'CONFIRMADA': return 'badge-confirmada';
      case 'CANCELADA': return 'badge-cancelada';
      default: return 'badge-atendida';
    }
  }

  // ---------- SERVICIOS ----------
  editarServicio(s: Servicio): void {
    this.editandoId.set(s.id!);
    this.servicioForm.setValue({
      nombre: s.nombre,
      descripcion: s.descripcion,
      duracionMinutos: s.duracionMinutos,
      precio: s.precio
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.servicioForm.reset({ nombre: '', descripcion: '', duracionMinutos: 30, precio: 0 });
  }

  guardarServicio(): void {
    if (this.servicioForm.invalid) {
      this.servicioForm.markAllAsTouched();
      this.error.set('Revisa los datos del servicio.');
      return;
    }
    const datos = this.servicioForm.getRawValue();
    const id = this.editandoId();

    if (id) {
      this.ejecutar(async () => {
        await this.servicioService.actualizarServicio(id, datos);
        this.cancelarEdicion();
      }, 'Servicio actualizado.');
    } else {
      this.ejecutar(async () => {
        await this.servicioService.crearServicio({ ...datos, activo: true });
        this.cancelarEdicion();
      }, 'Servicio creado.');
    }
  }

  alternarServicio(s: Servicio): void {
    this.ejecutar(
      () => this.servicioService.cambiarEstadoServicio(s.id!, !s.activo),
      s.activo ? 'Servicio desactivado.' : 'Servicio activado.'
    );
  }

  // ---------- DISPONIBILIDAD DE BARBEROS ----------
  guardarHorario(b: Barbero, horaInicio: string, horaFin: string): void {
    this.ejecutar(
      () => this.reservaService.cambiarHorarioBarbero(b.id!, horaInicio, horaFin),
      'Horario de ' + b.nombre + ' actualizado.'
    );
  }

  alternarBarbero(b: Barbero): void {
    this.ejecutar(
      () => this.servicioService.cambiarEstadoBarbero(b.id!, !b.activo),
      b.activo ? 'Barbero desactivado.' : 'Barbero activado.'
    );
  }
}