import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReservaService } from '../../services/reserva.service';
import { ServicioService } from '../../services/servicio.service';
import { Barbero, Servicio } from '../../services/models';
import { fechaATexto } from '../../services/horarios';

// Validador propio: la fecha elegida no puede ser anterior a hoy
function fechaNoPasada(control: AbstractControl): ValidationErrors | null {
  if (control.value && control.value < fechaATexto(new Date())) {
    return { fechaPasada: true };
  }
  return null;
}

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

  servicios = signal<Servicio[]>([]);
  barberos = signal<Barbero[]>([]);
  // Horas libres para el servicio, barbero y fecha elegidos
  horas = signal<string[]>([]);
  buscandoHoras = signal(false);
  cargando = signal(false);
  mensajeExito = signal('');
  mensajeError = signal('');
  fechaMinima = fechaATexto(new Date());

  reservaForm = this.fb.nonNullable.group({
    servicioId: ['', Validators.required],
    barberoId: ['', Validators.required],
    fecha: ['', [Validators.required, fechaNoPasada]],
    hora: ['', Validators.required]
  });

  async ngOnInit(): Promise<void> {
    // Si viene del catálogo, el servicio ya queda seleccionado
    const servicioId = this.route.snapshot.queryParamMap.get('servicioId');
    const barberoId = this.route.snapshot.queryParamMap.get('barberoId');
    if (servicioId) {
      this.reservaForm.patchValue({ servicioId });
    }
    if (barberoId) {
      this.reservaForm.patchValue({ barberoId });
    }

    // Cuando cambia el servicio, el barbero o la fecha se vuelven a calcular las horas libres
    this.reservaForm.controls.servicioId.valueChanges.subscribe(() => this.actualizarHoras());
    this.reservaForm.controls.barberoId.valueChanges.subscribe(() => this.actualizarHoras());
    this.reservaForm.controls.fecha.valueChanges.subscribe(() => this.actualizarHoras());

    try {
      this.servicios.set(await this.servicioService.listarServicios(true));
      this.barberos.set(await this.servicioService.listarBarberos(true));
    } catch {
      this.mensajeError.set('Error al cargar servicios y barberos.');
    }
    this.actualizarHoras();
  }

  campoInvalido(nombre: 'servicioId' | 'barberoId' | 'fecha' | 'hora'): boolean {
    const campo = this.reservaForm.controls[nombre];
    return campo.invalid && campo.touched;
  }

  // true cuando ya se eligió todo lo necesario para consultar horas
  get listoParaBuscar(): boolean {
    const { servicioId, barberoId, fecha } = this.reservaForm.getRawValue();
    return !!servicioId && !!barberoId && !!fecha && fecha >= this.fechaMinima;
  }

  // Consulta en Firestore las horas libres del barbero para ese servicio y esa fecha
  async actualizarHoras(): Promise<void> {
    const { servicioId, barberoId, fecha, hora } = this.reservaForm.getRawValue();

    if (!this.listoParaBuscar) {
      this.horas.set([]);
      this.reservaForm.controls.hora.setValue('');
      return;
    }

    this.buscandoHoras.set(true);
    try {
      this.horas.set(await this.reservaService.horariosDisponibles(barberoId, servicioId, fecha));
    } catch {
      this.horas.set([]);
      this.mensajeError.set('No se pudieron consultar los horarios disponibles.');
    } finally {
      this.buscandoHoras.set(false);
    }

    // Si la hora elegida ya no está libre, se limpia
    if (hora && !this.horas().includes(hora)) {
      this.reservaForm.controls.hora.setValue('');
    }
  }

  async onSubmit(): Promise<void> {
    this.mensajeExito.set('');
    this.mensajeError.set('');

    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.mensajeError.set('Revisa los campos marcados antes de confirmar.');
      return;
    }

    const { servicioId, barberoId, fecha, hora } = this.reservaForm.getRawValue();
    this.cargando.set(true);
    try {
      // El servicio de reservas aplica la regla: fecha futura, dentro del horario y sin cruces
      await this.reservaService.crearReserva({ servicioId, barberoId, fechaHora: fecha + 'T' + hora });
      this.mensajeExito.set('¡Listo, mi pana! Tu cita fue reservada con éxito.');
      setTimeout(() => this.router.navigate(['/mis-reservas']), 1500);
    } catch (e: any) {
      this.mensajeError.set(e.message || 'Error al procesar la reserva.');
    } finally {
      this.cargando.set(false);
      await this.actualizarHoras(); // la hora reservada deja de aparecer como libre
    }
  }
}