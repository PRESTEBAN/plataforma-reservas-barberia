// Prototipo inicial: interacción con JavaScript puro (sin Angular ni base de datos).
// Hace tres cosas: filtra servicios, calcula la hora de fin de la cita y valida el formulario.
// En Angular estas funciones pasaron a: filtro -> señales del catálogo, hora de fin -> generarHorarios()
// en services/horarios.ts, validación -> Validators de los formularios reactivos.

var formulario = document.getElementById('reservaForm');
var mensaje = document.getElementById('mensaje');
var resumen = document.getElementById('resumen');
var campoFecha = document.getElementById('fecha');
var campoServicio = document.getElementById('servicio');

// ---------- 1. Filtrar servicios mientras se escribe ----------
var buscador = document.getElementById('buscador');
var tarjetas = document.querySelectorAll('#listaServicios .card');
var sinResultados = document.getElementById('sinResultados');

buscador.addEventListener('input', function () {
    var texto = buscador.value.trim().toLowerCase();
    var visibles = 0;
    for (var i = 0; i < tarjetas.length; i++) {
        var coincide = tarjetas[i].dataset.nombre.toLowerCase().indexOf(texto) !== -1;
        tarjetas[i].hidden = !coincide;
        if (coincide) {
            visibles++;
        }
    }
    sinResultados.hidden = visibles > 0;
});

// ---------- 2. La fecha mínima es "ahora": no se reserva en el pasado ----------
function fechaMinima() {
    var ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    return ahora.toISOString().slice(0, 16);
}
campoFecha.min = fechaMinima();

// ---------- 3. Calcular la hora de fin según la duración del servicio ----------
function dosDigitos(n) {
    return n < 10 ? '0' + n : String(n);
}

function actualizarResumen() {
    var opcion = campoServicio.options[campoServicio.selectedIndex];
    if (campoServicio.value === '' || campoFecha.value === '') {
        resumen.textContent = '';
        return;
    }
    var inicio = new Date(campoFecha.value);
    var fin = new Date(inicio.getTime() + Number(opcion.dataset.min) * 60000);
    resumen.textContent = 'Tu cita termina a las ' + dosDigitos(fin.getHours()) + ':' + dosDigitos(fin.getMinutes()) +
        ' · Precio: $' + Number(opcion.dataset.precio).toFixed(2);
}
campoServicio.addEventListener('change', actualizarResumen);
campoFecha.addEventListener('input', actualizarResumen);

function mostrar(texto, esError) {
    mensaje.textContent = texto;
    mensaje.className = esError ? 'error' : 'exito';
}

// ---------- 4. Validar el formulario ----------
formulario.addEventListener('submit', function (e) {
    e.preventDefault();

    var nombre = document.getElementById('cliente').value.trim();
    var servicio = campoServicio.value;
    var barbero = document.getElementById('barbero').value;
    var fecha = campoFecha.value;

    if (nombre.length < 3) {
        mostrar('Escribe tu nombre completo (mínimo 3 letras).', true);
    } else if (servicio === '' || barbero === '') {
        mostrar('Elige un servicio y un barbero.', true);
    } else if (fecha === '' || new Date(fecha) <= new Date()) {
        mostrar('Elige una fecha y hora futuras.', true);
    } else {
        mostrar('Prototipo: reserva validada correctamente para ' + nombre + '. (No se guarda: es solo la interfaz inicial.)', false);
        formulario.reset();
        resumen.textContent = '';
    }
});