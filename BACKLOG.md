# Backlog — Centinela Sismos

**Alcance:** solo sismos. **Ventana:** 24–48 h de hackathon.
**Criterio de corte:** si no se ve en la demo, no se construye.

## La demo que hay que poder hacer

> Alguien escribe al WhatsApp, elige su municipio, y recibe una alerta de un sismo real
> con la intensidad calculada **para su ubicación** — no la magnitud genérica que da todo el mundo.

Todo lo que no sirva a esa frase se corta.

---

## Must — sin esto no hay demo

### US-001 · Activar el flujo de suscripción
**Como** ciudadano **quiero** escribir al número y quedar suscrito **para** recibir alertas sin instalar nada.

- [ ] Activar el workflow `bienvenida` en Kapso (está en draft)
- [ ] Guardar `{telefono, municipio, lat, lon}` al confirmar
- [ ] Responder BAJA → borrar suscripción

**Prioridad:** Must · **Esfuerzo:** S · **Depende de:** nada
*El workflow ya está escrito y pusheado. Falta activarlo y persistir.*

### US-002 · Detectar sismos nuevos
**Como** sistema **quiero** consultar USGS cada minuto **para** enterarme de un sismo en Colombia.

- [ ] Poll a USGS FDSN, bbox Colombia (lat -5..14, lon -82..-66)
- [ ] Deduplicar por `id` de evento; ignorar los ya procesados
- [ ] Guardar magnitud, lat, lon, profundidad, hora de origen

**Prioridad:** Must · **Esfuerzo:** S · **Depende de:** nada
*API ya verificada: latencia 93–186 s, responde en <1 s.*

### US-003 · Calcular intensidad en la ubicación del usuario
**Como** ciudadano **quiero** saber qué tan fuerte se sintió **donde estoy**, no la magnitud del epicentro.

- [ ] Distancia hipocentral entre epicentro y municipio del usuario
- [ ] MMI estimada con una IPE simple (Atkinson & Wald)
- [ ] Traducir MMI a lenguaje humano: *no se sintió / leve / moderado / fuerte*

**Prioridad:** Must · **Esfuerzo:** M · **Depende de:** US-001, US-002
*Este es el diferencial entero del producto. Google y USGS avisan por magnitud; nadie te dice qué te tocó a vos. Si se corta esto, Centinela es un feed de noticias.*

### US-004 · Umbral de alerta
**Como** ciudadano **quiero** que solo me escriban cuando de verdad se sintió **para** no ignorar el bot a la semana.

- [ ] Alertar solo si MMI estimada ≥ III en la ubicación del usuario
- [ ] Máximo una alerta por usuario cada 30 min; agrupar el resto

**Prioridad:** Must · **Esfuerzo:** XS · **Depende de:** US-003
*Sin esto la demo manda 40 mensajes. Colombia tiene sismos todo el día.*

### US-005 · Enviar la alerta
**Como** ciudadano **quiero** recibir la alerta en WhatsApp con la fuente oficial.

- [ ] Texto libre si la ventana de 24 h está abierta
- [ ] Plantilla `alerta_sismica` (UTILITY) si está cerrada
- [ ] Incluir link al evento en USGS

**Prioridad:** Must · **Esfuerzo:** S · **Depende de:** US-004
*Envío ya probado de punta a punta: `delivered`. La plantilla UTILITY está PENDING en Meta.*

### US-006 · Guion de demo
- [ ] Municipio sembrado + evento real reciente que dispare una alerta creíble
- [ ] Plan B grabado por si falla la red en la presentación

**Prioridad:** Must · **Esfuerzo:** XS
*Ya nos pasó una caída de red en este proyecto. Segunda vez no es mala suerte.*

---

## Should — si sobra tiempo

| ID | Historia | Esfuerzo | Por qué importa |
|---|---|---|---|
| US-007 | Alertas de réplicas agrupadas | S | Tras el M7.4 vinieron M5.0, M4.3, M4.2. La gente duerme en la calle días. |
| US-008 | Responder "¿qué tan fuerte fue?" con datos | M | Convierte la alerta en conversación; es donde WhatsApp gana contra una app. |
| US-009 | Onboarding por QR / link `wa.me` | XS | Es la única vía de captación que Meta permite (ver 131049). |

---

## Hecho después del corte

### US-010 · Aviso de tsunami en el Pacífico ✅
El único caso de este sistema con ventaja de tiempo real: un sismo de subducción frente a Nariño da entre 20 y 40 minutos antes de que el agua toque Tumaco, y el boletín del PTWC sale en menos de diez.

Fuente: Pacific Tsunami Warning Center (NOAA), feed Atom `PHEBAtom.xml`. Se reenvía solo a suscriptores de costa Pacífica —Tumaco y Buenaventura— y solo cuando el boletín oficial nombra a Colombia entre las costas amenazadas.

---

## Could — post-hackathon

| ID | Historia | Por qué no ahora |
|---|---|---|
| US-011 | Botón "estoy bien" a contactos | Bonito, no demuestra la tesis. |
| US-012 | Ubicación exacta por GPS en vez de municipio | Mejora la precisión de US-003; el municipio alcanza para la demo. |

---

## Won't — cortado a propósito

| Idea | Razón |
|---|---|
| **Alerta temprana real** | Imposible con APIs públicas. USGS publica a los 93–186 s; la onda S llega a Cali en 43 s. Google lo logra porque 2.000 millones de Android *son* la red de sensores. Prometerlo sería peligroso y falso. |
| Integrar el SGC | Su catálogo ArcGIS está congelado en dic-2020. No hay feed público en tiempo real. |
| Dashboard web | El canal es WhatsApp. Un dashboard solo sirve a quien ya decidió buscar. |
| Login / cuentas | El teléfono es la identidad. |
| Modelo ML propio | Reglas + geometría bastan y son auditables. |

---

## Parqueado — no muerto

**Contratación pública (SECOP II).** PRD completo en `docs/prd-contratacion.html`, con cuatro señales de riesgo ya validadas contra datos reales. Fuera del alcance de este hackathon por decisión de producto, no por falta de viabilidad.

---

## Riesgos abiertos

| Riesgo | Mitigación |
|---|---|
| Meta no aprueba `alerta_sismica` a tiempo | La demo corre dentro de la ventana de 24 h con texto libre. La plantilla es para producción. |
| No ocurre ningún sismo durante la demo | Reproducir un evento real reciente marcado como PRUEBA. Nunca simular sin marcarlo. |
| Falso sentido de seguridad | Todo mensaje dice de dónde viene el dato y que no es alerta temprana. No negociable. |
