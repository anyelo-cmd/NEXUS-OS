# Plan de construcción — NEXUS OS

Sistema operativo en el navegador sobre un canvas infinito. Hoy es un MVP en JavaScript puro, sin build, con un servidor Python opcional para procesar imágenes.

## 1. Punto de partida

| Capa | Estado actual |
|---|---|
| Núcleo | `core.js` (bus de eventos, estado, persistencia, cifrado), `canvas.js` (vista infinita, ventanas, conectores), `main.js` (arranque, temas, colaboración entre pestañas, PWA) |
| Módulos | Documento, Finanzas, Código, Electrónica, Multimedia, Automatización. También existen `browser.js` y `learn-data.js`, que el README aún no documenta |
| Servidor | `server.py` (Pillow y NumPy), API de imagen y generación en 127.0.0.1:8765 |
| Offline | IndexedDB, localStorage, Service Worker, exportación cifrada AES-GCM |
| Estilos | `nexus.css` y `ultron.css`, con tres temas |

**Principios que se mantienen:**
- Funciona 100 % offline.
- No hay dependencias obligatorias.
- Un módulo equivale a un archivo con `registerApp`.
- Los módulos se hablan solo por el bus de eventos.
- El servidor Python es opcional: sin él, solo se apagan las funciones "🐍 Python".

## 2. Fases

### Fase 0 — Higiene y base (1 semana)
**Objetivo:** que lo existente sea estable y esté documentado antes de crecer.
- [ ] Inicializar git y `.gitignore` (`__pycache__`, respaldos).
- [ ] Documentar en el README `browser.js`, `learn-data.js` y `ultron.css`, o retirarlos si sobran.
- [ ] Definir el esquema del estado (`windows`, `links`, `view`, `theme`) con un número de versión y migraciones.
- [ ] Revisar el `ALLOWED_TOP` de `server.py` y los límites de tamaño (`MAX_BODY`, `MAX_SIDE`, `MAX_OPS`).
- [ ] Lista de pruebas manuales por módulo (humo): abrir, guardar, recargar, exportar e importar.
- [ ] Probar `sw.js` con versionado de caché, para que las actualizaciones no queden obsoletas.

**Criterio de salida:** recargar la página nunca pierde datos y el README coincide con el código.

### Fase 1 — Núcleo del canvas (2 semanas)
- [ ] Minimapa de navegación.
- [ ] Áreas de trabajo (varios espacios, cada uno con su estado).
- [ ] Widgets ligeros (reloj, nota rápida, atajo a módulo).
- [ ] Atajos de teclado globales y paleta de comandos (`Ctrl+K`).
- [ ] Accesibilidad: foco visible, navegación por teclado entre ventanas, `aria-label`.
- [ ] Rendimiento: virtualizar ventanas fuera de la vista, throttle de render.

**Criterio de salida:** 30 ventanas abiertas sin pérdida de fluidez.

### Fase 2 — Módulos de productividad (3 semanas)
**Documento**
- [ ] Diagramas de flujo.
- [ ] DOCX nativo (hoy se exporta HTML con extensión `.doc`).
- [ ] Búsqueda global entre documentos.

**Finanzas**
- [ ] Comparador de escenarios.
- [ ] Importar CSV.
- [ ] Gráficos adicionales (flujo de caja acumulado).

**Automatización**
- [ ] Nodos nuevos: IoT, documentos, HTTP, temporizador.
- [ ] Ejecución con registro y reintentos.
- [ ] Plantillas compartibles (JSON).

### Fase 3 — Módulos técnicos (3 semanas)
**Código**
- [ ] Evaluar Monaco como carga opcional (con fallback al editor actual).
- [ ] Más lenguajes y fragmentos.

**Electrónica**
- [ ] Más sensores y componentes en el simulador.
- [ ] Exportar a PlatformIO.

**Multimedia**
- [ ] Capas.
- [ ] WebGL para filtros en tiempo real.
- [ ] Editor vectorial básico.
- [ ] Ampliar `/api/generate` y `/api/image` con nuevos efectos y pruebas con imágenes de referencia.

