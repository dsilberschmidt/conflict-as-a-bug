# Roadmap

## Hito actual

v0.1 cuenta con una interfaz inicial para A, cifrado local de invitaciones y un enlace portable. El cifrado usa un sobre separado de la `decryptionKey`; no hay persistencia ni backend.

El formato actual es `/invite?v=…&a=…&iv=…&c=…#k=…`. El sobre viaja en la query y la clave solamente en el fragmento de la URL.

## Próximo paso

Conectar `Create invitation` con el cifrado, generar y mostrar el enlace para compartir, y crear la pantalla receptora `/invite` para B. La integración de la interfaz y la pantalla receptora están **pendientes**.

El almacenamiento futuro podrá reemplazar el sobre de la URL por un identificador y mantener la `decryptionKey` en el fragmento. El modelo de almacenamiento, el identificador, la retención y sus políticas de privacidad están **pendientes**.

## Después

1. Permitir que B lea la invitación y aporte su propia perspectiva.
2. Incorporar el parafraseo mutuo entre A y B y la confirmación o aclaración de cada paráfrasis.
3. Habilitar pedidos posteriores solo después de la comprensión confirmada.

## Exploración futura

- Casos semipúblicos, con alcance y privacidad **pendientes** de definición.
- Solvers humanos o IA, con rol, consentimiento y límites **pendientes**.
- Blockchain para consentimiento y procedencia, posterior a un flujo privado completo y demostrable; su utilidad, modelo de datos y garantías están **pendientes**.
