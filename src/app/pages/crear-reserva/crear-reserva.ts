import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

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

  servicios = [
    { id: '1', nombre: 'Corte TAURUS Urban', duracionMinutos: 30, precio: 8.00 },
    { id: '2', nombre: 'Corte + Barba Premium', duracionMinutos: 45, precio: 12.00 },
    { id: '3', nombre: 'Barba Express & Contornos', duracionMinutos: 20, precio: 5.00 }
  ];

  barberos = [
    { id: 'b1', nombre: 'Efren (Master Fade)', activo: true },
    { id: 'b2', nombre: 'Edgardo (Tijera Premium)', activo: true },
    { id: 'b3', nombre: 'Julio (Perfilado de Barba)', activo: true },
    { id: 'b4', nombre: 'Carlos (Tratamientos Capilares)', activo: true }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Calculamos el valor mínimo para el input de fecha (ahora mismo)
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    this.fechaMinima = ahora.toISOString().slice(0, 16);

    this.reservaForm = this.fb.group({
      clienteNombre: ['', [Validators.required, Validators.minLength(3)]],
      clienteEmail: ['', [Validators.required, Validators.email]],
      servicioId: ['', [Validators.required]],
      barberoId: ['', [Validators.required]],
      fechaHora: ['', [Validators.required]]
    });

    this.route.queryParams.subscribe(params => {
      if (params['servicioId']) {
        this.reservaForm.patchValue({ servicioId: params['servicioId'] });
      }
      if (params['barberoId']) {
        this.reservaForm.patchValue({ barberoId: params['barberoId'] });
      }
    });
  }

  onSubmit(): void {
    this.mensajeExito = '';
    this.mensajeError = '';

    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.mensajeError = 'Por favor, llena todos los campos correctamente, mi pana.';
      return;
    }

    const datosReserva = this.reservaForm.value;
    console.log('Reserva procesada en TAURUS:', datosReserva);

    this.mensajeExito = '¡Listo, mi pana! Tu cita fue reservada con éxito. Vamos a dejar ese corte al pelo.';
    
    setTimeout(() => {
      this.router.navigate(['/mis-reservas']);
    }, 2000);
  }
}