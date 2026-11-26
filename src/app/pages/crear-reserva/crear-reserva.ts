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

  servicios = [
    { id: '1', nombre: 'Corte TAURUS al Pelito', duracionMinutos: 30, precio: 8.00 },
    { id: '2', nombre: 'Corte + Barba de Caballero', duracionMinutos: 45, precio: 12.00 },
    { id: '3', nombre: 'Perfilado de Barba Express', duracionMinutos: 20, precio: 5.00 }
  ];

  // Los 4 barberos reales de BARBERÍA TAURUS
  barberos = [
    { id: 'b1', nombre: 'Efren (Master Fade)', activo: true },
    { id: 'b2', nombre: 'Edgardo (Estilos Clásicos)', activo: true },
    { id: 'b3', nombre: 'Julio (Perfilado de Barba)', activo: true },
    { id: 'b4', nombre: 'Carlos (Tratamientos)', activo: true }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
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
    });
  }

  onSubmit(): void {
    this.mensajeExito = '';
    this.mensajeError = '';

    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.mensajeError = 'Por favor, llena todos los campos, mi pana.';
      return;
    }

    const datosReserva = this.reservaForm.value;
    console.log('Reserva registrada en TAURUS:', datosReserva);

    this.mensajeExito = '¡Listo, mi pana! Tu cita fue reservada con éxito. Vamos a dejar ese corte al pelo.';
    
    setTimeout(() => {
      this.router.navigate(['/mis-reservas']);
    }, 2000);
  }
}