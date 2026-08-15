# Guion de demo — 3 minutos

**Tesis a defender:** todo el mundo publica la magnitud del epicentro. Nadie te dice qué te tocó a vos.

---

## Antes de empezar (10 min antes)

- [ ] `pnpm install` corrido y `pnpm test` en verde
- [ ] Workflow `bienvenida` **activo** en el canvas de Kapso
- [ ] Teléfono de demo con WhatsApp abierto y proyectado en pantalla
- [ ] `data/enviados.json` borrado — si no, el dedup silencia la demo
- [ ] Terminal con dos pestañas listas: una para `comparar`, otra para `alertar`
- [ ] **Video de respaldo grabado** de la corrida completa

```bash
rm -f data/enviados.json && pnpm test
```

> La red ya se cayó una vez en este proyecto. Que se caiga en la presentación no es mala suerte, es estadística.

---

## 0:00 — El gancho

> El 10 de agosto de este año, a las 7:34 de la mañana, un sismo de magnitud 7.4 sacudió Colombia. Epicentro en San José del Palmar, Chocó.
>
> Los Android sonaron unos segundos antes. Los iPhone no sonaron.
>
> No fue una falla. **Apple solo opera alertas sísmicas en Estados Unidos y Taiwán.** Si tenés un iPhone en Colombia, no tenés nada.

Pausa. Dejar que aterrice.

---

## 0:30 — Lo que NO vamos a prometer

> Y no vamos a resolver eso, porque no se puede. Lo medimos: el USGS publica un sismo entre 93 y 186 segundos después de que ocurre. La onda destructiva llega a Cali desde el Chocó en 43 segundos.
>
> Cualquiera que les diga que hace alerta temprana con una API pública les está mintiendo, y esa mentira mata gente que confía en ella.

> Entonces preguntamos otra cosa: **si la alerta siempre llega después, ¿qué es lo que sí sirve?**

---

## 1:00 — La suscripción, en vivo

Mostrar el teléfono proyectado. Escribir al número.

> Escribo "hola". No instalé nada, no creé cuenta, no puse contraseña.

Llega el saludo. Responder **Quibdó**.

> Una sola pregunta: el municipio. Y ya está.

*Si el workflow falla:* seguir de largo, el suscriptor ya está sembrado en `data/suscriptores.json`.

---

## 1:40 — La alerta que importa

```bash
node src/alertar.js --desde 8000
```

> Estoy reproduciendo el sismo real del 10 de agosto, con los datos del USGS.

Llega el WhatsApp en pantalla:

> ⚠️ Sismo M7.4 detectado
> 📍 5 km S of San José del Palmar, Colombia
> 🕐 7:34:28 a. m. · 110 km de profundidad
> **En Quibdó se sintió moderado** (a 152 km del epicentro).

> Fíjense en la línea del medio. No dice "magnitud 7.4" y ya. Dice **qué pasó en Quibdó**.

---

## 2:10 — El remate

```bash
node src/comparar.js --dias 10
```

```
  ciudad          dist    MMI   se sintió              ¿avisamos?
  Quibdó          152 km   4.8   moderado              sí
  Pereira         126 km   5.1   fuerte                sí
  Cali            193 km   4.4   moderado              sí
  Bogotá          265 km   3.9   leve                  sí
  Barranquilla    708 km     2   apenas perceptible    —
```

> Un solo sismo. Siete ciudades. **Siete mensajes distintos** — y a Barranquilla no le escribimos, porque allá no se sintió.
>
> Eso es lo que ni Google ni el USGS te dan hoy: no la magnitud del sismo, sino la intensidad en tu casa.

---

## 2:40 — Cierre

> Esto ya funciona: las fuentes están verificadas, el mensaje llegó a un teléfono real.
>
> Lo que sigue tiene ventaja de tiempo de verdad: **las réplicas** — después del 7.4 vinieron un 5.0 y dos de 4 — y sobre todo **tsunami en el Pacífico**, donde hay entre 20 y 40 minutos de ventaja. Ahí la latencia de dos minutos deja de importar y empieza a salvar vidas.

---

## Preguntas que van a hacer

**"¿Por qué no usan el Servicio Geológico Colombiano?"**
Lo intentamos. Su catálogo público está congelado en diciembre de 2020 — 16.290 registros, último evento el 30/12. El resto son formularios PHP, no hay API en tiempo real. Con un convenio con el SGC esto mejora muchísimo: es la primera puerta que tocaríamos.

**"¿Cuánto cuesta operarlo?"**
Colombia tiene la tarifa más baja del mundo para plantillas *utility* de WhatsApp: US$0,0008 por mensaje. Diez mil alertas, ocho dólares. El canal no es el costo.

**"¿Por qué WhatsApp y no una app?"**
Porque una app hay que descargarla, y nadie descarga una app para un sismo que todavía no pasó. WhatsApp ya está instalado y ya está abierto.

**"¿Qué tan preciso es el cálculo?"**
Usamos la relación de Atkinson & Wald (2007) con distancia hipocentral — la profundidad importa, y este sismo estaba a 110 km bajo tierra. Los coeficientes son de California y sobreestiman un poco en los Andes. Para decidir "¿le aviso o no?" sobra; para publicar cifras habría que calibrar contra el catálogo de intensidades del SGC. Está documentado en el código, no escondido.

**"¿Cómo consiguen usuarios si WhatsApp no deja mandar el primer mensaje?"**
Esa restricción la chocamos de frente: seis intentos, error 131049. Meta no entrega plantillas de marketing a quien nunca te ha escrito. Por eso el onboarding es un QR o un link `wa.me` — la persona escribe primero, siempre. No es un parche, es la arquitectura.
