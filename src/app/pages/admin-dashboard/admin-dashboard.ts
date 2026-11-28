import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReservaService } from '../../services/reserva.service';
import { ServicioService } from '../../services/servicio.service';
import { Barbero, Reserva, Servicio } from '../../services/models';
import { horarioDe, resumenHorario } from '../../services/horarios';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ConfirmDialogComponent],
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

  reservaPorCancelar = signal<Reserva | null>(null);
  cancelando = signal(false);

  barberoEditandoId = signal<string | null>(null);
  diasSeleccionados = signal<number[]>([]);
  readonly diasSemana = [
    { valor: 1, etiqueta: 'Lunes' },
    { valor: 2, etiqueta: 'Martes' },
    { valor: 3, etiqueta: 'Miércoles' },
    { valor: 4, etiqueta: 'Jueves' },
    { valor: 5, etiqueta: 'Viernes' },
    { valor: 6, etiqueta: 'Sábado' },
    { valor: 0, etiqueta: 'Domingo' }
  ];

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
  barberoEditando = computed(() => this.barberos().find((b) => b.id === this.barberoEditandoId()) ?? null);

  servicioForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(5)]],
    duracionMinutos: [30, [Validators.required, Validators.min(10), Validators.max(240)]],
    precio: [0, [Validators.required, Validators.min(0)]]
  });

  horarioForm = this.fb.nonNullable.group({
    inicio: ['09:00', [Validators.required]],
    fin: ['19:00', [Validators.required]]
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pedirCancelacion(r: Reserva): void {
    this.reservaPorCancelar.set(r);
  }

  cerrarDialogo(): void {
    if (this.cancelando()) return;
    this.reservaPorCancelar.set(null);
  }

  async confirmarCancelacion(): Promise<void> {
    const r = this.reservaPorCancelar();
    if (!r) return;

    this.cancelando.set(true);
    await this.ejecutar(() => this.reservaService.cancelarReserva(r.id!), 'Reserva cancelada.');
    this.cancelando.set(false);
    this.reservaPorCancelar.set(null);
  }

  marcarAtendida(r: Reserva): void {
    this.ejecutar(() => this.reservaService.marcarAtendida(r.id!), 'Reserva marcada como atendida.');
  }

  puedeMarcarAtendida(r: Reserva): boolean {
    return r.estado === 'CONFIRMADA' && r.fin <= Date.now();
  }

  limpiarFiltros(): void {
    this.filtroFecha.set('');
    this.filtroEstado.set('');
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'CONFIRMADA': return 'badge-confirmada';
      case 'CANCELADA': return 'badge-cancelada';
      default: return 'badge-atendida';
    }
  }

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

  alternarBarbero(b: Barbero): void {
    this.ejecutar(
      () => this.servicioService.cambiarEstadoBarbero(b.id!, !b.activo),
      b.activo ? 'Barbero desactivado.' : 'Barbero activado.'
    );
  }

  resumen(b: Barbero): string {
    return resumenHorario(horarioDe(b));
  }

  editarHorario(b: Barbero): void {
    const h = horarioDe(b);
    this.barberoEditandoId.set(b.id!);
    this.diasSeleccionados.set([...h.dias]);
    this.horarioForm.setValue({ inicio: h.inicio, fin: h.fin });
  }

  cancelarEdicionHorario(): void {
    this.barberoEditandoId.set(null);
    this.diasSeleccionados.set([]);
  }

  alternarDia(dia: number): void {
    const actuales = this.diasSeleccionados();
    this.diasSeleccionados.set(
      actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia]
    );
  }

  guardarHorario(): void {
    const id = this.barberoEditandoId();
    if (!id) return;
    if (this.horarioForm.invalid) {
      this.horarioForm.markAllAsTouched();
      this.error.set('Indica la hora de inicio y la hora de fin.');
      return;
    }
    const { inicio, fin } = this.horarioForm.getRawValue();
    const horario = { dias: [...this.diasSeleccionados()].sort((a, b) => a - b), inicio, fin };

    this.ejecutar(async () => {
      await this.servicioService.actualizarHorarioBarbero(id, horario);
      this.cancelarEdicionHorario();
    }, 'Disponibilidad actualizada.');
  }
}