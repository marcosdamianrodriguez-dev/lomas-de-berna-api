// ============================================================
//  LOMAS DE BERNA · API SERVER
//  Subilo a Railway tal cual está, sin tocar nada.
// ============================================================

const http = require('http');
const PORT = process.env.PORT || 3000;

// ============================================================
//  DATOS DE TUS CABAÑAS — EDITÁ ESTA SECCIÓN
//  Cada vez que cambie una tarifa o disponibilidad,
//  editás acá y Railway lo actualiza solo en minutos.
// ============================================================

const CABANAS = [
  {
    id: 'cabana-1',
    nombre: 'Cabaña El Roble',
    capacidad: 2,
    descripcion: 'Cabaña para 2 personas con vista a las sierras, jacuzzi y parrilla propia.',
    estado: 'disponible', // 'disponible' u 'ocupada'
  },
  {
    id: 'cabana-2',
    nombre: 'Cabaña El Pino',
    capacidad: 4,
    descripcion: 'Cabaña para 4 personas con living amplio, 2 habitaciones y deck.',
    estado: 'disponible',
  },
  {
    id: 'cabana-3',
    nombre: 'Cabaña La Cascada',
    capacidad: 4,
    descripcion: 'Cabaña para 4 personas frente al arroyo, con fogón exterior.',
    estado: 'ocupada',
  },
];

const TARIFAS = [
  {
    nombre: 'Entre semana (lun-jue)',
    cabana: 'todas',
    capacidad: 2,
    precio_por_noche: 95000,
    precio_finde: null,
    condiciones: 'Mínimo 2 noches.',
  },
  {
    nombre: 'Fin de semana (vie-dom)',
    cabana: 'todas',
    capacidad: 2,
    precio_por_noche: 130000,
    precio_finde: 130000,
    condiciones: 'Mínimo 2 noches.',
  },
  {
    nombre: 'Entre semana (lun-jue)',
    cabana: 'todas',
    capacidad: 4,
    precio_por_noche: 145000,
    precio_finde: null,
    condiciones: 'Mínimo 2 noches.',
  },
  {
    nombre: 'Fin de semana (vie-dom)',
    cabana: 'todas',
    capacidad: 4,
    precio_por_noche: 190000,
    precio_finde: 190000,
    condiciones: 'Mínimo 2 noches.',
  },
  {
    nombre: 'Semana completa',
    cabana: 'todas',
    capacidad: 'todas',
    precio_por_noche: 85000,
    precio_finde: null,
    condiciones: '7 noches corridas. 10% de descuento incluido.',
  },
  {
    nombre: 'Finde XL (jue-dom)',
    cabana: 'todas',
    capacidad: 'todas',
    precio_por_noche: null,
    precio_finde: 170000,
    condiciones: 'Paquete 3 noches. Incluye tabla de bienvenida.',
  },
];

const PROMO_ACTIVA = {
  activa: true,
  descripcion: 'Reservando 4 noches te regalamos: tabla de bienvenida, vino y late check-out.',
  condicion: 'Mínimo 4 noches consecutivas.',
};

const INFO_COMPLEJO = {
  nombre: 'Lomas de Berna',
  ubicacion: 'Villa Berna, Valle de Calamuchita, Córdoba',
  descripcion: 'Complejo de cabañas en las sierras cordobesas. Incluye restaurante Lomitas Casa de Té.',
  contacto_reservas: 'WhatsApp o plataforma de reserva online',
  web: 'https://tripy-v1.vercel.app/lomas-de-berna',
  checkin: '14:00 hs',
  checkout: '10:00 hs',
};

// ============================================================
//  LÓGICA DE RESPUESTA AUTOMÁTICA PARA WHATSAPP
//  Claude usa esto para generar respuestas inteligentes.
// ============================================================

