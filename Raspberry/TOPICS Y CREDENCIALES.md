# Topics MQTT

Broker local:

```txt
ws://127.0.0.1:8083/mqtt
```

## Suscribirse

| Topic | Para que sirve |
| --- | --- |
| `topic_plc_changes` | Ver cambios del PLC en vivo. |
| `topic_plc_data` | Ver snapshot completo retenido. |
| `topic_plc_status` | Ver estado: `ONLINE`, `DEGRADED`, `READ_TIMEOUT`, `PLC_OFFLINE`. |
| `#` | Ver todo durante pruebas. |


CREDENCIALES para Websocket
en consola npm run dev antes de navegar:

url: http://localhost:18083/#/websocket

usuario: admin

contraseña: jepkom123


## Publicar

Forzar lectura:

```txt
Topic: consulte/topic
Payload: {"read":true}
```

Escribir registro:

```txt
Topic: consulte/write
Payload: {"plc":"PLC_n1","index":0,"value":15}
```

Confirmacion de escritura:

```txt
topic/registerCalibration/data
```

Nota: en pruebas locales EMQX permite conexion anonima. TLS, usuarios y ACL quedan para fase posterior.
