# Analisis del proyecto Dores

## 1. Que es este proyecto

Dores es una aplicacion movil y web construida con Expo + React Native para un negocio de comida. La app permite que un cliente:

- se autentique o se registre;
- vea categorias, promociones y productos;
- agregue items al carrito;
- seleccione direccion y metodo de pago;
- cree pedidos;
- consulte pedidos previos;
- gestione perfil, direcciones y notificaciones.

Aunque la app tiene una estructura de arquitectura por capas, hoy funciona con un modelo mixto:

- una parte del flujo usa una API HTTP propia en `https://dores.cruznegradev.com/api`;
- otra parte consulta Supabase directamente desde el cliente.

Ese detalle es importante porque explica por que conviven repositorios HTTP tradicionales con servicios que van directo a tablas de Supabase.

## 2. Stack tecnologico

- **UI y runtime**: Expo 52, React 18, React Native 0.76.
- **Navegacion**: React Navigation con stacks y bottom tabs.
- **Estilos**: NativeWind/Tailwind + estilos inline/StyleSheet.
- **Estado global**: Context API y hooks propios.
- **Backend de datos**: Supabase (`@supabase/supabase-js`).
- **Backend legado/complementario**: API REST propia consumida por `ApiClient`.
- **Persistencia local**: AsyncStorage.
- **Formularios**: React Hook Form + Zod.
- **Capacidades nativas**: ubicacion, notificaciones, splash screen, fuentes personalizadas.

## 3. Como arranca la aplicacion

El punto de entrada es `App.tsx`.

Flujo de inicio:

1. Se cargan estilos globales y se habilita `react-native-screens`.
2. Se bloquea el splash hasta que la app este lista.
3. Se cargan fuentes personalizadas, sobre todo `LuckiestGuy-Regular`.
4. Se montan varios providers globales:
   - `CartProvider`
   - `UserProvider`
   - `PushNotificationProvider`
   - `NotificationProvider`
   - `AddressProvider`
   - `OrderEventsProvider`
5. `ThemedApp` inicializa la sesion del usuario y configura el tema del `NavigationContainer`.
6. `RootNavigation` decide si mostrar:
   - `AuthNavigator` cuando no hay usuario autenticado;
   - `AppNavigator` cuando ya existe sesion.

En resumen: la app primero resuelve sesion + fuentes + providers, y luego habilita navegacion autenticada o publica.

## 4. Arquitectura general

El repositorio esta organizado en capas relativamente claras:

### 4.1 `presentation/`

Es la capa de interfaz. Contiene pantallas, componentes visuales, hooks de pantalla, contextos y estilos.

### 4.2 `domain/`

Modela el negocio: entidades, contratos de repositorios, mapeadores y servicios de negocio.

### 4.3 `data/`

Implementa el acceso a datos usando repositorios concretos. En este proyecto se usa sobre todo para la API REST propia.

### 4.4 `infrastructure/`

Contiene detalles tecnicos reutilizables: cliente Supabase, almacenamiento, interceptores, helpers HTTP y configuracion.

### 4.5 `navigation/`

Define stacks, tabs y la separacion entre flujo autenticado y flujo de autenticacion.

## 5. Flujo principal de datos

Hay dos rutas de datos principales:

### 5.1 Ruta HTTP clasica

Pantalla/Hook -> Servicio de dominio -> Repositorio (`data/repository`) -> `ApiClient` -> API REST propia

Se usa sobre todo en:

- autenticacion propia con tokens manuales;
- direcciones del usuario;
- notificaciones;
- partes del perfil.

### 5.2 Ruta Supabase directa

Pantalla/Hook -> Servicio de dominio -> cliente `supabase` -> tablas de Supabase -> mapper -> entidad de dominio

Se usa sobre todo en:

- categorias;
- productos/menu;
- banners/promociones;
- comercio activo;
- checkout data;
- pedidos.

## 6. Modulos principales y como funcionan

### 6.1 Modulo de autenticacion

Responsabilidad: registrar usuarios, iniciar/cerrar sesion y recuperar contrasena.

