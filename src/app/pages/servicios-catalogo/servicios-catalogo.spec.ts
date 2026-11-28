import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ServiciosCatalogoComponent } from './servicios-catalogo';

describe('ServiciosCatalogoComponent', () => {
  let component: ServiciosCatalogoComponent;
  let fixture: ComponentFixture<ServiciosCatalogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiciosCatalogoComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiciosCatalogoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });
});