import { Injectable, computed, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Usuario } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario = signal<Usuario | null>(null);
  esAdmin = computed(() => this.usuario()?.rol === 'admin');

  private registrando = false;
  private listoPromise: Promise<void>;

  constructor() {
    this.listoPromise = new Promise<void>((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (this.registrando) {
          resolve();
          return;
        }
        try {
          if (user) {
            const snap = await getDoc(doc(db, 'usuarios', user.uid));
            this.usuario.set(snap.exists() ? ({ ...snap.data(), uid: user.uid } as Usuario) : null);
          } else {
            this.usuario.set(null);
          }
        } catch {
          // Si Firestore falla, igual se libera la espera para que los guards no queden bloqueados
          this.usuario.set(null);
        }
        resolve();
      });
    });
  }


  esperarListo(): Promise<void> {
    return this.listoPromise;
  }

  async registrar(nombre: string, email: string, password: string): Promise<void> {
    this.registrando = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // El registro público SIEMPRE crea clientes.
      const usuario: Usuario = { uid: cred.user.uid, nombre, email, rol: 'cliente' };
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      });
      this.usuario.set(usuario);
    } catch (e) {
      throw new Error(this.traducirError(e));
    } finally {
      this.registrando = false;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        throw new Error('Tu cuenta no tiene un perfil en el sistema. Regístrate de nuevo o contacta al administrador.');
      }
      this.usuario.set({ ...snap.data(), uid: cred.user.uid } as Usuario);
    } catch (e) {
      throw new Error(this.traducirError(e));
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.usuario.set(null);
  }

  private traducirError(e: any): string {
    if (e instanceof Error && !(e as any).code) {
      return e.message; // mensajes propios de esta clase
    }
    switch (e?.code) {
      case 'auth/email-already-in-use':
        return 'Ese correo ya está registrado.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo o contraseña incorrectos.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'El correo no es válido.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
      default:
        return 'No se pudo completar la operación. Intenta de nuevo.';
    }
  }
}