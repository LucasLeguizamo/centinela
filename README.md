# Centinela

Alertas sísmicas por WhatsApp para quien el teléfono no avisa.

El 10 de agosto de 2026 un M7.4 sacudió Colombia con epicentro en San José del Palmar, Chocó. Los Android sonaron segundos antes. Los iPhone no sonaron: **Apple solo opera alertas sísmicas en Estados Unidos y Taiwán.**

Centinela llena ese hueco por el único canal que todo el mundo ya tiene abierto. Y hace algo que ningún sistema hace hoy: te dice qué tan fuerte se sintió **donde vos estás**, no la magnitud en el epicentro.

## Lo que sí hace y lo que no

Este proyecto **no** es alerta sísmica temprana y no debe presentarse como tal.

Medido contra las APIs públicas: USGS publica un evento entre 93 y 186 segundos después del origen. La onda S llega a Cali desde el Chocó en ~43 s, a Medellín en ~51 s, a Bogotá en ~100 s. **La alerta siempre llega después del temblor.** Google puede avisar antes porque los 2.000 millones de Android *son* la red de sensores; ni la API pública ni WhatsApp cierran esa brecha.

Lo que sí aporta valor real:

| | Ventaja de tiempo | Valor |
|---|---|---|
| Confirmación del evento | ninguna | Corta el pánico y la desinformación cuando las redes colapsan |
| Réplicas | sí | Tras el M7.4 vinieron M5.0, M4.3, M4.2. La gente duerme en la calle días |
| Tsunami | 20–40 min en el Pacífico | Aquí la latencia es irrelevante y salva vidas |
| Intensidad personalizada | — | Un M4 a 10 km de Quibdó importa; el mismo M4 no le importa a Bogotá |

## Fuentes de datos

Todas verificadas en vivo el 15 de agosto de 2026.

| Fuente | Uso | Estado |
|---|---|---|
| USGS FDSN | Detección de eventos, latencia 93–186 s | ✅ operativa |
| EMSC Seismic Portal | Respaldo | ✅ operativa |
| PTWC / NOAA | Boletines de tsunami del Pacífico | ✅ operativa |
| SGC `catalogo_sismos` | — | ❌ congelado en dic-2020 |

El Servicio Geológico Colombiano no expone un feed público en tiempo real. Su catálogo ArcGIS tiene 16.290 registros y el último evento es del 30/12/2020; el resto son formularios PHP. Toca USGS + EMSC.

## La restricción que define la arquitectura

WhatsApp no deja empujar el primer mensaje.

Probado seis veces contra tres números y cuatro plantillas aprobadas: **toda plantilla de categoría MARKETING hacia alguien que nunca le ha escrito al negocio falla con error 131049** — *"not delivered to maintain healthy ecosystem engagement"*. No hay parámetro que lo evite; la condición de desbloqueo es un mensaje entrante.

Consecuencias de diseño, no negociables:

1. **El onboarding empieza con el usuario escribiendo primero.** Link `wa.me` o QR con mensaje precargado. Captar suscriptores empujándoles el primer mensaje no funciona: no llega ninguno.
2. **Toda alerta fuera de la ventana de 24 h va por plantilla UTILITY.** Las UTILITY están exentas del tope 131049. `alerta_sismica` está aprobada y verificada en entrega. Ojo: Meta reclasifica — dos plantillas de este mismo proyecto pasaron de UTILITY a MARKETING solas.
3. **Dentro de la ventana de 24 h, texto libre y gratis.** Ahí vive la conversación: preguntas, explicaciones, derechos de petición.

### Costo

Colombia tiene una de las tarifas más bajas del mundo para plantillas *utility*: **≈ US$0,0008 por mensaje entregado**. Diez mil alertas cuestan 8 dólares. El canal no es el costo; el costo es la inferencia del modelo, y solo se paga sobre lo que ya pasó el filtro determinístico.

## Estructura

```
BACKLOG.md                      Backlog priorizado del hackathon
src/sismos.js                   Detección USGS + intensidad por ubicación
src/alertar.js                  Ciclo de alertas (agrupa réplicas)
src/responder.js                Preguntas de seguimiento
src/tsunami.js                  Boletines del PTWC para la costa Pacífica
src/suscribir.js                Sincroniza las suscripciones del onboarding
src/whatsapp.js                 Envío, plantillas y ventana de 24 h
src/comparar.js                 Un sismo visto desde varias ciudades
workflows/onboarding/           Flujo de suscripción por WhatsApp
docs/ONBOARDING.md              Cómo se capta y por qué así
docs/DEMO.md                    Guion de demo, 3 minutos
docs/prd-contratacion.html      PRD de contratación pública (parqueado)
```

## Parqueado

Este proyecto nació mirando contratación pública del SECOP II. Ese frente tiene PRD completo en `docs/prd-contratacion.html` y cuatro señales de riesgo ya validadas contra datos reales — quedó fuera del alcance por decisión de producto, no por falta de viabilidad.

## Desarrollo

```bash
pnpm install
pnpm test                          # autochequeo de geometría y umbrales

node src/alertar.js --seco         # ciclo de alertas sin enviar nada
node src/alertar.js                # revisa y envía de verdad
node src/alertar.js --desde 8000   # reproduce un evento real (para la demo)

node src/suscribir.js --seco       # sincroniza suscripciones del onboarding
node src/suscribir.js              # las guarda de verdad

node src/responder.js --seco       # clasifica preguntas entrantes, sin enviar
node src/responder.js              # responde de verdad
node src/comparar.js --dias 10     # un sismo visto desde varias ciudades

kapso build                        # compila workflows/**/workflow.ts a JSON
kapso push                         # publica en Kapso (queda en draft)
```

Tres piezas:

- **`workflows/onboarding`** — se dispara con cualquier mensaje entrante, ofrece la lista de ciudades y confirma la suscripción. Detalle en [`docs/ONBOARDING.md`](docs/ONBOARDING.md).
- **`src/alertar.js`** — consulta el USGS, calcula la intensidad en el municipio de cada suscriptor y le escribe solo a quien lo sintió. Agrupa las réplicas en un mensaje.
- **`src/responder.js`** — contesta las preguntas de seguimiento con datos: *¿qué tan fuerte fue?*, *¿hubo réplicas?*, *cambiar*, *baja*.
- **`src/tsunami.js`** — vigila los boletines del PTWC y avisa a la costa Pacífica. Es el único aviso del sistema donde la persona todavía puede moverse a tiempo.

### Verificado de punta a punta

Reproduciendo el M7.4 del 10 de agosto sobre un suscriptor en Quibdó:

```
→ 573223224730 (Quibdó) MMI 4.8 · delivered
```

> ⚠️ Sismo M7.4 detectado
> 📍 5 km S of San José del Palmar, Colombia
> 🕐 7:34:28 a. m. · 110 km de profundidad
> **En Quibdó se sintió moderado** (a 152 km del epicentro).

El mismo evento le habría dicho *fuerte* a Pereira y *leve* a Bogotá. Las réplicas M5.0 y M4.2, profundas, no habrían despertado a nadie.

## Estado

Prototipo funcional. El ciclo completo está verificado de punta a punta contra datos y teléfonos reales: detección, cálculo de intensidad, envío, agrupación de réplicas y respuesta a preguntas.

Falta activar el workflow de onboarding en Kapso y que Meta apruebe la plantilla UTILITY para poder alertar fuera de la ventana de 24 h. Lo siguiente con más valor es el aviso de tsunami en el Pacífico, que es el único caso con ventaja de tiempo real.
