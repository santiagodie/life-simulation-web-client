# TrabajoIndividual-TT1-Docs

Este proyecto es la parte del trabajo individual de la práctica 5 de la asignatura **Taller Transversal I: Programación y Proceso de Información** de la Universidad de La Rioja (curso 25/26)

## Autor

*Santiago Die Morejón* – Universidad de La Rioja

## Descripción del Proyecto

Este proyecto es una aplicación web que permite a los usuarios:
- Solicitar simulaciones especificando cantidades de diferentes entidades
- Validar datos de entrada con mensajes de error detallados
- Obtener un token único para cada solicitud de simulación registrada en el servicio externo
- Visualizar los resultados de simulaciones en una grilla interactiva con control de tiempo
- Gestionar el envío de notificaciones por email a destinatarios
- Consumir un servicio externo REST (ServicioConsumible) mediante un cliente OpenAPI generado automáticamente

El sistema está construido sobre Spring Boot 4.0.3 con Java 17, utilizando Thymeleaf para las vistas y RestTemplate para la comunicación con el servicio externo.

## Requisitos Previos

- Java 17
- Maven 3.9.6 (incluido Maven Wrapper en el proyecto)
- Un IDE compatible con Java
- El servicio externo corriendo en `http://localhost:8080`

## Uso

### Solicitar una Simulación

1. Navega a `http://localhost:8081/solicitud`
2. Completa el formulario con las cantidades deseadas para cada entidad
3. Envía el formulario
4. El sistema validará los datos y:
   - Si hay errores, mostrará mensajes de validación
   - Si es exitoso, llamará al servicio externo (`POST /Solicitud/Solicitar`) y devolverá el token real devuelto por el servidor

### Visualizar una Simulación

1. Navega a `http://localhost:8081/grid?tok=<token>`
2. El sistema llamará al servicio externo (`POST /Resultados`) con el token y mostrará:
   - Una grilla visual N×N generada dinámicamente con el ancho devuelto por el servidor
   - Colores diferenciados para cada punto (`tiempo,y,x,color`)
   - Un slider para recorrer la evolución temporal de la simulación

## Estructura del Proyecto

```
trabajo-individual-tt1-pr-ctica-5-sadie27/
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   ├── com/tt1/trabajo/
│   │   │   │   ├── SolicitudController.java      # Controlador web principal
│   │   │   │   ├── GridController.java           # Controlador de visualización de grilla
│   │   │   │   └── TrabajoApplication.java       # Clase principal de Spring Boot
│   │   │   │
│   │   │   ├── interfaces/
│   │   │   │   ├── InterfazContactoSim.java      # Interfaz para servicio de simulación
│   │   │   │   └── InterfazEnviarEmails.java     # Interfaz para servicio de emails
│   │   │   │
│   │   │   ├── modelo/
│   │   │   │   ├── DatosSimulation.java          # Modelo de datos de simulación
│   │   │   │   ├── DatosSolicitud.java           # Modelo de solicitud
│   │   │   │   ├── Destinatario.java             # Modelo de destinatario de email
│   │   │   │   ├── Entidad.java                  # Modelo de entidad simulable
│   │   │   │   └── Punto.java                    # Modelo de punto en la grilla
│   │   │   │
│   │   │   ├── servicios/
│   │   │   │   ├── ContactoSimService.java       # Servicio de gestión de simulaciones (llama a API externa)
│   │   │   │   ├── EnviarEmailsService.java      # Servicio de envío de emails
│   │   │   │   └── LoggerConfig.java             # Configuración de logging
│   │   │   │
│   │   │   └── com/tt1/trabajo/utilidades/       # Cliente OpenAPI generado (ServicioConsumible)
│   │   │       ├── ApiClient.java                # Cliente HTTP central (RestTemplate)
│   │   │       ├── BaseApi.java                  # Clase base para todas las APIs
│   │   │       ├── EmailApi.java                 # Cliente para /Email
│   │   │       ├── ResultadosApi.java            # Cliente para /Resultados
│   │   │       ├── SolicitudApi.java             # Cliente para /Solicitud/*
│   │   │       ├── JavaTimeFormatter.java        # Utilidad de fechas
│   │   │       ├── ServerConfiguration.java      # Configuración de servidor
│   │   │       ├── ServerVariable.java           # Variables de servidor
│   │   │       ├── auth/
│   │   │       │   ├── Authentication.java       # Interfaz de autenticación
│   │   │       │   ├── ApiKeyAuth.java           # Autenticación por API key
│   │   │       │   ├── HttpBasicAuth.java        # Autenticación Basic
│   │   │       │   └── HttpBearerAuth.java       # Autenticación Bearer token
│   │   │       └── modelo/
│   │   │           ├── Solicitud.java            # DTO de solicitud al servicio externo
│   │   │           ├── EmailResponse.java        # DTO de respuesta de email
│   │   │           └── ProblemDetails.java       # DTO de error RFC 7807
│   │   │
│   │   └── resources/
│   │       ├── application.properties            # Configuración de la aplicación
│   │       └── templates/
│   │           ├── solicitud.html                # Vista del formulario
│   │           ├── formResult.html               # Vista de resultados con token
│   │           └── grid.html                     # Vista de grilla de simulación con slider
│   │
│   └── test/
│       └── java/com/tt1/trabajo/
│           ├── ContactoSimServiceTest.java           # Tests unitarios con mocks de RestTemplate y ResultadosApi
│           ├── EnviarEmailsServiceTest.java          # Tests unitarios del servicio de emails con mock de Logger
│           └── utilidades/
│               └── ServicioConsumibleClientTest.java # Test de integración del cliente OpenAPI 
│
├── .mvn/wrapper/
├── pom.xml                                       # Configuración de Maven
├── mvnw                                          # Maven Wrapper (Linux/Mac)
├── mvnw.cmd                                      # Maven Wrapper (Windows)
└── README.md                                     
```

