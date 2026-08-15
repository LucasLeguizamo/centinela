# Onboarding

## La regla que lo define todo

**WhatsApp no deja mandar el primer mensaje.** Meta bloquea toda plantilla de categoría MARKETING dirigida a alguien que nunca le ha escrito al negocio — error `131049`, *"not delivered to maintain healthy ecosystem engagement"*.

Lo probamos seis veces, con tres números y cuatro plantillas aprobadas distintas. Fallaron las seis. No hay parámetro que lo evite: la condición de desbloqueo es un mensaje entrante.

Por eso el onboarding **siempre empieza con la persona escribiendo**. No es una limitación que rodeamos: es la arquitectura.

## La puerta de entrada

```
https://wa.me/15553075027?text=Hola
```

Abre WhatsApp con el mensaje ya escrito. La persona solo toca enviar.

El QR de `docs/onboarding/qr-centinela.svg` apunta al mismo link — sirve para carteles, pantallas y la propia demo.

Dónde tiene sentido ponerlo: pantallas en alcaldías y hospitales de zona sísmica, carteles en Quibdó y el eje cafetero, y sobre todo **en los medios locales las horas siguientes a un sismo**, que es cuando la gente busca información y está dispuesta a suscribirse.

## La conversación

| Paso | Qué pasa |
|---|---|
| 1 | La persona escribe (link, QR o su propia iniciativa) |
| 2 | Centinela se presenta y **dice de frente que no es alerta temprana** |
| 3 | Lista de ciudades para elegir |
| 4 | Confirmación + cómo darse de baja |

### Por qué la advertencia va en el saludo

Un servicio de alertas sísmicas que deja creer que avisa *antes* es peligroso: alguien puede confiarse y no reaccionar. Decirlo en el primer mensaje cuesta dos líneas y es la diferencia entre una herramienta honesta y una que puede matar a quien confía en ella.

### Por qué una lista y no texto libre

Si alguien escribe "Springfield" y lo dejamos suscribirse, nunca recibe una alerta y nunca sabe por qué. Es un fallo silencioso justo en el momento de ganarse su confianza. Con la lista, el dato siempre es válido.

*Techo conocido:* WhatsApp permite 10 filas y Colombia tiene 1.100 municipios. Las diez elegidas cubren el nido sísmico de Bucaramanga, el eje cafetero, el Chocó y la costa Pacífica — donde de verdad tiembla. Para cubrir el país entero hay que pedir la ubicación por GPS en vez de elegirla de una lista, o conectar el shapefile del DANE.

## Fuera de la ventana de 24 horas

Dentro de las 24 h posteriores al último mensaje de la persona: texto libre, entrega inmediata, sin costo.

Fuera de la ventana hay que usar una plantilla **UTILITY** — están exentas del tope `131049`. `alerta_sismica` ya está radicada en Meta:

```
Sismo de magnitud {{1}} detectado.

Epicentro: {{2}}
Hora: {{3}}
Profundidad: {{4}} km

Intensidad estimada en tu ubicacion: {{5}}
```

**Cuidado:** Meta reclasifica plantillas. Dos de este mismo proyecto pasaron de UTILITY a MARKETING solas, y al hacerlo quedaron bloqueadas. Hay que revisar la categoría periódicamente y mantener el texto estrictamente informativo, sin nada que suene promocional.

## Estado

| | |
|---|---|
| Workflow `onboarding` | publicado, **en draft — falta activarlo** |
| Link `wa.me` | listo |
| QR | `docs/onboarding/qr-centinela.svg` |
| Plantilla `alerta_sismica` | PENDING en Meta |

Activar en: https://app.kapso.ai/workflows/0a0729b7-98ec-4109-a706-a0ee388d0d47/canvas