### Fase 4 — Colaboración y sincronización (3–4 semanas)
- [ ] Servidor WebSocket (puede vivir en `server.py` o en un proceso aparte).
- [ ] Sustituir `BroadcastChannel` por un transporte intercambiable (el punto de enchufe ya está marcado en `main.js`).
- [ ] CRDT (Yjs) para documentos y posición de ventanas.
- [ ] Identidad mínima: nombre y color por usuario, sin cuentas obligatorias.
- [ ] Respaldos programados y sincronización opcional.

**Riesgo principal:** es el cambio de arquitectura más grande. Debe quedar detrás de una opción, para que el modo local no cambie.

### Fase 5 — Empaquetado y calidad (2 semanas)
- [ ] Decidir si migrar a React + Zustand. Hacerlo solo si el modelo de datos ya está estable.
- [ ] Pruebas automáticas del núcleo (estado, cifrado, migraciones) y del servidor (`pytest` sobre la API).
- [ ] Empaquetar `server.py` como ejecutable (PyInstaller) o mejorar `iniciar.bat`.
- [ ] Revisión de seguridad: validación de entradas, CORS cerrado, sin acceso fuera de `ROOT`.
- [ ] Versión 1.0 con manual de usuario.

## 3. Cronograma resumido

| Fase | Duración | Entregable |
|---|---|---|
| 0 Higiene | 1 sem | Base estable y documentada |
| 1 Canvas | 2 sem | Minimapa, áreas de trabajo, paleta de comandos |
| 2 Productividad | 3 sem | Documento, Finanzas y Automatización ampliados |
| 3 Técnicos | 3 sem | Código, Electrónica y Multimedia ampliados |
| 4 Colaboración | 3–4 sem | Multiusuario real |
| 5 Calidad | 2 sem | v1.0 |

Total estimado: unas 14–15 semanas. Las fases 2 y 3 pueden intercambiarse según el interés.

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| El estado crece y rompe los respaldos antiguos | Versionar el esquema y escribir migraciones (Fase 0) |
| El Service Worker sirve archivos viejos | Versionar la caché y mostrar aviso de actualización |
| Los efectos de imagen consumen mucha memoria | Mantener los límites del servidor y probar con imágenes de 4096 px |
| CRDT con módulos heterogéneos | Empezar solo con Documento y posición de ventanas |
| Alcance excesivo | Cerrar cada fase con su criterio de salida antes de abrir la siguiente |

## 5. Definición de "hecho" para cualquier tarea

1. Funciona sin el servidor Python, o degrada con un aviso claro.
2. El estado se guarda y se recupera tras recargar.
3. Respeta los tres temas.
4. Se puede operar con teclado.
5. Está anotada en el README.

## 6. Siguiente paso inmediato

Empezar por la Fase 0: git, esquema de estado versionado y limpieza del README. Es la parte más barata y reduce el riesgo de todas las demás.

## 7. Registro de cambios — Revisión de alcance (2026-11-07)

**Decisión del usuario:** no trabajar Finanzas, Electrónica/IoT ni Automatización. Esto reemplaza lo que el plan anterior preveía para esos módulos (Fase 3 en adelante).

