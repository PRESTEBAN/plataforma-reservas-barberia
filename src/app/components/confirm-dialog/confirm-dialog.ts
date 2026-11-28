import {AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, input, output} from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css'
})
export class ConfirmDialogComponent implements AfterViewInit, OnDestroy {
  titulo = input('¿Estás seguro?');
  mensaje = input('');
  textoConfirmar = input('Confirmar');
  textoCancelar = input('Volver');
  procesando = input(false);

  confirmar = output<void>();
  cancelar = output<void>();

  @ViewChild('btnCancelar') private btnCancelar?: ElementRef<HTMLButtonElement>;
  @ViewChild('btnConfirmar') private btnConfirmar?: ElementRef<HTMLButtonElement>;

  private elementoPrevio = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    document.body.style.overflow = 'hidden'; 
    this.btnCancelar?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.elementoPrevio?.focus?.();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar();
  }

  cerrar(): void {
    if (!this.procesando()) this.cancelar.emit();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const botones = [this.btnCancelar?.nativeElement, this.btnConfirmar?.nativeElement]
      .filter((b): b is HTMLButtonElement => !!b && !b.disabled);
    if (botones.length === 0) {
      e.preventDefault();
      return;
    }
    const primero = botones[0];
    const ultimo = botones[botones.length - 1];
    const activo = document.activeElement;
    if (e.shiftKey && activo === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }
}