import os
import oracledb
from flask import Flask, render_template, request, jsonify, Response
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Oracle Connection configurations
DB_USER = os.getenv("DB_USER", "system")
DB_PASSWORD = os.getenv("DB_PASSWORD", "oracle")
DB_DSN = os.getenv("DB_DSN", "localhost/xe")

def get_db_connection():
    try:
        # Initialize Oracle Client if necessary (for thick mode)
        # oracledb.init_oracle_client(lib_dir="/path/to/instantclient")
        
        # Thin mode (default) - no need for instant client if using standard auth
        connection = oracledb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            dsn=DB_DSN
        )
        return connection
    except oracledb.Error as e:
        print(f"Error connecting to Oracle: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """Fetch dropdown options for frontend"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ID_RUTA, NOMBRE_RUTA FROM RUTAS ORDER BY NOMBRE_RUTA")
        rutas = [{"id": r[0], "nombre": r[1]} for r in cursor.fetchall()]
        
        cursor.execute("SELECT ID_UNIDAD, NUMERO_DISCO, PLACA FROM UNIDADES ORDER BY NUMERO_DISCO")
        unidades = [{"id": r[0], "disco": r[1], "placa": r[2]} for r in cursor.fetchall()]
        
        cursor.execute("SELECT ID_TIPO_PASAJE, DESCRIPCION, PORCENTAJE_DESCUENTO FROM TIPOS_PASAJE ORDER BY DESCRIPCION")
        tipos = [{"id": r[0], "descripcion": r[1], "descuento": r[2]} for r in cursor.fetchall()]
        
        return jsonify({
            "rutas": rutas,
            "unidades": unidades,
            "tipos": tipos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pasajes', methods=['GET'])
def get_pasajes():
    ruta_id = request.args.get('ruta_id')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    query = """
        SELECT P.ID_PASAJE, P.FECHA_VIAJE, R.NOMBRE_RUTA, U.NUMERO_DISCO, TP.DESCRIPCION, P.VALOR_FINAL, P.NOMBRE_PASAJERO
        FROM PASAJES P
        JOIN RUTAS R ON P.ID_RUTA = R.ID_RUTA
        JOIN UNIDADES U ON P.ID_UNIDAD = U.ID_UNIDAD
        JOIN TIPOS_PASAJE TP ON P.ID_TIPO_PASAJE = TP.ID_TIPO_PASAJE
        WHERE 1=1
    """
    params = []
    
    if ruta_id and ruta_id != 'null' and ruta_id != '':
        query += " AND P.ID_RUTA = :ruta_id"
        params.append(ruta_id)
        
    query += " ORDER BY P.FECHA_VIAJE DESC"
    
    try:
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        # Convert datetime objects to string
        for row in results:
            if 'FECHA_VIAJE' in row and row['FECHA_VIAJE']:
                row['FECHA_VIAJE'] = row['FECHA_VIAJE'].isoformat()
                
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pasajes', methods=['POST'])
def create_pasaje():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
        
    cursor = conn.cursor()
    try:
        # Simple Logic: Calculate value based on base price and discount
        # Note: In a real app, this logic might be better in PL/SQL or verified again here.
        # For simplicity, we trust the ID mappings.
        
        cursor.execute("SELECT PRECIO_BASE FROM RUTAS WHERE ID_RUTA = :id", [data['id_ruta']])
        precio_base = cursor.fetchone()[0]
        
        cursor.execute("SELECT PORCENTAJE_DESCUENTO FROM TIPOS_PASAJE WHERE ID_TIPO_PASAJE = :id", [data['id_tipo']])
        descuento = cursor.fetchone()[0]
        
        valor_final = precio_base * (1 - (descuento/100))
        
        cursor.execute("""
            INSERT INTO PASAJES (FECHA_VIAJE, ID_RUTA, ID_UNIDAD, ID_TIPO_PASAJE, VALOR_FINAL, NOMBRE_PASAJERO)
            VALUES (TO_DATE(:fecha, 'YYYY-MM-DD HH24:MI'), :ruta, :unidad, :tipo, :valor, :nombre)
        """, {
            'fecha': data['fecha__viaje'], # Expecting 'YYYY-MM-DD HH:MM'
            'ruta': data['id_ruta'],
            'unidad': data['id_unidad'],
            'tipo': data['id_tipo'],
            'valor': valor_final,
            'nombre': data['nombre_pasajero']
        })
        conn.commit()
        return jsonify({"message": "Pasaje creado exitosamente", "valor": valor_final}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/pasajes/<int:id>', methods=['DELETE'])
def delete_pasaje(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
        
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM PASAJES WHERE ID_PASAJE = :id", [id])
        conn.commit()
        return jsonify({"message": "Pasaje eliminado"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/export/csv', methods=['GET'])
def export_csv():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
        
    cursor = conn.cursor()
    try:
        # Call the Stored Procedure that returns a CLOB
        clob_out = cursor.var(oracledb.DB_TYPE_CLOB)
        cursor.callproc("SP_GENERAR_REPORTE_CSV", [clob_out])
        
        csv_content = clob_out.getvalue().read()
        
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=reporte_pasajes.csv"}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