### Hecho
- **Eliminados:** Finanzas, Electrónica/IoT y Automatización (archivos, scripts, caché del service worker, ventanas iniciales y referencias cruzadas). Las ventanas guardadas de esos tipos se descartan al abrir.
- **Navegador (`js/apps/browser.js`):** abre cualquier URL en una ventana. Historial, marcadores, buscador y atajos (Alt+←/→, Ctrl+L). Modo *Seguro* (proxy Python) y modo *Directo* (iframe).
- **Proxy Python (`server.py`, `GET /proxy?u=`):** solo http/https; rechaza IPs privadas, locales y reservadas; usa la IP ya validada (anti DNS rebinding); máx. 12 MB y 6 redirecciones; respuesta con `CSP: sandbox` para aislar la página. Usa `certifi` para los certificados. Probado con 11 direcciones peligrosas, todas bloqueadas.
- **Diseño Ultron en Python (`design.py`):** fondo HUD, logo, ojos y anillo SVG, y `css/ultron.css` generados desde un color de acento (`python design.py --accent #hex --seed N`). Endpoint `POST /api/theme`. Es el tema por defecto; ciclo de temas: ultron → dark → light → contrast.
- **Bienvenida y tutorial (`js/onboarding.js`):** 4 pasos en cada apertura; opción «No mostrar al abrir»; se reabre con el botón ? o F1.
- **Academia (`js/apps/learn.js`, `learn-data.js`):** 4 cursos (Python, JavaScript, HTML/CSS, C++/Arduino), 17 lecciones, 102 ejercicios de 5 tipos (opción múltiple, V/F, completar, ordenar, relacionar). Corazones, XP, niveles, racha, meta diaria y confeti. Progreso guardado en el espacio de trabajo.
- **Verificación:** Chrome headless sin errores de JS (bienvenida, lanzador, lección completa de Python, navegador cargando por proxy).

### Limitaciones conocidas
- El navegador no soporta formularios POST ni inicios de sesión; muchos sitios bloquean el modo Directo.
- Sin el servidor Python, el navegador cae al modo Directo.
- La Academia no ejecuta código real del usuario: los ejercicios son de selección, completar y ordenar.

### Impacto en fases anteriores
- **Fase 3 (técnicos):** queda solo Código (IDE) y C++ con linter; se retiran Electrónica/IoT.
- **Fase 2 (productividad):** se retiran Finanzas y Automatización; se suman Navegador y Academia.
- **Fase 4 (colaboración):** sin cambios; el punto de enchufe sigue siendo BroadcastChannel → WebSocket.

### Siguientes pasos sugeridos
1. Ampliar la Academia (más lecciones, repaso espaciado, ejecutar código con Pyodide).
2. Selector de color de acento en la interfaz usando `/api/theme`.
3. Pruebas automáticas del proxy (SSRF) y de los ejercicios.
4. Retomar la Fase 0 (git y esquema de estado versionado).

## 8. Registro de cambios — Escritorio tipo PC e historial en lienzo (2026-11-07)

- **Escritorio tipo PC (`js/desktop.js`, `css/desktop.css`):** iconos de escritorio (doble clic para abrir), barra de tareas a todo el ancho con botones por ventana (clic en la activa = minimizar), menú Inicio con buscador y accesos (Ayuda, Centrar, Tema), menú contextual con clic derecho (nuevo módulo, centrar, tema, ocultar iconos).
- **Maximizar / restaurar ventanas:** botón ▢ o doble clic en la barra de título; al maximizar se ocultan iconos, logo y minimapa.
- **Historial del navegador en lienzo infinito (🕘):** cada página visitada es una tarjeta (título, sitio, hora) unida a la siguiente por una flecha animada. Arrastrar el fondo = mover, rueda = zoom, arrastrar tarjetas = reorganizar, clic = reabrir, filtro, Ordenar (serpiente), Encuadrar y Borrar. Se guarda en el espacio de trabajo (máx. 200 páginas).
- **Verificación:** Chrome headless sin errores de JS (5 iconos, 3 tarjetas con 2 flechas, maximizar, menú Inicio con 5 módulos).
- **Pendiente / límites:** el lienzo principal sigue siendo infinito; los iconos son fijos a la pantalla (no se pueden reubicar todavía).

## 9. Registro de cambios — Navegación libre (2026-11-07)