function generarContexto() {
  const disponibles = CABANAS.filter(c => c.estado === 'disponible');
  const ocupadas = CABANAS.filter(c => c.estado === 'ocupada');

  return {
    complejo: INFO_COMPLEJO,
    disponibilidad: {
      resumen: `${disponibles.length} cabaña(s) disponible(s) de ${CABANAS.length} en total`,
      disponibles: disponibles,
      ocupadas: ocupadas.map(c => c.nombre),
    },
    tarifas: TARIFAS,
    promo: PROMO_ACTIVA,
    actualizado: new Date().toISOString(),
  };
}

function generarRespuestaWA(mensaje) {
  const msg = mensaje.toLowerCase();
  const ctx = generarContexto();
  const disponibles = ctx.disponibilidad.disponibles;

  // Detectar tipo de consulta
  const esDisponibilidad = /disponib|libre|hay lugar|tienen caba|ocupad|cuando|para cuándo|para cuando/i.test(msg);
  const esTarifa = /tarifa|precio|cuánto|cuanto|cuesta|valor|cobran|cuanto sale/i.test(msg);
  const esReserva = /reserv|quiero|me anoto|apartá|apartar|confirmar/i.test(msg);
  const esSaludo = /^(hola|buenas|buen día|buen dia|buenas tardes|buenas noches|hi|buenos)/i.test(msg.trim());
  const esInfo = /dónde|donde|ubicación|ubicacion|dirección|direccion|cómo llegar|como llegar/i.test(msg);
  const esPersonas = /(\d+)\s*persona|para (\d+)|somos (\d+)/i.test(msg);

  if (esSaludo && !esDisponibilidad && !esTarifa) {
    return {
      tipo: 'bienvenida',
      respuesta: `¡Hola! 👋 Bienvenido/a a *Lomas de Berna* ⛰️\n\nSomos un complejo de cabañas en *Villa Berna, Córdoba*, rodeados de sierras y naturaleza 🌲\n\n¿En qué te podemos ayudar?\n\n1️⃣ Consultar disponibilidad\n2️⃣ Ver tarifas\n3️⃣ Información del complejo\n4️⃣ Hacer una reserva\n\n¡Escribinos! 😊`,
    };
  }

  if (esDisponibilidad) {
    if (disponibles.length === 0) {
      return {
        tipo: 'sin_disponibilidad',
        respuesta: `¡Hola! 😊 Gracias por escribirnos.\n\nLamentablemente *no tenemos cabañas disponibles* en este momento 😔\n\nPodemos anotarte en lista de espera o buscar fechas alternativas. ¿Te interesa?\n\n📱 Escribinos y lo vemos juntos 🙌`,
      };
    }
    const lista = disponibles.map(c => `🏠 *${c.nombre}* — ${c.capacidad} personas\n   _${c.descripcion}_`).join('\n\n');
    return {
      tipo: 'disponibilidad',
      respuesta: `¡Hola! 👋 Gracias por escribirnos a *Lomas de Berna* ⛰️\n\nTenemos *${disponibles.length} cabaña(s) disponible(s)*:\n\n${lista}\n\n¿Qué fechas tenés en mente? Así te confirmo y te paso el detalle de tarifas 🙌`,
    };
  }

  if (esTarifa) {
    const tarifas2 = TARIFAS.filter(t => t.capacidad === 2 || t.capacidad === 'todas').slice(0, 3);
    const tarifas4 = TARIFAS.filter(t => t.capacidad === 4 || t.capacidad === 'todas').slice(0, 3);
    const lista2 = tarifas2.map(t => `📌 *${t.nombre}* (2 personas)\n   $${(t.precio_por_noche || t.precio_finde).toLocaleString('es-AR')}/noche`).join('\n');
    const lista4 = tarifas4.map(t => `📌 *${t.nombre}* (4 personas)\n   $${(t.precio_por_noche || t.precio_finde).toLocaleString('es-AR')}/noche`).join('\n');
    const promo = ctx.promo.activa ? `\n\n🎁 *Promo activa:* ${ctx.promo.descripcion}` : '';
    return {
      tipo: 'tarifa',
      respuesta: `¡Hola! 😊 Te paso nuestras tarifas:\n\n*Para 2 personas:*\n${lista2}\n\n*Para 4 personas:*\n${lista4}${promo}\n\n*Check-in:* ${INFO_COMPLEJO.checkin} · *Check-out:* ${INFO_COMPLEJO.checkout}\n\n¿Te interesa reservar? Escribinos las fechas 📅`,
    };
  }

  if (esInfo) {
    return {
      tipo: 'info',
      respuesta: `📍 *Lomas de Berna*\n*Villa Berna, Valle de Calamuchita, Córdoba*\n\n🏠 Cabañas para 2 y 4 personas\n🫖 Restaurante Lomitas Casa de Té\n\n*Check-in:* ${INFO_COMPLEJO.checkin}\n*Check-out:* ${INFO_COMPLEJO.checkout}\n\n🌐 Reservá online: ${INFO_COMPLEJO.web}\n\n¿Querés saber sobre disponibilidad o tarifas? 😊`,
    };
  }

  if (esReserva) {
    return {
      tipo: 'reserva',
      respuesta: `¡Excelente! 🎉 Para reservar necesitamos:\n\n📅 *Fechas* (entrada y salida)\n👥 *Cantidad de personas*\n👤 *Nombre completo*\n📱 *Teléfono de contacto*\n\nEnvianos esos datos y te confirmamos la disponibilidad y el total 🙌`,
    };
  }

  // Respuesta genérica con Claude para mensajes complejos
  return {
    tipo: 'generico',
    respuesta: null, // Claude genera la respuesta con el contexto completo
    contexto: ctx,
  };
}

