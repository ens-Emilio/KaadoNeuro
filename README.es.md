# KaadoNeuro

[English](README.md) | [Português](README.pt-BR.md) | Español

Una PWA de tarjetas de estudio local-first centrada en concentración, claridad y el método de repetición espaciada SM-2.

## Visión general

**KaadoNeuro** es una aplicación de estudio local-first. Los mazos, tarjetas, progreso, preferencias y configuración de IA se guardan en el navegador. No hay cuentas, servidor de aplicación ni base de datos remota.

La aplicación puede instalarse como PWA, utilizarse sin conexión después de la primera visita y alojarse como sitio estático.

## Funciones

- **Repetición espaciada SM-2**: intervalos de repaso según la calidad del recuerdo.
- **Mazos y tarjetas**: organiza varios temas con un flujo de estudio enfocado.
- **Importación masiva**: importa JSON, Markdown, texto plano o paquetes `.apkg` de Anki.
- **Estadísticas**: volumen de repasos, cantidad de tarjetas y distribución de calidad SM-2.
- **Interfaz editorial**: temas claro y oscuro, diseño adaptable y un sistema visual tranquilo.
- **13 idiomas**: portugués, inglés, español, francés, alemán, chino simplificado, japonés, coreano, árabe, hindi, indonesio, turco y vietnamita.
- **Compatibilidad RTL**: diseño de derecha a izquierda automático para árabe.
- **IA opcional**: conecta tu propio proveedor y revisa las tarjetas generadas antes de guardarlas.
- **Copia de seguridad**: exporta e importa copias completas locales.

## Tecnologías

- **Frontend**: Svelte 5 y SvelteKit
- **Estilos**: Tailwind CSS y componentes shadcn-svelte
- **Persistencia**: almacenamiento del navegador
- **Distribución**: compilación estática y PWA instalable
- **Iconos**: Lucide
- **IA**: llamadas directas desde el navegador al proveedor elegido por el usuario

## Estructura del proyecto

```text
src/
├── lib/
│   ├── ai/              # Proveedores, prompts, validación y cliente de navegador
│   ├── components/      # UI reutilizable y diálogo de IA
│   ├── i18n/            # Nombres de idiomas y metadatos RTL
│   ├── backup.ts        # Exportación y restauración completa en JSON
│   ├── sm2.ts           # Algoritmo SM-2
│   ├── stores.ts        # Mazos, tarjetas y registro local
│   └── types.ts
├── routes/
│   ├── +page.svelte
│   ├── decks/[id]/+page.svelte
│   ├── review/[deckId]/+page.svelte
│   ├── settings/ai/+page.svelte
│   ├── stats/+page.svelte
│   └── tutorial/+page.svelte
└── service-worker.ts
```

## Ejecutar localmente

Requisitos: Node.js **22.12 o superior** (validado en Node 24) y **pnpm 10**.

El repositorio mantiene solo `pnpm-lock.yaml`; `npm install` y `yarn install` no reproducen el conjunto de dependencias probado.

```bash
corepack enable
pnpm install
pnpm dev
```

Abre la URL local que muestra Vite.

## Compilación de producción

```bash
pnpm build
pnpm preview
```

El sitio estático se genera en `build/`.

## Alojamiento

Publica el contenido de `build/` en cualquier alojamiento estático con HTTPS, por ejemplo GitHub Pages, Cloudflare Pages, Netlify, Vercel, nginx o Caddy.

La arquitectura actual no requiere VPS, servidor de aplicación, PostgreSQL, backend de cuentas ni servicio de cobro.

Consulta [DEPLOY.md](DEPLOY.md) para más detalles.

## Importar tarjetas

Dentro de un mazo, elige **Importar** y usa una de estas opciones:

1. **Archivo**: selecciona `.json`, `.md`, `.txt` o un `.apkg` de Anki. El `.apkg` aporta el nombre del mazo, el texto de los campos (HTML convertido) y las etiquetas; las notas sin reverso se omiten y el total se informa en la vista previa.
2. **Texto**: pega el contenido directamente.

Formato Markdown:

```markdown
# Pregunta

Texto de la respuesta.
Puede ocupar varias líneas.
---

# Otra pregunta

Otra respuesta.
```

Formato JSON:

```json
[
	{ "front": "Pregunta", "back": "Respuesta" },
	{ "front": "Término", "back": "Definición" }
]
```

El importador muestra una vista previa antes de guardar.

## Configuración de IA

Abre **IA** en la navegación o `/settings/ai`.

Proveedores disponibles:

- Anthropic
- OpenAI
- Google Gemini
- OpenRouter
- Endpoints compatibles con OpenAI

La petición se hace directamente desde el navegador. La clave se guarda en el almacenamiento local de este navegador y solo se envía al proveedor elegido. No introduzcas una clave en un sitio cuyo operador o alojamiento no sea de confianza.

El flujo de IA genera una propuesta editable. No se guarda ningún mazo ni tarjeta hasta que confirmes **Aplicar**.

Límites:

- hasta 30 tarjetas por lote;
- hasta 12.000 caracteres de contexto;
- respuestas con formato JSON validadas antes de mostrarse.

## Copia de seguridad y privacidad

- Los datos locales pertenecen al perfil de navegador y al origen actuales.
- Borrar los datos del sitio elimina mazos, tarjetas y configuración.
- Usa **Tutorial → Copia de seguridad** para exportar o importar un archivo JSON completo.
- No hay recuperación de cuenta ni sincronización entre dispositivos.
- Los prompts se envían solo al proveedor configurado por el usuario.

## Pruebas y comprobaciones

```bash
pnpm test:unit -- --run
pnpm test:e2e
pnpm check
pnpm build
```

## Licencia

El código está bajo la [Licencia Apache 2.0](LICENSE). Consulta [NOTICE](NOTICE) para la atribución y la política de marca.

---

Creado por **ens-Emilio** con foco en rendimiento y simplicidad.
