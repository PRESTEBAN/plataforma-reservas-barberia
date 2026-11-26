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

  // Datos temporales de prueba para la interfaz
  servicios = [
    { id: '1', nombre: 'Corte Tradicional', duracionMinutos: 30, precio: 8.00 },
    { id: '2', nombre: 'Corte + Perfilado de Barba', duracionMinutos: 45, precio: 12.00 },
    { id: '3', nombre: 'Barba Express', duracionMinutos: 20, precio: 5.00 }
  ];

  barberos = [
    { id: 'b1', nombre: 'Carlos (Barbero Principal)', activo: true },
    { id: 'b2', nombre: 'Mateo (Especialista en Barba)', activo: true }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Inicializamos el formulario reactivo con sus validaciones
    this.reservaForm = this.fb.group({
      clienteNombre: ['', [Validators.required, Validators.minLength(3)]],
      clienteEmail: ['', [Validators.required, Validators.email]],
      servicioId: ['', [Validators.required]],
      barberoId: ['', [Validators.required]],
      fechaHora: ['', [Validators.required]]
    });

    // Si el usuario viene desde el botón "Reservar Este Servicio" del catálogo, seleccionamos el servicio automáticamente
    this.route.queryParams.subscribe(params => {
      if (params['servicioId']) {
        this.reservaForm.patchValue({ servicioId: params['servicioId'] });
      }
    });
  }

  // Método que procesa el envío del formulario
  onSubmit(): void {
    this.mensajeExito = '';
    this.mensajeError = '';

    if (this.reservaForm.invalid) {
      this.reservaForm.markAllAsTouched();
      this.mensajeError = 'Por favor, completa todos los campos requeridos correctamente.';
      return;
    }

    const datosReserva = this.reservaForm.value;
    console.log('Datos de la reserva a guardar:', datosReserva);

    // Simulación de respuesta exitosa (aquí conectaremos el servicio de Esteban)
    this.mensajeExito = '¡Reserva confirmada con éxito! Redirigiendo a tus reservas...';
    
    setTimeout(() => {
      this.router.navigate(['/mis-reservas']);
    }, 2000);
  }
}