# Centinela · landing

La página con la que se presenta Centinela al jurado. Vive dentro del repo del
bot a propósito: los números que muestra salen del bot que corre al lado, no de
una copia que alguien se acuerde de actualizar.

Next.js 15 (App Router) + TypeScript + [Motion](https://motion.dev). CSS plano
con tokens, sin Tailwind.

## Deploy

**Root Directory `web/`**, en los ajustes del proyecto. No es opcional y no
hay forma de reemplazarlo desde el repo: Vercel busca la dependencia `next` en
el `package.json` del directorio raíz que le indiques, y el de la raíz de este
repo es el del bot, que no la tiene. Un `vercel.json` en la raíz con
`framework: nextjs` tampoco sirve — falla con:

```
Error: No Next.js version detected. Make sure your package.json has "next"
in either "dependencies" or "devDependencies".
```

Es un ajuste del dashboard que no vive en el repo, así que se pierde cada vez
que alguien recrea el proyecto. Cuando se pierde, el dominio queda sirviendo
un 404 — que es lo que pasó con `centinela-silk-alpha.vercel.app`.

Por CLI se puede fijar sin entrar al dashboard:

```bash
cd web && vercel link      # crea o reusa el proyecto con web/ como raíz
cd web && vercel --prod    # deploy de producción
```

Después de cada deploy conviene correr la prueba de humo contra la URL real,
no contra localhost:

```bash
URL=https://<lo-que-sea>.vercel.app pnpm humo
```

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm verificar   # build + tipos: tiene que pasar antes de mergear
```

En este repo es **pnpm**, nunca npm ni yarn.

## La prueba antes de mostrarla

`pnpm humo` levanta Chrome, recorre la página entera y revisa lo que da
vergüenza en vivo: un error en consola, una sección que no se reveló, el chat de
ayuda que no responde, scroll horizontal en el celular, o un número que el bot
no respalda. Deja capturas en `.capturas/`.

```bash
pnpm build && pnpm start -p 3210 &
pnpm humo
```

Recorre la página de a una pantalla antes de mirar nada: casi todo entra con
`whileInView`, así que sin scroll el sitio está técnicamente en blanco.

## Dónde tocar las cosas

- **`lib/datos.ts`** — todo el texto y los datos. Es donde se ajusta el copy sin
  pelearse con JSX. **Regla que no se rompe: acá no se inventa un número.** Cada
  cifra sale del repo del bot o de una fuente citada. Un jurado que verifica un
  dato y lo encuentra inflado deja de creernos el resto.
- **`lib/sismo.ts`** — la física **no está acá**: se importa de `src/sismos.js`,
  el mismo archivo que usa el bot. Acá solo viven el evento (`SISMO`), las
  ciudades del comparador y `fuerza`, que es un número de dibujo. Los valores
  siguen siendo los de `node src/comparar.js --dias 10`: Pereira 5.1 ·
  Manizales 5 · Quibdó 4.8 · Cali 4.4 · Medellín 4.3 · Bogotá 3.9 ·
  Barranquilla 2.
- **`lib/motion.ts`** — los muelles. Por defecto nada rebota; el rebote se
  reserva para lo que traía momento físico (el arrastre, los mensajes que caen).
- **`app/globals.css`** — tokens, tipografía y materiales, todo en un archivo.
  Los colores viven en tres bloques (claro, `prefers-color-scheme: dark`, y
  `[data-theme]`). Si agregas un color, agrégalo en los tres o se rompe un tema.

El texto es en **español colombiano**: nada de voseo. `pnpm humo` lo revisa.

## Los componentes

| Archivo | Qué es |
| --- | --- |
| `components/Hero.tsx` | La apertura. El compás está en el objeto `T`, en segundos: es el único sitio donde se ajusta el ritmo. Lee el comentario de arriba antes de tocarlo — la animación cuenta el sismo, no es una entrada decorativa. |
| `components/MapaColombia.tsx` | El mapa interactivo. Los puntos entran ordenados por distancia real al epicentro: eso es la onda. |
| `components/Problema.tsx` | La notificación que llegó a unos y no a otros. |
| `components/Ayuda.tsx` | El WhatsApp interactivo. Se puede clicar de verdad. |
| `components/Cierre.tsx` | Cómo funciona, capacidades, números y el QR. |
| `components/Glifos.tsx` | Los tres glifos animados de las capacidades. |

## Los archivos generados — no editar a mano

`lib/mapa.ts` y `lib/puntos.ts` los escribe un script. Si los editas a mano, el
siguiente que corra el script te pisa el cambio.

```bash
pnpm mapa     # geometría de Colombia desde el GeoJSON → lib/mapa.ts
pnpm puntos   # ../data/snapshots/acopios-*.json por municipio → lib/puntos.ts
```

`pnpm mapa` solo hace falta si cambia la geometría (nunca). `pnpm puntos` sí:
córrelo cada vez que el bot deje un volcado nuevo en `data/snapshots/`, y
apunta la constante `VOLCADO` del script al archivo nuevo.

## El QR

`public/qr.svg` se generó desde la constante `WHATSAPP` con la librería
`qrcode`. Si cambia el número, hay que regenerarlo — un QR dibujado a mano se ve
perfecto y no escanea:

```bash
node -e 'require("qrcode").toString("https://wa.me/NUMERO?text=Hola",{type:"svg",margin:1})
  .then(s=>require("fs").writeFileSync("public/qr.svg",s))'
```

## Secretos

Esta web no tiene ninguno: es estática y no habla con Supabase. Si algún día
hace falta uno, va en Vercel (`vercel env add`) y nunca en el repo.
