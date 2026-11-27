import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReservaService } from '../../services/reserva.service';
import { ServicioService } from '../../services/servicio.service';

@Component({
  selector: 'app-crear-reserva',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './crear-reserva.html',
  styleUrl: './crear-reserva.css'
})
export class CrearReservaComponent implements OnInit {
  reservaForm!: FormGroup;
  mensajeExito: string = '';
  mensajeError: string = '';
  fechaMinima: string = '';
  cargando: boolean = false;

  servicios: any[] = [];
  barberos: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private reservaService: ReservaService,
    private servicioService: ServicioService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    this.fechaMinima = ahora.toISOString().slice(0, 16);

    this.reservaForm = this.fb.group({
      servicioId: ['', [Validators.required]],
      barberoId: ['', [Validators.required]],
      fechaHora: ['', [Validators.required]]
    });

    try {
      this.servicios = await this.servicioService.listarServicios(true);
      this.barberos = await this.servicioService.listarBarberos(true);

      this.route.queryParams.subscribe(params => {
        if (params['servicioId']) {
          this.reservaForm.patchValue({ servicioId: params['servicioId'] });
        }
        if (params['barberoId']) {
          this.reservaForm.patchValue({ barberoId: params['barberoId'] });
        }
      });
      this.cdr.markForCheck();
    } catch (e: any) {
      this.mensajeError = 'Error al cargar servicios y barberos.';
      this.cdr.markForCheck();
    }
  }

  async onSubmit(): Promise<void> {
    this.mensajeExito = '';
    this.mensajeError = '';

    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.mensajeError = 'Por favor, selecciona todos los campos requeridos.';
      return;
    }

    this.cargando = true;
    this.cdr.markForCheck();

    try {
      await this.reservaService.crearReserva({
        servicioId: this.reservaForm.value.servicioId,
        barberoId: this.reservaForm.value.barberoId,
        fechaHora: this.reservaForm.value.fechaHora
      });

      this.mensajeExito = '¡Listo, mi pana! Tu cita fue reservada con éxito.';
      this.cargando = false;
      this.cdr.markForCheck();

      setTimeout(() => {
        this.router.navigate(['/mis-reservas']);
      }, 1500);
    } catch (e: any) {
      this.mensajeError = e.message || 'Error al procesar la reserva.';
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }
}