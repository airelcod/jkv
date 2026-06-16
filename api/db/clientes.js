import { query, sendJSON, parseBody } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const method = req.method;
    
    if (method === 'GET') {
        const { action, id } = req.query;
        
        if (action === 'obtener_todos') {
            try {
                const hasActivo = await columnExists('clientes', 'activo');
                
                const sql = hasActivo 
                    ? "SELECT id, nombre, rif, telefono, contacto, email, direccion FROM clientes WHERE activo = 1 ORDER BY nombre ASC"
                    : "SELECT id, nombre, rif, telefono, contacto, email, direccion FROM clientes ORDER BY nombre ASC";
                
                const clientes = await query(sql);
                sendJSON(res, { success: true, clientes });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        
        if (action === 'obtener_uno' && id) {
            try {
                const hasActivo = await columnExists('clientes', 'activo');
                
                const sql = hasActivo
                    ? "SELECT * FROM clientes WHERE id = ? AND activo = 1"
                    : "SELECT * FROM clientes WHERE id = ?";
                
                const clientes = await query(sql, [id]);
                
                if (clientes.length > 0) {
                    sendJSON(res, { success: true, cliente: clientes[0] });
                } else {
                    sendJSON(res, { success: false, error: 'Cliente no encontrado' });
                }
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        
        sendJSON(res, { success: false, error: 'Acción GET no válida' });
        return;
    }
    
    if (method === 'POST') {
        const data = await parseBody(req);
        const { action } = data;
        
        if (action === 'guardar') {
            try {
                const { nombre, rif, telefono, contacto, email, direccion } = data;
                
                if (!nombre) {
                    sendJSON(res, { success: false, error: 'El nombre del cliente es requerido' });
                    return;
                }
                
                const hasActivo = await columnExists('clientes', 'activo');
                
                let sql, params;
                if (hasActivo) {
                    sql = "INSERT INTO clientes (nombre, rif, telefono, contacto, email, direccion, activo) VALUES (?, ?, ?, ?, ?, ?, 1)";
                    params = [nombre, rif || '', telefono || '', contacto || '', email || '', direccion || ''];
                } else {
                    sql = "INSERT INTO clientes (nombre, rif, telefono, contacto, email, direccion) VALUES (?, ?, ?, ?, ?, ?)";
                    params = [nombre, rif || '', telefono || '', contacto || '', email || '', direccion || ''];
                }
                
                const result = await query(sql, params);
                sendJSON(res, { success: true, id: result.insertId, message: 'Cliente creado correctamente' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        
        if (action === 'actualizar') {
            try {
                const { id, nombre, rif, telefono, contacto, email, direccion } = data;
                
                if (!id || id <= 0) {
                    sendJSON(res, { success: false, error: 'ID de cliente inválido' });
                    return;
                }
                if (!nombre) {
                    sendJSON(res, { success: false, error: 'El nombre del cliente es requerido' });
                    return;
                }
                
                const sql = "UPDATE clientes SET nombre = ?, rif = ?, telefono = ?, contacto = ?, email = ?, direccion = ? WHERE id = ?";
                const params = [nombre, rif || '', telefono || '', contacto || '', email || '', direccion || '', id];
                
                await query(sql, params);
                sendJSON(res, { success: true, message: 'Cliente actualizado correctamente' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        
        if (action === 'eliminar') {
            try {
                const { id } = data;
                
                if (!id || id <= 0) {
                    sendJSON(res, { success: false, error: 'ID de cliente inválido' });
                    return;
                }
                
                const hasActivo = await columnExists('clientes', 'activo');
                
                if (hasActivo) {
                    await query("UPDATE clientes SET activo = 0 WHERE id = ?", [id]);
                } else {
                    const ventas = await query("SELECT COUNT(*) as total FROM ventas WHERE cliente_id = ?", [id]);
                    if (ventas[0].total > 0) {
                        sendJSON(res, { success: false, error: 'No se puede eliminar el cliente porque tiene ventas asociadas' });
                        return;
                    }
                    await query("DELETE FROM clientes WHERE id = ?", [id]);
                }
                
                sendJSON(res, { success: true, message: 'Cliente eliminado correctamente' });
            } catch (error) {
                sendJSON(res, { success: false, error: error.message }, 500);
            }
            return;
        }
        
        sendJSON(res, { success: false, error: 'Acción POST no válida' });
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}