Piezas principales:

- `presentation/screens/auth.tsx`: alterna entre login y registro.
- `presentation/context/userContext.tsx`: mantiene el usuario actual y escucha cambios de sesion de Supabase.
- `domain/services/authService.ts`: servicio orientado a autenticacion via repositorio HTTP y gestion de tokens en AsyncStorage.
- `data/repository/userRepository.ts`: implementa llamadas a endpoints de auth de la API propia.
- `infrastructure/http/authInterceptor.ts`: renueva tokens expirados usando `refreshToken`.

Funcionamiento real hoy:

- El contexto de usuario inicia sesion y registro con `supabase.auth`.
- En paralelo existe un `AuthService` basado en API REST y tokens manuales.
- Eso indica una migracion parcial: la sesion visible en app ya depende mucho de Supabase, pero parte del ecosistema legacy sigue esperando `accessToken` y `refreshToken` en AsyncStorage.

Implicacion tecnica:

- El proyecto mezcla dos modelos de autenticacion. Esa mezcla debe conocerse bien antes de tocar login, perfil o endpoints autenticados.

### 6.2 Modulo de navegacion

Responsabilidad: organizar el recorrido del usuario.

Piezas principales:

- `navigation/root.tsx`: decide entre flujo autenticado o flujo publico.
- `navigation/stack.tsx`: define stacks y tabs.
- `navigation/navigationService.ts`: expone la referencia global de navegacion.

Funcionamiento:

- Si no hay usuario: se muestran `Authentication` y `ResetPassword`.
- Si hay usuario: se muestran tabs de `Home`, `Pedidos`, `Carrito` y `Perfil`.
- El tab de `Carrito` solo aparece si hay items en contexto.

Esto hace que el carrito sea un modulo condicional y no una pestaña fija.

### 6.3 Modulo Home y descubrimiento del catalogo

Responsabilidad: construir la portada de la app con saludo, direccion, categorias, promociones y productos destacados.

Piezas principales:

- `presentation/screens/home.tsx`: pantalla principal.
- `presentation/hooks/useHome.tsx`: orquesta banners, direccion seleccionada y modales.
- `presentation/hooks/useCategory.tsx`: carga categorias con cache local en memoria.
- `presentation/hooks/useMenus.tsx`: carga menus/productos con cache local en memoria.
- `presentation/hooks/useCommerces.tsx`: resuelve el comercio activo.

Funcionamiento:

- Home dispara recargas coordinadas de banners, categorias, comercio, menus, direcciones y notificaciones.
- Las categorias vienen de Supabase.
- Los menus tambien vienen de Supabase y se filtran por `commerce_id` del comercio activo.
- Los banners se resuelven por promociones activas del dia, con fallback a promociones activas generales.

### 6.4 Modulo de comercio activo

Responsabilidad: determinar con que negocio trabaja la app en la sesion actual.

Pieza principal:

- `domain/services/supabase/commerceService.ts`

Funcionamiento:

- Consulta `commerce_profiles` en Supabase.
- Toma el primer comercio `active = true`.
- Cachea su `id` en memoria (`cachedCommerceId`).
- Otros servicios dependen de ese id para filtrar productos, promociones, zonas de envio y pedidos.

Consecuencia de diseno:

- La app actual esta pensada practicamente como single-commerce activo, aunque tenga entidades de comercio.

### 6.5 Modulo de categorias y menu

Responsabilidad: obtener y adaptar la oferta comercial.

Piezas principales:

- `domain/services/categoryService.ts`: consulta tabla `categories`.
- `domain/services/menuService.ts`: consulta tabla `products` con relaciones a categorias e imagenes.
- `domain/mappers/supabaseMappers.ts`: convierte registros de Supabase a entidades `Category`, `Menu`, `Commerce`, `Order` y `Banner`.
- `domain/entities/menuEntity.ts`: define la entidad `Menu` que consume la UI.

Funcionamiento:

- `MenuService` pagina resultados y permite filtrar por categoria o texto.
- Cada producto se mapea con sus imagenes y su categoria.
- `getImageUrl` transforma rutas de almacenamiento en URLs listas para renderizar.

### 6.6 Modulo de carrito

Responsabilidad: mantener los productos seleccionados, cantidades y pedido en curso.

Pieza principal:

- `presentation/context/cartContext.tsx`

Funcionamiento:

- Guarda `items` y `orderId` en AsyncStorage.
- Impide mezclar productos de distintos comercios.
- Permite agregar, quitar, actualizar cantidades y calcular total.
- Al iniciar, intenta restaurar el carrito y un pedido previamente guardado.

Reglas importantes del modulo:

- cantidad minima `1`;
- cantidad maxima `99`;
- no se pueden combinar items de comercios distintos;
- las observaciones diferencian items aparentemente iguales.

### 6.7 Modulo de checkout

Responsabilidad: transformar el carrito en un pedido real.

Piezas principales:

- `presentation/screens/checkout.tsx`: interfaz de resumen, direccion, pago y confirmacion.
- `presentation/hooks/useCheckout.tsx`: logica del checkout.
- `domain/services/supabase/checkoutDataService.ts`: trae metodos de pago, tasa de cambio, zonas de envio y extras.
- `domain/services/orderService.ts`: crea pedidos y consulta historial.

Funcionamiento:

1. `useCheckout` carga del comercio activo:
   - metodos de pago;
   - zonas de envio;
   - tasa de cambio.
2. Calcula el total como suma de items + delivery fee.
3. Valida usuario autenticado y consistencia de comercio.
4. Construye el payload del pedido.
5. Inserta el pedido en Supabase (`orders`).
6. Inserta los items en `order_items`.
7. Crea una notificacion de dashboard.
8. Limpia el carrito y notifica a la UI que hubo cambios en pedidos.

Detalle importante:

- La pantalla `checkout.tsx` tambien consulta una API publica de tipo de cambio (`exchangerate.host`) para mostrar equivalencia en VES, mientras que el hook usa la tasa almacenada en Supabase para persistir el pedido. Es decir, visualizacion y persistencia no salen exactamente de la misma fuente.

### 6.8 Modulo de pedidos

Responsabilidad: listar, consultar y cancelar pedidos.

Piezas principales:

- `domain/services/orderService.ts`
- `presentation/screens/orderList.tsx`
- `presentation/screens/orderDetail.tsx`
- `presentation/context/orderContext.tsx`
- `presentation/hooks/useOrders.tsx` (por convencion del proyecto, concentraria la carga de pedidos en UI)

Funcionamiento:

- Los pedidos se leen desde Supabase con joins hacia items, productos, addons y zonas de entrega.
- Los resultados se transforman con `mapOrder` a `OrderEntity`.
- `OrderEventsProvider` expone un contador simple (`ordersRevision`) para forzar refrescos de pantallas que dependen de pedidos.

Observacion:

- En `getAllOrders` existe un comentario indicando que deberia filtrarse por usuario actual, pero la consulta efectiva filtra por `commerce_id` y no por cliente. Eso es un punto sensible a revisar en evolucion futura.

### 6.9 Modulo de direcciones

Responsabilidad: gestionar direcciones de entrega del usuario.

Piezas principales:

- `presentation/hooks/useAddress.tsx`: contexto/hook para direcciones.
- `domain/services/deliveryAddressService.ts`: CRUD de direcciones contra API REST.
- componentes relacionados:
  - `addressForm.tsx`
  - `addressHeader.tsx`
  - `addressListModal.tsx`
  - `addressSelector.tsx`
  - `addressEditable.tsx`

Funcionamiento:

- La lista de direcciones se consulta via API propia autenticada.
- Se puede crear/actualizar/eliminar direccion.
- El contexto intenta mantener una direccion por defecto en memoria.
- Home y checkout consumen esta informacion para seleccionar destino de entrega.

Detalle de implementacion:

- Aunque el archivo se llame `useAddress.tsx`, en realidad implementa provider + contexto, no solo un hook puro.

