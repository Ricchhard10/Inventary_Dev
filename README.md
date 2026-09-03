# Inventary Dev

<p align="center">
  <img src="./assets/icon-arcade.png" width="128" alt="Icono pixel de Inventary Dev: tres cajas">
</p>

Aplicación móvil de práctica para controlar productos, existencias, stock mínimo y precios. Funciona localmente, sin backend ni cuentas de usuario, con una interfaz arcade pixel.

> Proyecto personal de BUG DEV creado con fines educativos, de portafolio y pruebas. No es un sistema comercial de inventario.

## Funciones

- Crear, editar y eliminar productos.
- Guardar nombre, SKU, categoría, cantidad, mínimo y precio unitario.
- Aumentar o disminuir existencias.
- Identificar productos con stock bajo.
- Buscar por nombre, SKU o categoría.
- Calcular el valor estimado del inventario.
- Conservar los datos en SQLite dentro del dispositivo.

## Tecnologías

- Expo SDK 57
- React Native
- TypeScript
- Expo SQLite
- Expo Font
- Press Start 2P y VT323

## Requisitos

- Node.js 22.13 o posterior compatible con Expo SDK 57.
- npm.
- Una de estas opciones:
  - Expo Go compatible para pruebas rápidas.
  - Xcode para iOS Simulator.
  - Android Studio para Android Emulator.

## Instalación y prueba

```sh
git clone URL-DEL-REPOSITORIO
cd sistema-inventarios
npm ci --ignore-scripts
npm start
```

Después:

- Presiona `i` para abrir iOS Simulator.
- Presiona `a` para abrir Android Emulator.
- En un teléfono, abre Expo Go y escanea el QR mientras ambos dispositivos estén en una red de confianza.

Para trabajar únicamente en el simulador de esta computadora y evitar exponer Metro a la red local:

```sh
npm run start:local
```

Presiona `r` para recargar. Si persiste una versión anterior, detén Expo y ejecuta:

```sh
npx expo start --clear
```

No es necesario desinstalar la app para actualizar el código. Desinstalarla o borrar los datos de Expo Go puede eliminar los registros locales.

## Comprobaciones

```sh
npm run typecheck
npm audit
npx expo export --platform ios --platform android
```

La exportación comprueba el empaquetado del código y los recursos para ambas plataformas. No genera un instalador APK/IPA ni sustituye las pruebas en dispositivos.

## Datos y privacidad

No requiere credenciales, variables de entorno, servidor ni conexión a una cuenta. El código propio no envía los productos a Internet. Los registros se guardan en una base SQLite local.

No introduzcas contraseñas, datos completos de tarjetas ni otros secretos. Consulta [SECURITY.md](./SECURITY.md) antes de publicar, modificar o distribuir el proyecto.

## Alcance actual

- No incluye sincronización entre dispositivos.
- No incluye usuarios, roles ni autenticación.
- No incluye importación, exportación ni restauración de registros.
- No añade cifrado propio a la base local.
- No incluye instaladores listos para App Store o Google Play.

## Licencia

El código del proyecto se publica con licencia MIT: puede estudiarse, copiarse, modificarse y redistribuirse conservando el aviso de licencia. Consulta [LICENSE](./LICENSE). Las fuentes y dependencias mantienen sus licencias correspondientes.
