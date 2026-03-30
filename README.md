# k6 Performance Test

Repositorio para pruebas de rendimiento con [k6](https://k6.io/).

## Requisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado localmente

## Estructura del proyecto

```
k6-test/
├── docs/
│   ├── performance-test-plan.md     # Planificación y estrategia de pruebas
│   └── results-analysis.md         # Análisis de resultados
├── results/                         # Evidencia: salidas JSON, capturas, reportes
├── scripts/
│   ├── config/
│   │   └── options.js               # Configuraciones de carga (smoke/load/stress)
│   ├── helpers/
│   │   └── checks.js                # Verificaciones reutilizables
│   ├── requests/
│   │   └── httpbin.js               # Llamadas HTTP por dominio/servicio
│   ├── scenarios/
│   │   └── smokeTest.js             # Escenarios completos
│   └── main.js                      # Entry point
└── README.md
```

## Cómo correr las pruebas

```bash
# Ejecución básica
k6 run scripts/main.js

# Con variable de entorno para la URL base
BASE_URL=https://mi-api.com k6 run scripts/main.js

# Con salida JSON para análisis posterior
k6 run --out json=results/output.json scripts/main.js
```

## Flujo de trabajo

1. Revisar y completar `docs/performance-test-plan.md` antes de ejecutar.
2. Ejecutar el script desde `scripts/`.
3. Guardar los resultados en `results/`.
4. Documentar hallazgos en `docs/results-analysis.md`.