- **Formularios POST** (incluye multipart) y redirecciones como un navegador real; la respuesta crea una entrada nueva en el historial.
- **Cookies** en memoria del servidor (por dominio, con caducidad y borrado con 🍪) → se pueden iniciar sesiones en sitios sencillos.
- **Ventanas nuevas:** Ctrl+clic, clic central, `target=_blank`, `window.open` y el botón ⧉ abren otra ventana de Navegador en el lienzo (las «pestañas» son ventanas).
- **Red local opcional:** `--allow-local` / `iniciar-libre.bat`. Sigue bloqueado el propio servidor de NEXUS.
- **Seguridad añadida:** ficha secreta obligatoria en `/proxy`, POST solo desde la app, sin CORS en `/proxy`. Verificado: sin ficha 403, origen ajeno 403, cookies aisladas y borrables.
- **Riesgo residual:** una página abierta puede pedir al proxy otros sitios con tus cookies (como un CSRF). Usa 🍪 para cerrar sesiones. Pendiente: aislar las cookies por pestaña/sitio superior.

## 10. Registro de cambios — IP directas y Chrome (2026-11-07)

- **IP en el navegador:** una IP, `localhost` o `[IPv6]` escrita en la barra se abre con `http://`. Interruptor 🏠 para permitir la red local en caliente (`POST /api/local`, con ficha y confirmación); el propio servidor de NEXUS sigue bloqueado.
- **Chrome:** `server.py` localiza Chrome (`CHROME_PATH`, rutas habituales) y abre NEXUS con `--app` (ventana de aplicación). El botón ↗ llama a `POST /api/open-chrome` (solo http/https, con ficha). La barra de estado avisa si NEXUS no corre en un navegador Chrome/Chromium.
- **Verificado:** rutas sin ficha → 403; URL `file:` y `javascript:` → 400; IP local bloqueada, abierta con el interruptor y bloqueada de nuevo; interfaz sin errores de JS.
- **Límite:** el motor del navegador integrado es el del navegador donde se abre NEXUS (iframe); no se incrusta un Chrome aparte. Abrir NEXUS con Chrome (iniciar.bat) garantiza ese motor.

## 11. Registro de cambios — Sistema operativo portátil (2026-11-07)

- **Ventanas fijas:** al abrirse se maximizan y no se arrastran; el lienzo se bloquea mientras haya una visible. Utilidades pequeñas como diálogos centrados. Modo *Libres* opcional.
- **Barra de tareas tipo Windows:** Inicio, buscador, botones de ventana con estado activo (clic = enfocar/minimizar), bandeja (red, zoom, rendimiento, ayuda, configuración) y reloj con fecha que abre el Calendario.
- **Aspecto profesional y legible:** ventanas, menús y barra con fondo sólido; se eliminaron las líneas de escaneo y el barrido que se dibujaban encima del contenido y el efecto glitch.
- **Inicio de sesión** (anyelo / 123456789, hash PBKDF2, bloqueo tras 5 intentos), bloqueo de pantalla y cerrar sesión.
- **Encuesta única** de personalización (7 preguntas, vista previa en vivo) y **panel de Configuración** (5 secciones).
- **Apps del sistema:** Calculadora, Calendario con notas, Administrador de tareas.
- **Mis programas:** programas de Windows (menú Inicio), archivos, carpetas y sitios web en el escritorio. Servidor con lista blanca propia, origen estricto y diálogos nativos; verificado: origen null/ajeno/cross-site -> 403, ruta enviada por la página -> rechazada.
- **Verificación:** Chrome headless con flujo completo (login correcto e incorrecto, encuesta, ventanas fijas sin arrastre, calculadora 7x6=42, cambio fijas/libres, bloqueo) sin errores de JS.
- **Límites:** la cuenta es un bloqueo local (no protege datos); los programas de Windows se abren fuera de NEXUS; falta un explorador de archivos y una papelera.

## 12. Registro de cambios — Páginas de tamaño normal y Academia 500 niveles (2026-11-08)

