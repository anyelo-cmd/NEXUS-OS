# NEXUS OS

Escritorio infinito en el navegador. Abres módulos en ventanas y los acomodas en un lienzo sin bordes.
Sin dependencias en el frontend (JS puro). Un servidor Python opcional añade imagen, diseño Ultron y navegador seguro.

## Cómo abrirlo
- `iniciar.bat` busca **Google Chrome** y abre NEXUS como aplicación (ventana sin pestañas, estilo sistema operativo). Si Chrome está en otra ruta, define la variable `CHROME_PATH`. `python server.py --open --no-app` lo abre en una pestaña normal.
- **Completo (recomendado):** doble clic en `iniciar.bat` → abre **http://127.0.0.1:8765** (esa es la URL de la app).
- **Solo frontend:** abre `index.html` (sin Python no hay filtros de imagen ni modo Seguro del navegador).

Al abrir siempre aparece una **bienvenida con mini tutorial**. Puedes marcar «No mostrar al abrir» y reabrirla con el botón **?** o **F1**.

## Inicio de sesión y personalización
- **Cuenta local:** usuario `anyelo` · contraseña `123456789` (cámbiala en Configuración → Cuenta). La contraseña se guarda con hash PBKDF2 en tu navegador. Es un **bloqueo local de la interfaz**, no cifra tus datos: no protege frente a alguien con acceso a tu equipo y a este navegador.
- 5 intentos fallidos bloquean el acceso 30 s. Puedes bloquear o cerrar sesión desde el menú Inicio.
- **Encuesta única** en el primer inicio (nombre, uso, estilo, color, tipo de ventanas, escritorio y rendimiento, fondo, bienvenida): coloca tus programas en el escritorio y aplica tus gustos. Se puede repetir en Configuración → Sistema.
- **Configuración** (⚙): Personalización (tema, color, fondo generado por Python), Ventanas y escritorio, Sistema (rendimiento, copia de seguridad, restablecer), Cuenta y Acerca de.
- **Ventanas fijas** por defecto: cada programa se abre a pantalla completa y no se arrastra; las utilidades pequeñas (Configuración, Calculadora, Calendario, Mis programas, Administrador de tareas) se abren centradas, también fijas. El modo *Libres* devuelve el lienzo infinito con ventanas arrastrables.

## Programas de Windows en NEXUS
**Mis programas** (🧩) añade programas, carpetas y sitios web de tu Windows al escritorio y al menú Inicio. Los programas se abren con el servidor Python (el navegador no puede ejecutarlos) y solo funciona abriendo NEXUS con `iniciar.bat`.
Seguridad: el servidor nunca acepta una ruta enviada por la página; solo lanza lo que él mismo escaneó del menú Inicio de Windows o lo que elegiste en un diálogo nativo. Las páginas del navegador integrado no pueden usar esta función. La lista se guarda en `userdata/apps.json`.
Un programa de Windows se abre **fuera** de NEXUS, en su propia ventana; no se puede incrustar dentro.

## Módulos
| Módulo | Qué hace |
|---|---|
| 📝 Documento | Editor por bloques (títulos, listas, tareas, tablas, kanban), plantillas, exporta .md / Word / PDF |
| 💻 Código | HTML/CSS/JS con vista previa en vivo, consola, vista móvil/tablet, C++ con linter |
| 🎨 Multimedia | Edición de imagen con Python (22 filtros), generador de arte, paletas, contraste WCAG, CSS, SVG |
| 🌐 Navegador | Abre cualquier URL en una ventana: historial, marcadores, buscador. Modo **Seguro** (proxy Python) o **Directo** |
| ⚙ Configuración · 🧮 Calculadora · 📅 Calendario · 📊 Administrador de tareas · 🧩 Mis programas | Utilidades básicas del sistema |
| ⚙ Configuración · 🧮 Calculadora · 📅 Calendario · 📊 Administrador de tareas · 🧩 Mis programas | Utilidades básicas del sistema |
| 🧠 SYNAPSE (Academia) | Academia de código con mapa de nodos estilo Duolingo y lecciones con teoría, editor y consola estilo Coddy. 4 rutas (Python, JavaScript, C++/Arduino, HTML y CSS) × 10 etapas × 50 niveles × 5 ejercicios (10 000 ejercicios). Corazones, XP, rangos, racha, meta diaria, insignias, pistas de Nexo y certificado descargable por etapa. |