// ============================================================
//  SERVIDOR HTTP — NO TOQUES NADA DE ACÁ PARA ABAJO
// ============================================================

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

function json(res, data, status = 200) {
  cors(res);
  res.writeHead(status);
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/disponibilidad
  if (req.method === 'GET' && path === '/api/disponibilidad') {
    const disponibles = CABANAS.filter(c => c.estado === 'disponible');
    json(res, {
      ok: true,
      total_cabanas: CABANAS.length,
      disponibles: disponibles.length,
      cabanas: CABANAS,
      actualizado: new Date().toISOString(),
    });
    return;
  }

  // GET /api/tarifas
  if (req.method === 'GET' && path === '/api/tarifas') {
    json(res, {
      ok: true,
      tarifas: TARIFAS,
      promo: PROMO_ACTIVA,
      checkin: INFO_COMPLEJO.checkin,
      checkout: INFO_COMPLEJO.checkout,
    });
    return;
  }

  // GET /api/estado — todo junto
  if (req.method === 'GET' && path === '/api/estado') {
    json(res, { ok: true, ...generarContexto() });
    return;
  }

  // POST /api/consulta — recibe mensaje de WhatsApp, devuelve respuesta lista
  if (req.method === 'POST' && path === '/api/consulta') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { mensaje, telefono } = JSON.parse(body || '{}');
        if (!mensaje) {
          json(res, { ok: false, error: 'Falta el campo "mensaje"' }, 400);
          return;
        }
        const resultado = generarRespuestaWA(mensaje);
        json(res, {
          ok: true,
          telefono: telefono || null,
          tipo: resultado.tipo,
          respuesta: resultado.respuesta,
          contexto: resultado.contexto || generarContexto(),
        });
      } catch (e) {
        json(res, { ok: false, error: 'JSON inválido' }, 400);
      }
    });
    return;
  }

  // GET / — salud del servidor
  if (path === '/' || path === '/health') {
    json(res, {
      ok: true,
      servicio: 'Lomas de Berna API',
      version: '1.0',
      endpoints: [
        'GET  /api/disponibilidad',
        'GET  /api/tarifas',
        'GET  /api/estado',
        'POST /api/consulta',
      ],
    });
    return;
  }

  json(res, { ok: false, error: 'Endpoint no encontrado' }, 404);
});

server.listen(PORT, () => {
  console.log(`✅ Lomas de Berna API corriendo en puerto ${PORT}`);
});