- **Ventanas como páginas normales:** en modo fijo cada pestaña se abre centrada con tamaño de página (hasta 1280×820), no se arrastra y se puede **ajustar su tamaño** con el tirador de la esquina; el botón ▢ alterna con pantalla completa. El **zoom queda fijo al 100 %** (rueda y Ctrl+rueda desactivados). En modo *Libres* se mantiene el lienzo con zoom.
- **Academia — Ruta 500:** 10 etapas × 50 niveles (5 ejercicios por nivel) con dificultad creciente: Primeros pasos, Operaciones y textos, Decisiones, Bucles, Listas, Funciones, Textos y diccionarios, Algoritmos, Errores y depuración, Maestría. Los ejercicios se generan con semilla por nivel (siempre iguales para el mismo nivel). Cada nivel se desbloquea al pasar el anterior; cada etapa, al completar los 50 niveles de la anterior.
- **Verificación:** las respuestas de los 2000 ejercicios con código se ejecutaron en Python real: 0 discrepancias. Prueba en Chrome sin interfaz: 10 etapas, 50 niveles, etapa 4 bloqueada, nivel 1 completado con 3 estrellas, nivel 2 desbloqueado, sin errores de JS.
- Se conservan los cursos anteriores (Python, etc.) junto a la Ruta.

## 13. Registro de cambios — Tamaño tipo PC y fondos 3D (2026-11-08)

- **Ventanas al tamaño del escritorio:** en modo fijo cada pestaña ocupa toda el área sobre la barra de tareas (margen de 10 px), como una ventana maximizada de PC; los diálogos pequeños siguen centrados. Se puede ajustar con el tirador o pasar a pantalla completa; zoom fijo en 100 %.
- **Fondo 3D futurista (design.py, `render_3d`):** suelo de rejilla en perspectiva con horizonte luminoso, núcleo icosaédrico con caras sombreadas y anillos orbitales, fragmentos flotantes con profundidad, reflejo en el suelo, haz de luz y estrellas. Se genera con Pillow+NumPy (~3 s) y respeta el color de acento y la semilla ("Generar" crea otra variación).
- **Configuración → Fondo:** *3D futurista* (por defecto), *HUD plano* (el anterior) y *Color liso*. Sin servidor Python se usa la imagen 3D base con el tono girado al color elegido.

## 14. Registro de cambios — Interfaz holográfica de IA (2026-11-08)

- **Motor holográfico 3D (`js/holo.js`):** núcleo de IA en tiempo real con Canvas 2D: nube de puntos con red neuronal e impulsos viajando por ella, plano de escaneo, tres anillos giroscópicos, proyector con haz de luz, ecualizador de voz y suelo de rejilla en perspectiva que avanza. Paralaje con el ratón. La geometría (650 puntos, ~1150 conexiones) la calcula **Python/NumPy** en `/api/holo` (`design.holo_geometry`); sin servidor se usa una versión local más ligera.
- **Arranque holográfico** (~2,7 s, se omite con clic o tecla) con mensajes de estado y barra de progreso.
- **Inicio de sesión con IA:** el núcleo responde y «habla» (el ecualizador reacciona al texto que escribe): saluda por tu nombre, avisa de credenciales no válidas y confirma el acceso.
- **Fondo vivo del escritorio** («Holograma vivo», nuevo valor por defecto): el mismo núcleo animado detrás de los iconos; se pausa cuando una ventana a pantalla completa lo tapa. Quedan «3D estático», «HUD plano» y «Color liso».
- **Cursor holográfico (`js/cursor.js`):** punto de luz exacto, retícula de seis arcos con inercia, estela de cometa, bloqueo de objetivo con esquinas sobre lo pulsable, cursor de texto, pulso, onda y chispas al hacer clic. Se puede desactivar en Configuración; en páginas web incrustadas vuelve el cursor normal; desactivado con «reducir movimiento» y en táctil.
- **Profundidad en la interfaz (`css/holo.css`):** borde giratorio de luz en la ventana activa, barra de luz en la cabecera y en la barra de tareas, iconos del escritorio con inclinación 3D y flotación, menú Inicio con marco luminoso. Los efectos solo tocan bordes: nunca se dibujan sobre el contenido.
- **Servidor Python:** banner ASCII al iniciar y endpoint `/api/holo`.

## 15. Registro de cambios — Apps holográficas y núcleo más avanzado (2026-11-08)

