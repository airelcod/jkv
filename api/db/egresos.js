import { query, sendJSON, parseBody } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (req.method === 'GET') {
        switch (action) {
            case 'obtener':
                await obtenerEgresos(req, res);
                break;
            case 'obtener_categorias':
                await obtenerCategorias(req, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
        }
        return;
    }
    
    if (req.method === 'POST') {
        const data = await parseBody(req);
        const postAction = data.action;
        
        switch (postAction) {
            case 'guardar':
                await guardarEgreso(data, res);
                break;
            case 'eliminar':
                await eliminarEgreso(data, res);
                break;
            case 'guardar_categoria':
                await guardarCategoria(data, res);
                break;
            case 'actualizar_categoria':
                await actualizarCategoria(data, res);
                break;
            case 'eliminar_categoria':
                await eliminarCategoria(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerEgresos(req, res) {
    try {
        const { categoria, tipo } = req.query;
        
        let whereConditions = [];
        let params = [];
        
        if (categoria) {
            whereConditions.push("categoria = ?");
            params.push(categoria);
        }
        if (tipo === 'gasto' || tipo === 'costo') {
            whereConditions.push("tipo = ?");
            params.push(tipo);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        const egresos = await query(
            `SELECT * FROM egresos ${whereClause} ORDER BY fecha DESC, id DESC`,
            params
        );
        
        sendJSON(res, { success: true, datos: egresos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarEgreso(data, res) {
    try {
        const { tipo, fecha, descripcion, monto, categoria, metodo_pago, referencia, observaciones } = data;
        
        const result = await query(
            `INSERT INTO egresos (tipo, fecha, descripcion, monto, categoria, metodo_pago, referencia, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tipo, fecha, descripcion, monto, categoria || null, metodo_pago || 'efectivo', referencia || null, observaciones || null]
        );
        
        sendJSON(res, { success: true, message: 'Egreso registrado', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarEgreso(data, res) {
    try {
        await query("DELETE FROM egresos WHERE id = ?", [data.id]);
        sendJSON(res, { success: true, message: 'Egreso eliminado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerCategorias(req, res) {
    try {
        const { tipo } = req.query;
        const where = tipo ? "WHERE tipo = ? AND activo = 1" : "WHERE activo = 1";
        const params = tipo ? [tipo] : [];
        
        const categorias = await query(`SELECT * FROM categorias_egresos ${where} ORDER BY nombre`, params);
        sendJSON(res, { success: true, categorias });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarCategoria(data, res) {
    try {
        const { nombre, tipo } = data;
        
        const result = await query(
            "INSERT INTO categorias_egresos (nombre, tipo) VALUES (?, ?)",
            [nombre, tipo]
        );
        
        sendJSON(res, { success: true, message: 'Categoría creada', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function actualizarCategoria(data, res) {
    try {
        const { id, nombre } = data;
        
        await query("UPDATE categorias_egresos SET nombre = ? WHERE id = ?", [nombre, id]);
        sendJSON(res, { success: true, message: 'Categoría actualizada' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarCategoria(data, res) {
    try {
        const { id } = data;
        
        // Verificar si hay egresos con esta categoría
        const check = await query(
            "SELECT id FROM egresos WHERE categoria = (SELECT nombre FROM categorias_egresos WHERE id = ?) LIMIT 1",
            [id]
        );
        
        if (check.length > 0) {
            sendJSON(res, { success: false, error: 'No se puede eliminar la categoría porque tiene egresos asociados' });
            return;
        }
        
        await query("DELETE FROM categorias_egresos WHERE id = ?", [id]);
        sendJSON(res, { success: true, message: 'Categoría eliminada' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
