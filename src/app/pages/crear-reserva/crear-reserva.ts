import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReservaService } from '../../services/reserva.service';
import { ServicioService } from '../../services/servicio.service';
import { Barbero, Servicio } from '../../services/models';
import { horarioDe, hoyNegocio, resumenHorario } from '../../services/horarios';

@Component({
  selector: 'app-crear-reserva',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './crear-reserva.html',
  styleUrl: './crear-reserva.css'
})
export class CrearReservaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private reservaService = inject(ReservaService);
  private servicioService = inject(ServicioService);
  auth = inject(AuthService);

  reservaForm = this.fb.nonNullable.group({
    servicioId: ['', [Validators.required]],
    barberoId: ['', [Validators.required]],
    fecha: ['', [Validators.required]],
    hora: ['', [Validators.required]]
  });

  servicios = signal<Servicio[]>([]);
  barberos = signal<Barbero[]>([]);
  horas = signal<string[]>([]);
  horasCargadas = signal(false);
  cargandoHoras = signal(false);
  cargando = signal(false);
  mensajeExito = signal('');
  mensajeError = signal('');
  fechaMinima = '';

  private ultimaClave = '';
  private horaPendiente = '';
  private consulta = 0;

  async ngOnInit(): Promise<void> {
    this.fechaMinima = hoyNegocio();

    try {
      this.servicios.set(await this.servicioService.listarServicios(true));
      this.barberos.set(await this.servicioService.listarBarberos(true));
    } catch {
      this.mensajeError.set('Error al cargar servicios y barberos.');
      return;
    }

    this.reservaForm.valueChanges.subscribe(() => this.actualizarHoras());

    this.route.queryParams.subscribe((params) => {
      const valores: Partial<{ servicioId: string; barberoId: string; fecha: string }> = {};
      if (params['servicioId']) valores.servicioId = params['servicioId'];
      if (params['barberoId']) valores.barberoId = params['barberoId'];
      if (params['fecha']) valores.fecha = params['fecha'];
      if (params['hora']) this.horaPendiente = params['hora'];
      this.reservaForm.patchValue(valores);
    });
  }

  horarioBarbero(): string {
    const id = this.reservaForm.controls.barberoId.value;
    const barbero = this.barberos().find((b) => b.id === id);
    return barbero ? resumenHorario(horarioDe(barbero)) : '';
  }

  private async actualizarHoras(): Promise<void> {
    const { servicioId, barberoId, fecha } = this.reservaForm.getRawValue();
    const clave = `${servicioId}|${barberoId}|${fecha}`;
    if (clave === this.ultimaClave) return;
    this.ultimaClave = clave;

    this.reservaForm.controls.hora.setValue('');
    this.horas.set([]);
    this.horasCargadas.set(false);

    const servicio = this.servicios().find((s) => s.id === servicioId);
    const barbero = this.barberos().find((b) => b.id === barberoId);
    if (!servicio || !barbero || !fecha) return;

    const consulta = ++this.consulta;
    this.cargandoHoras.set(true);
    try {
      const horas = await this.reservaService.horasDisponibles(servicio, barbero, fecha);
      if (consulta !== this.consulta) return;
      this.horas.set(horas);
      this.horasCargadas.set(true);
      if (this.horaPendiente && horas.includes(this.horaPendiente)) {
        this.reservaForm.controls.hora.setValue(this.horaPendiente);
      }
      this.horaPendiente = '';
    } catch {
      if (consulta === this.consulta) {
        this.mensajeError.set('No se pudieron cargar los horarios disponibles.');
      }
    } finally {
      if (consulta === this.consulta) this.cargandoHoras.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    this.mensajeExito.set('');
    this.mensajeError.set('');

    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.mensajeError.set('Selecciona servicio, barbero, fecha y hora para continuar.');
      return;
    }

    const { servicioId, barberoId, fecha, hora } = this.reservaForm.getRawValue();
    if (!this.auth.usuario()) {
      const returnUrl = this.router
        .createUrlTree(['/reservar'], { queryParams: { servicioId, barberoId, fecha, hora } })
        .toString();
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    this.cargando.set(true);
    try {
      await this.reservaService.crearReserva({ servicioId, barberoId, fechaHora: `${fecha}T${hora}` });
      this.mensajeExito.set('¡Listo! Tu cita fue reservada con éxito.');
      setTimeout(() => this.router.navigate(['/mis-reservas']), 1500);
    } catch (e: any) {
      this.mensajeError.set(e.message || 'Error al procesar la reserva.');
      this.ultimaClave = '';
      await this.actualizarHoras();
    } finally {
      this.cargando.set(false);
    }
  }
}