Se eliminaron los módulos de Finanzas, Electrónica/IoT y Automatización.

## Diseño en Python (tema Ultron)
`design.py` genera con Pillow + NumPy el fondo HUD, los logos SVG (logo, ojos, anillo) y `css/ultron.css`.
```
python design.py                    # rojo Ultron
python design.py --accent #19d3ff   # otro color de acento
python design.py --seed 42          # otra variación del fondo
```
El servidor expone `POST /api/theme {accent, seed}` con variables CSS y fondo calculados en Python.

## Navegador y seguridad
- `GET /proxy?u=<url>` descarga la página en el servidor, quita los bloqueos de incrustación y la entrega aislada (`CSP: sandbox`): no puede leer los datos de NEXUS.
- Solo http/https. Rechaza IPs locales, privadas y reservadas (127.x, 10.x, 192.168.x, 169.254.x, ::1…) y usa la IP ya validada para evitar DNS rebinding; máx. 12 MB y 6 redirecciones.
- **Libertad de navegación:** formularios GET y POST (incluida subida de archivos), inicio de sesión con cookies (se guardan solo en la memoria del servidor; el botón 🍪 las borra), Ctrl+clic / clic central / `target=_blank` abren la página en una **ventana nueva** de NEXUS (⧉ lo hace con la actual).
- **Direcciones IP:** puedes escribir una IP directamente (`8.8.8.8`, `192.168.0.1:8080`, `localhost:3000`): se abre con `http://`. Sitios alojados de forma compartida pueden rechazar la IP (403) porque necesitan su nombre.
- **Interruptor 🏠:** activa o desactiva el acceso a tu red local desde la propia interfaz (pide confirmación; se apaga al cerrar el servidor).
- **Chrome:** el botón ↗ abre la URL actual en Google Chrome.
- **Red local (alternativa):** por defecto bloqueada. Para abrir tu router o servidores de desarrollo usa `iniciar-libre.bat` (`python server.py --allow-local`); el propio servidor de NEXUS sigue bloqueado.
- **Protección:** el proxy exige una ficha secreta que solo recibe la propia app (otras webs no pueden usarlo), los POST solo se aceptan desde la app y el proxy no envía cabeceras CORS.
- Limitaciones: sitios que dependen de peticiones JavaScript entre dominios (algunas apps web) pueden no funcionar. El botón ↗ abre la URL en una pestaña normal.
- El servidor escucha solo en `127.0.0.1`.

## API Python
`GET /api/health` · `POST /api/winapps/{scan,list,add,remove,launch}` · `POST /api/image` · `POST /api/palette` · `POST /api/generate` · `POST /api/theme` · `GET /proxy`

## Uso del lienzo
Arrastrar fondo = mover · rueda = zoom · Ctrl+0 = centrar · barra de ventana = mover · ⛓ = conectar ventanas · minimapa = saltar · ⚡ = rendimiento · ◐ = tema · ⇅ = exportar/importar (cifrado AES-GCM opcional).

## Arquitectura
`index.html`, `css/nexus.css` + `css/ultron.css` (generado), `js/core.js` (estado, guardado IndexedDB/localStorage), `js/canvas.js` (lienzo y ventanas), `js/fx.js` (efectos y calibración de rendimiento), `js/onboarding.js`, `js/main.js`, `js/apps/*` (módulos; `learn-data.js` contiene todo el contenido de la Academia), `server.py`, `design.py`, `sw.js` (offline bajo http).
