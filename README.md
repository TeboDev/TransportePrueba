# Sistema de Gestión de Cooperativa de Transporte

Este proyecto implementa un sistema para la gestión de pasajes de una cooperativa de transporte, integrando una base de datos Oracle con una aplicación web en Python (Flask).

## 1. Arquitectura de la Aplicación
El sistema sigue una arquitectura cliente-servidor de tres capas:

*   **Capa de Datos (Oracle Database):**
    *   Almacena la información integra y relacional.
    *   Ejecuta lógica de negocio crítica mediante **Procedimientos Almacenados**.
    *   Motor: Oracle Database 11g/12c/19c/21c XE.
*   **Capa de Negocio (Backend - Python/Flask):**
    *   Expone una API REST para las operaciones CRUD.
    *   Gestiona la conexión a base de datos mediante la librería `oracledb`.
    *   Procesa las peticiones del cliente y formatea las respuestas en JSON.
*   **Capa de Presentación (Frontend - HTML/JS/CSS):**
    *   Interfaz web moderna y responsiva.
    *   Consume la API mediante `fetch` asíncrono.
    *   Permite filtrado dinámico en el cliente.

## 2. Modelo de Datos
El modelo relacional consta de 4 tablas principales normalizadas:

1.  **TIPOS_PASAJE**: Categorización de boletos (Normal, Estudiantil, etc.) y sus reglas de descuento.
2.  **RUTAS**: Definición de trayectos (Origen-Destino) y precios base asociados.
3.  **UNIDADES**: Registro de la flota de buses (Disco, Placa, Capacidad).
4.  **PASAJES**: Tabla central transaccional que registra la venta.
    *   *Claves Foráneas*: `ID_RUTA`, `ID_UNIDAD`, `ID_TIPO_PASAJE`.
    *   *Restricciones*: `VALOR_FINAL >= 0`.

## 3. Funcionamiento del Cursor (Exportación CSV)
Para cumplir con el requerimiento de generar un archivo CSV mediante PL/SQL, se implementó el procedimiento almacenado `SP_GENERAR_REPORTE_CSV`.

**Lógica del Cursor:**
1.  Se define un cursor explícito `C_PASAJES` que realiza un `JOIN` entre Pasajes, Rutas y Tipos para obtener la información legible.
2.  Se utiliza un bucle `LOOP` para iterar fila por fila los resultados del cursor.
3.  En cada iteración, se concatenan los campos separados por comas (`,`) y se agregan a un objeto `CLOB` (Character Large Object).
4.  El procedimiento retorna este `CLOB` completo a la aplicación Python, la cual lo sirve al usuario como un archivo descargable `reporte_pasajes.csv`.

## 4. Instrucciones de Despliegue

### Requisitos Previos
*   Python 3.x
*   Oracle Database (Local o Remota)
*   Instant Client (si no se usa modo 'Thin', aunque `oracledb` lo maneja por defecto)

### Pasos
1.  **Base de Datos**: Ejecutar los scripts en orden:
    *   `db/01_schema.sql`
    *   `db/02_data.sql`
    *   `db/03_procedures.sql`
2.  **Configuración**:
    *   Crear un archivo `.env` en la carpeta `app/` basado en `.env.example`.
    *   Configurar credenciales: `DB_USER`, `DB_PASSWORD`, `DB_DSN`.
3.  **Instalar Dependencias**:
    ```bash
    cd app
    pip install -r requirements.txt
    ```
4.  **Ejecutar Aplicación**:
    ```bash
    python app.py
    ```
5.  **Acceso**:
    *   Abrir navegador en `http://localhost:5000`
