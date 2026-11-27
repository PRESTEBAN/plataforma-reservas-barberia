import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ServicioService } from '../../services/servicio.service';

@Component({
  selector: 'app-servicios-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './servicios-catalogo.html',
  styleUrl: './servicios-catalogo.css'
})
export class ServiciosCatalogoComponent implements OnInit {
  servicios: any[] = [];
  barberos: any[] = [];
  cargando: boolean = true;

  constructor(
    private servicioService: ServicioService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Consume la lista de servicios y barberos guardados en Firestore
      this.servicios = await this.servicioService.listarServicios(true);
      this.barberos = await this.servicioService.listarBarberos(true);
      this.cargando = false;
      this.cdr.markForCheck();
    } catch (e) {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }
}