### 6.10 Modulo de notificaciones

Responsabilidad: mostrar y marcar notificaciones de usuario.

Piezas principales:

- `presentation/context/notificationContext.tsx`
- `domain/services/notificationService.ts`
- `data/repository/notificationRepository.ts`
- `domain/services/pushNotificationService.ts`
- `presentation/context/pushNotificationContext.tsx`

Funcionamiento:

- El contexto carga notificaciones paginadas.
- Calcula cantidad de no leidas.
- Permite marcar una o todas como leidas.
- Usa reintentos simples en carga inicial.
- La persistencia principal de notificaciones visibles viene de la API REST.

### 6.11 Modulo de perfil

Responsabilidad: mostrar y editar datos del usuario y accesos secundarios.

Pantallas relacionadas:

- `profile.tsx`
- `profileDetail.tsx`
- `profileAddressList.tsx`
- `privacy.tsx`
- `terms.tsx`
- `resetPassword.tsx`

Funcionamiento general:

- se apoya en `userContext` para la sesion actual;
- usa servicios/repositorios legacy para partes del perfil, avatars o recuperacion de contrasena;
- conecta con direcciones, terminos y privacidad.

### 6.12 Modulo de componentes reutilizables

Responsabilidad: encapsular piezas de UI para no duplicar pantallas.

Subgrupos visibles en `presentation/components/`:

- componentes de direccion;
- tarjetas de comercio y menu;
- carrusel de banners;
- grid de categorias;
- formularios de auth;
- modales;
- tooltips e iconografia de tabs;
- manejo visual de errores.

Estos componentes reciben entidades ya mapeadas y procuran mantenerse relativamente tontos, dejando la carga de datos a hooks/contextos.

## 7. Carpetas del proyecto explicadas

### 7.1 `assets/`

Recursos estaticos: fuentes, imagenes, iconos y JSON legales (`privacy.json`, `terms.json`).

### 7.2 `data/`

Implementaciones de repositorios y schemas. Es la capa de acceso a datos tradicional. En la practica hoy se usa sobre todo para endpoints REST legacy.

### 7.3 `domain/entities/`

Modelos del negocio como `User`, `Menu`, `OrderEntity`, `Commerce`, `Category`, `Address`, `NotificationEntity`. Son las estructuras que deberian circular entre servicios y UI.

### 7.4 `domain/mappers/`

Traductores entre datos crudos de Supabase y entidades del dominio.

### 7.5 `domain/repositories/`

Contratos TypeScript que describen como deberian lucir los repositorios concretos.

### 7.6 `domain/services/`

Casos de uso y orquestacion de negocio. Aqui esta la mayor parte de la logica que decide como consultar, transformar o persistir informacion.

### 7.7 `domain/services/supabase/`

Servicios especializados exclusivamente en tablas y consultas de Supabase. Es una subcapa clave del estado actual del proyecto.

### 7.8 `domain/sources/remote/`

Cliente remoto base (`ApiClient`) para consumir la API REST propia con o sin autenticacion.

### 7.9 `infrastructure/config/`

Helpers tecnicos como `tryCatch`.

### 7.10 `infrastructure/http/`

Interceptores y wrappers HTTP. Manejan token valido, refresh y consumo de endpoints autenticados.

### 7.11 `infrastructure/storage/`

Abstraccion minima sobre AsyncStorage.

### 7.12 `infrastructure/supabase/`

Cliente Supabase, configuracion y helpers para construir URLs de imagenes almacenadas.

### 7.13 `navigation/`

Rutas principales de la app, stacks, tabs y servicio de navegacion externa.

### 7.14 `presentation/components/`

Bloques visuales reutilizables.

### 7.15 `presentation/context/`

Estado global de carrito, usuario, notificaciones, pedidos y push notifications.

### 7.16 `presentation/hooks/`

Hooks de logica de pantalla y consumo de servicios. Aqui se concentra mucha orquestacion de UI.

### 7.17 `presentation/screens/`

Pantallas finales que el usuario navega.

### 7.18 `presentation/styles/`

