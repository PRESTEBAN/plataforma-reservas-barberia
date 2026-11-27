import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  mensajeError: string = '';
  cargando = false;

  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit(): Promise<void> {
    this.mensajeError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.mensajeError = 'Ingresa un correo y una contraseña válidos.';
      return;
    }

    this.cargando = true;
    try {
      const { email, password } = this.loginForm.value;
      await this.auth.login(email, password);
      this.router.navigate([this.auth.esAdmin() ? '/admin' : '/servicios']);
    } catch (e: any) {
      this.mensajeError = e.message;
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }
}