- **Kit visual común (`css/apps.css`):** todas las apps comparten ahora un lenguaje futurista: cabecera con holograma 3D propio, corchetes de esquina luminosos, botones/pestañas/selectores/teclas con esquinas biseladas, barras de estado con LED, tarjetas con marcos, campos con subrayado de neón, barras de desplazamiento de energía y tipografía técnica en cabeceras.
- **Una forma 3D viva por app** (cubo, octaedro, icosaedro, globo, tetraedro, giroscopio): icono holográfico giratorio en la cabecera y marca de agua 3D detrás del contenido (`N.holo.shape`).
- **Diseño por app:** Documento (lámina con resplandor y columnas kanban biseladas), Código (editor con brillo interior), Multimedia, Navegador (barra de dirección HUD y tarjetas con corchetes), Academia (nodos hexagonales con brillo, opciones biseladas, barras de neón), Configuración (navegación con barra luminosa), Calculadora (pantalla de neón y teclas biseladas), Calendario, Administrador de tareas y Mis programas.
- **Núcleo holográfico ampliado:** cristal interior contrarrotante, brújula graduada en el suelo, torres de datos, flujo de partículas hacia el núcleo, onda expansiva periódica y etiquetas HUD con líneas de llamada (enlace neuronal, temperatura, latencia, entropía).
- **Corrección de fondo:** `N.h()` no aplicaba variables CSS pasadas en `style` (`--cc`, `--ac`…); la Academia nunca había mostrado sus colores. Ahora se aplican con `setProperty`.
- **Corrección:** el tiempo del holograma podía ser negativo en el primer fotograma y lanzaba una excepción en cada frame.
- **Pruebas:** capturas en tiempo real con Chrome headless por DevTools (el modo de tiempo virtual se cuelga con animaciones continuas). Flujo completo verificado sin errores de JS.

## 16. Registro de cambios — SYNAPSE, la nueva Academia (2026-11-08)

- **Nombre y diseño propios:** la Academia pasa a llamarse **SYNAPSE** y usa el lenguaje visual holográfico del sistema. Se inspira en Duolingo (mapa de nodos hexagonales en zigzag, unidades de 10 niveles, jefes 👑, corazones, XP, racha, meta diaria) y en el formato de Coddy (teoría a la izquierda, editor con resaltado de sintaxis y consola a la derecha). No se pudo leer coddy.tech (bloquea lectores automáticos con HTTP 403): se tomó como referencia lo público (secciones, lecciones + retos + quizzes, asistente de pistas «Bugsy», certificados por sección) y no se copian textos ni marca.
- **Contenido:** 4 rutas × 10 etapas × 50 niveles × 5 ejercicios. Python (`learn-path.js`), JavaScript y C++/Arduino (`learn-tracks.js`) y HTML/CSS (`learn-web.js`). Los niveles se generan con semilla fija y la dificultad crece de nivel en nivel y de etapa en etapa. Se retira `learn-data.js` (los 4 cursos cortos antiguos).
- **Verificación:** 500 niveles únicos por ruta, sin errores. En JavaScript la salida correcta se obtiene ejecutando el código; en Python se verificó contra el intérprete real (2000 ejercicios, etapa anterior); en C++ no hay compilador local y cada salida la calcula la plantilla en JS (revisión manual de muestras). Recorrido por la interfaz: 16 niveles (4 rutas) contestados con éxito.
- **Gamificación:** 17 rangos, 8 insignias, pistas limitadas por nivel (Nexo descarta una opción o da la primera letra), teoría consultable desde la lección, certificado por etapa dibujado en canvas y descargable en PNG (certificado local, no oficial).
- **Progreso:** se conserva el de la Ruta 500 anterior (Python). Las etapas se desbloquean al completar los 50 niveles de la anterior.
- **Limitaciones:** los ejercicios no ejecutan el código del usuario (selección, completar, ordenar, relacionar); las salidas de la consola se muestran al comprobar.