## Flujo de Datos

```
Formulario /solicitud
      │
      ▼
SolicitudController.handleSolicitud()
      │  construye DatosSolicitud (Map<idEntidad, cantidad>)
      ▼
ContactoSimService.solicitarSimulation()
      │  convierte a {"solicitud": {"cantidadesIniciales": [...], "nombreEntidades": [...]}}
      │  POST http://localhost:8080/Solicitud/Solicitar?nombreUsuario=sadie27
      │  extrae tokenSolicitud de la respuesta
      ▼
formResult.html muestra el token
      │
      ▼ (usuario navega a /grid?tok=<token>)
GridController.solicitud()
      │
      ▼
ContactoSimService.descargarDatos(token)
      │  POST http://localhost:8080/Resultados?nombreUsuario=sadie27&tok=<token>
      │  parsea respuesta: primera línea = ancho, resto = tiempo,y,x,color
      │  construye DatosSimulation con anchoTablero, maxSegundos, Map<tiempo, List<Punto>>
      ▼
grid.html renderiza grilla N×N con slider temporal
```

## Tests

Los tests incluyen:
- `ContactoSimServiceTest`: Pruebas unitarias del servicio de simulaciones. Mockea `RestTemplate` y `ResultadosApi` para no depender del servicio externo.
- `EnviarEmailsServiceTest`: Pruebas unitarias del servicio de emails con mock de `Logger` .
- `ServicioConsumibleClientTest`: Test de integración del cliente OpenAPI contra el servicio externo en `http://localhost:8080`.

Para ejecutar solo los tests unitarios (sin servidor):
```bash
./mvnw test -Dtest="ContactoSimServiceTest,EnviarEmailsServiceTest"
```

## Tecnologías Utilizadas

- **Spring Boot 4.0.3**: Framework principal
- **Spring MVC**: Para controladores web
- **Thymeleaf**: Motor de plantillas para las vistas
- **Spring REST Client / RestTemplate**: Para comunicación REST con el servicio externo
- **OpenAPI Generator 7.21.0**: Generación automática del cliente HTTP
- **Maven 3.9.6**: Gestión de dependencias y construcción
- **JUnit 5**: Framework de testing
- **Mockito**: Mocking en tests unitarios

## Licencia

Este proyecto está bajo la licencia especificada en el archivo LICENSE.
