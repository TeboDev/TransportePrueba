-- 03_procedures.sql
-- Procedimientos Almacenados y Cursores

-- Paquete para manejo de tipos de retorno
CREATE OR REPLACE PACKAGE PKG_REPORTES AS
    TYPE T_CURSOR IS REF CURSOR;
END PKG_REPORTES;
/

-- Procedimiento que usa un CURSOR para construir un CSV
-- Retorna el contenido CSV como un CLOB para ser consumido por la APP Web.
-- Se cumple el requerimiento de "Recorrer registros con cursor" explícitamente.
CREATE OR REPLACE PROCEDURE SP_GENERAR_REPORTE_CSV (
    P_RESULTADO OUT CLOB
) AS
    -- Definición del Cursor Explícito
    CURSOR C_PASAJES IS
        SELECT 
            R.NOMBRE_RUTA,
            TP.DESCRIPCION AS TIPO_PASAJE,
            P.VALOR_FINAL,
            TO_CHAR(P.FECHA_VIAJE, 'YYYY-MM-DD') AS FECHA,
            TO_CHAR(P.FECHA_VIAJE, 'HH24:MI') AS HORA,
            P.NOMBRE_PASAJERO
        FROM PASAJES P
        JOIN RUTAS R ON P.ID_RUTA = R.ID_RUTA
        JOIN TIPOS_PASAJE TP ON P.ID_TIPO_PASAJE = TP.ID_TIPO_PASAJE
        ORDER BY P.FECHA_VIAJE DESC;

    -- Variables para leer el cursor
    V_NOMBRE_RUTA RUTAS.NOMBRE_RUTA%TYPE;
    V_TIPO_PASAJE TIPOS_PASAJE.DESCRIPCION%TYPE;
    V_VALOR_FINAL PASAJES.VALOR_FINAL%TYPE;
    V_FECHA       VARCHAR2(20);
    V_HORA        VARCHAR2(10);
    V_PASAJERO    PASAJES.NOMBRE_PASAJERO%TYPE;

    V_LINEA       VARCHAR2(4000);
BEGIN
    -- Inicializar el CLOB
    DBMS_LOB.CREATETEMPORARY(P_RESULTADO, TRUE);
    
    -- Escribir Cabecera CSV
    V_LINEA := 'RUTA,TIPO_PASAJE,VALOR,FECHA,HORA,PASAJERO' || CHR(10);
    DBMS_LOB.WRITEAPPEND(P_RESULTADO, LENGTH(V_LINEA), V_LINEA);
    
    -- Abrir y recorrer el Cursor
    OPEN C_PASAJES;
    LOOP
        FETCH C_PASAJES INTO V_NOMBRE_RUTA, V_TIPO_PASAJE, V_VALOR_FINAL, V_FECHA, V_HORA, V_PASAJERO;
        EXIT WHEN C_PASAJES%NOTFOUND;
        
        -- Construir línea CSV
        -- Se manejan comas o comillas si existieran en los datos (básico)
        V_LINEA := '"' || V_NOMBRE_RUTA || '",' ||
                   '"' || V_TIPO_PASAJE || '",' ||
                   TO_CHAR(V_VALOR_FINAL, '9990.99') || ',' ||
                   V_FECHA || ',' ||
                   V_HORA || ',' ||
                   '"' || V_PASAJERO || '"' || CHR(10);
                   
        DBMS_LOB.WRITEAPPEND(P_RESULTADO, LENGTH(V_LINEA), V_LINEA);
    END LOOP;
    CLOSE C_PASAJES;
    
EXCEPTION
    WHEN OTHERS THEN
        IF C_PASAJES%ISOPEN THEN
            CLOSE C_PASAJES;
        END IF;
        RAISE;
END;
/
