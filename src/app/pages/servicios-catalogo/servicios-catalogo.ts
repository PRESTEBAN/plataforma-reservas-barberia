import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicioService } from '../../services/servicio.service';
import { Barbero, Servicio } from '../../services/models';

@Component({
  selector: 'app-servicios-catalogo',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './servicios-catalogo.html',
  styleUrl: './servicios-catalogo.css'
})
export class ServiciosCatalogoComponent implements OnInit {
  private servicioService = inject(ServicioService);

  servicios = signal<Servicio[]>([]);
  barberos = signal<Barbero[]>([]);
  cargando = signal(true);
  error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      // Servicios y barberos activos guardados en Firestore
      this.servicios.set(await this.servicioService.listarServicios(true));
      this.barberos.set(await this.servicioService.listarBarberos(true));
    } catch {
      this.error.set('No se pudo cargar el catálogo. Intenta de nuevo más tarde.');
    } finally {
      this.cargando.set(false);
    }
  }
}