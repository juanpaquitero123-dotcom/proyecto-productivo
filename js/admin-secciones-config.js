/* ===== ADMIN-SECCIONES-CONFIG.JS =====================================
   Configuración del editor genérico de secciones:
   define, para cada página, las secciones editables y los campos
   (de cabecera y por tarjeta) que el panel permitirá modificar.
   Tipos de campo soportados por admin-secciones.js:
     - texto        → input de una línea
     - textarea     → área de texto
     - numero       → input numérico
     - icono        → input con datalist de iconos sugeridos
     - etiqueta     → input corto
     - subtitulo    → input (alias de texto)
     - enlace       → input corto
     - boton        → input corto
     - tag          → input corto
     - anio         → input corto
     - sufijo       → input corto
     - aspectos     → sub-lista editable de frases (lista de textos)
     - horario      → sub-lista editable de filas hora + actividad
     Cada campo: { clave, etiqueta, tipo, ancho } donde ancho puede ser
     'largo' (ocupa la fila completa).
   ==================================================================== */
var SECCIONES_CONFIG = (function () {
    'use strict';

    var CAB_BANNER = [
        { clave: 'titulo', etiqueta: 'Título del banner', tipo: 'texto' },
        { clave: 'descripcion', etiqueta: 'Subtítulo', tipo: 'texto' },
        { clave: 'tag', etiqueta: 'Etiqueta superior', tipo: 'texto' }
    ];

    var CAB_STANDARD = [
        { clave: 'kicker', etiqueta: 'Etiqueta corta (kicker)', tipo: 'texto' },
        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', ancho: 'largo' },
        { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' }
    ];

    var CTA_ITEMS = [
        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', ancho: 'largo' },
        { clave: 'texto', etiqueta: 'Texto', tipo: 'texto', ancho: 'largo' },
        { clave: 'boton', etiqueta: 'Texto del botón', tipo: 'texto' },
        { clave: 'enlace', etiqueta: 'Enlace del botón', tipo: 'texto' }
    ];

    var ICONOS = [
        'fa-solid fa-phone', 'fa-solid fa-envelope', 'fa-solid fa-bullseye', 'fa-solid fa-eye',
        'fa-solid fa-award', 'fa-solid fa-user-graduate', 'fa-solid fa-chalkboard-user',
        'fa-solid fa-trophy', 'fa-solid fa-seedling', 'fa-solid fa-building-columns',
        'fa-solid fa-laptop-code', 'fa-solid fa-shield-halved', 'fa-solid fa-flag',
        'fa-solid fa-music', 'fa-solid fa-book-open-reader', 'fa-solid fa-computer',
        'fa-solid fa-flask-vial', 'fa-solid fa-futbol', 'fa-solid fa-tree',
        'fa-solid fa-utensils', 'fa-solid fa-heart-pulse', 'fa-solid fa-face-smile',
        'fa-solid fa-baby', 'fa-solid fa-book-open', 'fa-solid fa-graduation-cap',
        'fa-solid fa-calculator', 'fa-solid fa-language', 'fa-solid fa-flask',
        'fa-solid fa-globe-americas', 'fa-solid fa-desktop', 'fa-solid fa-palette',
        'fa-solid fa-person-running', 'fa-solid fa-book-bible', 'fa-solid fa-diagram-project',
        'fa-solid fa-users', 'fa-solid fa-robot', 'fa-solid fa-globe', 'fa-solid fa-heart',
        'fa-solid fa-chart-line', 'fa-solid fa-laptop', 'fa-solid fa-people-group',
        'fa-solid fa-certificate', 'fa-solid fa-comments', 'fa-solid fa-person-chalkboard',
        'fa-solid fa-calendar-days', 'fa-solid fa-file-pen', 'fa-solid fa-clipboard-list',
        'fa-solid fa-clock', 'fa-solid fa-id-card', 'fa-solid fa-folder-open',
        'fa-solid fa-file-image', 'fa-solid fa-syringe', 'fa-solid fa-house-chimney',
        'fa-solid fa-stethoscope', 'fa-solid fa-handshake', 'fa-solid fa-shirt',
        'fa-solid fa-scale-balanced', 'fa-solid fa-heart-circle-check', 'fa-solid fa-people-roof',
        'fa-solid fa-envelope-open-text', 'fa-solid fa-hands-holding-heart', 'fa-solid fa-bullhorn',
        'fa-solid fa-calendar-day', 'fa-solid fa-chess-knight', 'fa-solid fa-shield-heart',
        'fa-solid fa-stairs', 'fa-solid fa-apple-whole', 'fa-solid fa-people-arrows',
        'fa-solid fa-house-circle-check', 'fa-solid fa-child-reaching', 'fa-solid fa-book',
        'fa-solid fa-tower-broadcast', 'fa-solid fa-bell', 'fa-solid fa-user-check',
        'fa-solid fa-hourglass-half', 'fa-solid fa-baseball', 'fa-solid fa-calendar-week',
        'fa-solid fa-stopwatch', 'fa-solid fa-school', 'fa-solid fa-star'
    ];

    return {
        iconos: ICONOS,
        paginas: {
            nosotros: {
                titulo: 'Nuestro Colegio',
                secciones: [
                    { seccion: 'banner', nombre: 'Banner superior', cabecera: CAB_BANNER, campos: [] },
                    { seccion: 'mision-vision', nombre: 'Misión y Visión', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', ancho: 'largo' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'stats', nombre: 'Cifras en números', cabecera: [], campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'numero', etiqueta: 'Número', tipo: 'numero' },
                        { clave: 'sufijo', etiqueta: 'Sufijo (+ , %)', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Texto', tipo: 'texto', ancho: 'largo' }
                    ]},
                    { seccion: 'historia', nombre: 'Nuestra Historia', cabecera: CAB_STANDARD, campos: [
                        { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'simbolos', nombre: 'Símbolos Institucionales', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', ancho: 'largo' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'instalaciones', nombre: 'Instalaciones y Beneficios', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción corta', tipo: 'texto' },
                        { clave: 'detalle', etiqueta: 'Detalle al desplegar', tipo: 'textarea' }
                    ]},
                    { seccion: 'cta', nombre: 'Llamado a la acción final', cabecera: [], campos: CTA_ITEMS }
                ]
            },

            academico: {
                titulo: 'Académico',
                secciones: [
                    { seccion: 'banner', nombre: 'Banner superior', cabecera: CAB_BANNER, campos: [] },
                    { seccion: 'niveles', nombre: 'Niveles educativos', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'etiqueta', etiqueta: 'Etiqueta', tipo: 'texto' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' },
                        { clave: 'aspectos', etiqueta: 'Aspectos destacados', tipo: 'aspectos' }
                    ]},
                    { seccion: 'areas', nombre: 'Áreas de formación', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Área', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'plan', nombre: 'Plan de estudios', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'proyectos', nombre: 'Proyectos pedagógicos', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'tag', etiqueta: 'Etiqueta (STEAM, etc.)', tipo: 'tag' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'cifras', nombre: 'Cifras que nos definen', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'numero', etiqueta: 'Número', tipo: 'numero' },
                        { clave: 'sufijo', etiqueta: 'Sufijo (+ , %)', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Texto', tipo: 'texto', ancho: 'largo' }
                    ]},
                    { seccion: 'calidad', nombre: 'Calidad educativa', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'cta', nombre: 'Llamado a la acción final', cabecera: [], campos: CTA_ITEMS }
                ]
            },

            estudiantes: {
                titulo: 'Estudiantes',
                secciones: [
                    { seccion: 'banner', nombre: 'Banner superior', cabecera: CAB_BANNER, campos: [] },
                    { seccion: 'beneficios', nombre: 'Beneficios estudiantiles', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'procesos', nombre: 'Calendario y documentos', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', ancho: 'largo' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' },
                        { clave: 'enlace', etiqueta: 'Enlace del botón (opcional)', tipo: 'enlace' },
                        { clave: 'boton', etiqueta: 'Texto del botón (opcional)', tipo: 'boton' }
                    ]},
                    { seccion: 'documentos', nombre: 'Documentos para matrícula', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Documento', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'convivencia', nombre: 'Manual de convivencia', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'cta', nombre: 'Llamado a la acción final', cabecera: [], campos: CTA_ITEMS }
                ]
            },

            padres: {
                titulo: 'Padres',
                secciones: [
                    { seccion: 'banner', nombre: 'Banner superior', cabecera: CAB_BANNER, campos: [] },
                    { seccion: 'familia', nombre: 'Acompañamiento familiar', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'matricula', nombre: 'Matrículas y comunicados', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', ancho: 'largo' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' },
                        { clave: 'enlace', etiqueta: 'Enlace del botón (opcional)', tipo: 'enlace' },
                        { clave: 'boton', etiqueta: 'Texto del botón (opcional)', tipo: 'boton' }
                    ]},
                    { seccion: 'formacion', nombre: 'Escuela de padres', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textarea' }
                    ]},
                    { seccion: 'cifras', nombre: 'Las familias en cifras', cabecera: CAB_STANDARD, campos: [
                        { clave: 'icono', etiqueta: 'Icono', tipo: 'icono' },
                        { clave: 'numero', etiqueta: 'Número', tipo: 'numero' },
                        { clave: 'sufijo', etiqueta: 'Sufijo (+ , %)', tipo: 'texto' },
                        { clave: 'texto', etiqueta: 'Texto', tipo: 'texto', ancho: 'largo' }
                    ]},
                    { seccion: 'cta', nombre: 'Llamado a la acción final', cabecera: [], campos: CTA_ITEMS }
                ]
            },

            horarios: {
                titulo: 'Horarios',
                secciones: [
                    { seccion: 'horario-clases', nombre: 'Horario de clases (Preescolar a 11.°)', cabecera: [], campos: [] }
                ]
            }
        }
    };
})();