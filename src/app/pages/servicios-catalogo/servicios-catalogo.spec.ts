import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiciosCatalogo } from './servicios-catalogo';

describe('ServiciosCatalogo', () => {
  let component: ServiciosCatalogo;
  let fixture: ComponentFixture<ServiciosCatalogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiciosCatalogo],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiciosCatalogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