Tema visual, tipografias y estilos compartidos.

### 7.19 `utils/`

Funciones auxiliares de uso general.

### 7.20 Archivos raiz

Los archivos de la raiz cumplen roles importantes:

- `App.tsx`: bootstrap real de la app.
- `app.json`: configuracion de Expo, permisos, splash, iconos y runtime.
- `tsconfig.json`: alias de paths como `~/presentation/*` o `~/domain/*`.
- `tailwind.config.js` y `global.css`: soporte NativeWind y tipografia global.
- `babel.config.js`, `metro.config.js`, `prettier.config.js`: toolchain de build y formato.
- `README.md`, `UX_UI_IMPROVEMENTS.md`, `CATEGORY_UX_IMPROVEMENTS.md`, `FONT_USAGE.md`: documentacion complementaria del proyecto.

## 8. Decisiones tecnicas importantes del proyecto

### 8.1 Arquitectura hibrida

La aplicacion no es 100% Supabase ni 100% API REST. Conviven ambos modelos.

Eso afecta:

- autenticacion;
- perfil;
- direcciones;
- notificaciones;
- pedidos/catalogo.

### 8.2 Single source of truth parcial

La UI usa contextos como fuente de verdad inmediata, pero parte del estado persistente vive en AsyncStorage y parte en Supabase/API. Hay que entender bien esa combinacion para evitar inconsistencias.

### 8.3 Comercio activo unico

Muchos flujos asumen un solo comercio activo y filtran todo con ese id. Si el producto evoluciona a multi-commerce real, esa pieza sera de las primeras en cambiar.

### 8.4 Cache en memoria por hook

Varios hooks usan cache temporal por tiempo (`lastFetchTime`). No hay una libreria de fetching global como React Query; el caching es casero y localizado.

## 9. Riesgos o puntos de atencion

1. **Autenticacion duplicada**: hay sesion Supabase y tambien tokens manuales para la API propia.
2. **Pedidos posiblemente no filtrados por cliente**: `getAllOrders` se apoya en `commerce_id`, lo cual podria devolver mas informacion de la debida si no hay RLS u otro filtro de backend.
3. **Fuentes de tipo de cambio distintas**: una para UI y otra para persistencia.
4. **Contextos con doble responsabilidad**: por ejemplo `useAddress.tsx` es hook y provider a la vez.
5. **Arquitectura parcialmente migrada**: hay carpetas y contratos pensados para una separacion limpia, pero algunas rutas reales de datos la saltan directamente.

## 10. Resumen ejecutivo

Dores es una app de pedidos de comida orientada a un comercio activo, construida en Expo/React Native, con una arquitectura por capas que mezcla una API REST propia con consultas directas a Supabase.

Sus modulos mas importantes son:

- autenticacion y sesion;
- navegacion autenticada/publica;
- home y catalogo;
- carrito y checkout;
- pedidos;
- perfil y direcciones;
- notificaciones;
- servicios de infraestructura para almacenamiento, autenticacion y acceso a datos.

Si alguien entra nuevo al proyecto, la mejor forma de entenderlo es seguir este recorrido:

1. `App.tsx`
2. `navigation/root.tsx`
3. `navigation/stack.tsx`
4. `presentation/screens/home.tsx`
5. `presentation/hooks/useCheckout.tsx`
6. `domain/services/orderService.ts`
7. `domain/services/supabase/commerceService.ts`
8. `presentation/context/userContext.tsx`
9. `domain/sources/remote/apiClient.ts`

Ese recorrido muestra casi todo el comportamiento importante del sistema.

## 11. Variables de entorno y comandos de inicializacion

### 11.1 Variables de entorno que el proyecto deberia tener

Hoy el proyecto usa varias URLs y claves hardcodeadas. Para hacerlo portable entre entornos (`local`, `staging`, `production`), estas variables deberian salir a un archivo `.env` o al `extra` de Expo.

Variables recomendadas:

