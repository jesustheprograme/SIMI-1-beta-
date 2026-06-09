# Estructura

Mini SCADA web para PLC:

```txt
PLC -> Modbus TCP -> Driver -> Runtime -> MQTT + Socket.IO -> Web
```

## Archivos clave

| Ruta | Uso |
| --- | --- |
| `serve.js` | Arranca servidor, MQTT, polling y snapshots. |
| `src/config.js` | Configuracion, topics y tiempos. |
| `src/plcRuntime.js` | Orquesta runtime PLC. Delega lectura, status y datos. |
| `src/runtime/` | Estado, lectura, snapshots, deduplicacion, resumen y status. |
| `src/mqttBridge.js` | Orquesta MQTT. Delega cliente, cola y mensajes. |
| `src/mqtt/` | Cliente MQTT, backpressure y procesamiento de topics. |
| `src/drivers/` | Driver industrial dividido por Modbus, Siemens S7, OPC UA y utilidades. |
| `src/drivers/siemensS7Protocol.js` | Lectura Siemens S7 con `nodeS7`; no realiza escritura. |
| `docs/lectura-siemens-s7.md` | Informe corto del alcance Siemens, pruebas y requisitos de PLC real. |
| `src/parser/` | Parser de variables EcoStruxure y armado de tags `%MW`. |
| `src/httpApi.js` | API `/api/status`, `/api/read`, `/api/write`. |
| `Controller/industrialDriver.js` | Fachada compatible hacia `src/drivers/IndustrialDriver.js`. |
| `Controller/prueba_test.js` | Fachada compatible hacia `src/parser/`. |
| `public/index.html` | Estructura visual del panel. |
| `public/styles.css` | Estilos del panel. |
| `public/app.js` | Arranque web: eventos, WebSocket y fallback. |
| `public/js/dom.js` | Referencias a elementos HTML. |
| `public/js/state.js` | Estado local, seq y datos actuales. |
| `public/js/view.js` | Render de metricas, errores, estado y temporizadores. |
| `public/js/tableView.js` | Render de tabla, filtros y bloques BAD. |
| `public/js/transport.js` | Fetch HTTP y Socket.IO. |
| `public/js/utils.js` | Formatos de fecha, valores y HTML seguro. |
| `public/css/` | CSS dividido por base, layout, paneles, listas, tabla y responsive. |

## Estrategia MQTT

| Topic | Uso |
| --- | --- |
| `topic_plc_changes` | Deltas rapidos, QoS 0, sin retain. |
| `topic_plc_data` | Snapshot completo, QoS 1, retain, cada 60 s. |
| `topic_plc_status` | Estado operacional, QoS 1, retain. |
| `consulte/topic` | Forzar lectura. |
| `consulte/write` | Escribir al PLC. |

Cada mensaje operativo incluye `messageType`, `sessionId`, `seq`, `publishedAt` y `source`.

`topic_plc_status` tambien usa el combo MQTT Retain + LWT:

- Al conectar, el backend publica `MQTT_ONLINE` retenido.
- Si el backend cae sin cerrar MQTT, el broker publica el LWT `MQTT_LWT_OFFLINE` retenido.
- Un cliente nuevo que se suscribe despues recibe de inmediato el ultimo estado real.

## Para defenderlo

La web no habla directo con el PLC. El backend actua como gateway: lee Modbus TCP, normaliza tags, publica MQTT y actualiza la web por WebSocket. Usa estrategia hibrida: eventos inmediatos + snapshot periodico retenido.
