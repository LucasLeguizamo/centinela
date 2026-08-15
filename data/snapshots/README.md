# Volcados fechados

Copias de lo que las webs ciudadanas publicaban en un momento concreto, tal como las trajo `src/ingesta.js` y ya normalizadas al esquema de `recursos`.

**No son la fuente.** El bot no los lee: lee `recursos` en Supabase, que se actualiza cada media hora. Estos archivos sirven para tres cosas:

- **Evidencia.** Poder responder "¿de dónde salió este dato?" semanas después, cuando la web original ya cambió o desapareció.
- **Arranque sin red.** Levantar el proyecto y probarlo sin depender de que un sitio ajeno esté arriba.
- **Registro histórico.** Estas plataformas las mantiene una persona cada una, en planes gratuitos, durante una emergencia. Varias no van a seguir en pie dentro de unos meses.

Son fechados a propósito: no se actualizan, se agregan. Un archivo que cambia cada media hora llena el historial de ruido y no sirve como evidencia de nada.

## `acopios-2026-08-15.json`

145 centros de acopio de [Centros de Acopio Colombia](https://emergency-rosy.vercel.app), en 51 municipios.
107 verificados por el canal oficial de la entidad responsable. Los 145 traen coordenadas; 82 traen teléfono.

Cada fila lleva `fuente_url`, que apunta a la **fuente primaria** del dato y no al agregador: si un acopio salió de una historia de Instagram de la alcaldía, ese es el enlace.

Los teléfonos son de contacto de los puntos de recolección, publicados por las alcaldías, fundaciones y cámaras de comercio que los operan.