- `EXPO_PUBLIC_API_BASE_URL`
   - uso: base URL de la API REST propia.
   - valor actual hardcodeado: `https://dores.cruznegradev.com/api`
   - archivos afectados: `domain/sources/remote/apiClient.ts`, `infrastructure/http/apiService.ts`

- `EXPO_PUBLIC_SUPABASE_URL`
   - uso: URL del proyecto Supabase.
   - valor actual hardcodeado: `https://yjpcnxhtrucncqdzoyxy.supabase.co`
   - archivo afectado: `infrastructure/supabase/config.ts`

- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - uso: clave anon publica de Supabase.
   - valor actual hardcodeado: presente en `infrastructure/supabase/config.ts`
   - archivo afectado: `infrastructure/supabase/config.ts`

- `EXPO_PUBLIC_MAPBOX_TOKEN`
   - uso: token para el selector de mapa Mapbox.
   - estado actual: ya existe como lectura en codigo.
   - archivo afectado: `presentation/components/mapboxPicker.tsx`

- `EXPO_PUBLIC_EAS_PROJECT_ID`
   - uso: `projectId` usado por Expo/EAS para push notifications y builds.
   - estado actual: hay una inconsistencia.
   - `app.json` tiene `1120d18c-4e8b-4b21-b11f-6d75c8125388`.
   - `pushNotificationService.ts` usa `548b5fb3-afc2-4cbd-9558-79e5f1d1bf97`.
   - recomendacion: unificar ambos en una sola fuente de configuracion.

Variables opcionales, pero convenientes:

- `EXPO_PUBLIC_EXCHANGE_RATE_API_URL`
   - uso: endpoint para conversion USD -> VES en UI.
   - valor actual hardcodeado: `https://api.exchangerate.host/latest?base=USD&symbols=VES`
   - archivo afectado: `presentation/screens/checkout.tsx`

- `EXPO_PUBLIC_DOLAR_API_URL`
   - uso: endpoint alternativo para obtener tasa viva.
   - valor actual hardcodeado: `https://ve.dolarapi.com/v1/dolares`
   - archivo afectado: `domain/services/supabase/checkoutDataService.ts`

### 11.2 Ejemplo recomendado de `.env`

```env
EXPO_PUBLIC_API_BASE_URL=https://dores.cruznegradev.com/api
EXPO_PUBLIC_SUPABASE_URL=https://yjpcnxhtrucncqdzoyxy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
EXPO_PUBLIC_MAPBOX_TOKEN=tu_mapbox_public_token
EXPO_PUBLIC_EAS_PROJECT_ID=tu_eas_project_id
EXPO_PUBLIC_EXCHANGE_RATE_API_URL=https://api.exchangerate.host/latest?base=USD&symbols=VES
EXPO_PUBLIC_DOLAR_API_URL=https://ve.dolarapi.com/v1/dolares
```

### 11.3 Comandos para inicializar el proyecto

Comandos base:

1. Instalar dependencias:

```powershell
npm install
```

2. Iniciar Metro / Expo:

```powershell
npm run start
```

3. Levantar version web:

```powershell
npm run web
```

4. Ejecutar Android nativo:

```powershell
npm run android
```

5. Generar carpeta nativa si hace falta prebuild:

```powershell
npm run prebuild
```

6. Validar lint y formato:

```powershell
npm run lint
```

7. Corregir formato automaticamente:

```powershell
npm run format
```

### 11.4 Flujo recomendado de arranque local

Para desarrollo normal:

1. Crear `.env` con las variables anteriores.
2. Ejecutar `npm install`.
3. Ejecutar `npm run start`.
4. Abrir en Expo Go, emulador Android o navegador con `w`.

Si se necesita Android nativo:

1. Tener Android Studio y SDK configurados.
2. Ejecutar `npm run android`.

Notas:

- En Windows, `npm run ios` no aparece y no es viable de forma local salvo entorno macOS.
- El repositorio no declara una version fija de Node en `package.json`, asi que conviene usar una version LTS moderna compatible con Expo 52.
- Hoy no existe un `.env.example` visible en la raiz; seria recomendable agregarlo.