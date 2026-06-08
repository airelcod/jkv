import { query, sendJSON, parseBody, transaction } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (req.method === 'GET') {
        switch (action) {
            case 'obtener_deuda':
                await obtenerDeudaProveedor(req, res);
                break;
            case 'obtener_historial':
                await obtenerHistorialPagos(req, res);
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
            case 'registrar_pago':
                await registrarPago(data, res);
                break;
            case 'eliminar_pago':
                await eliminarPago(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerDeudaProveedor(req, res) {
    try {
        const proveedor_id = parseInt(req.query.proveedor_id || '0');
        
        if (!proveedor_id) {
            sendJSON(res, { success: false, error: 'ID de proveedor requerido' });
            return;
        }
        
        const deuda = await query(`
            SELECT COALESCE(SUM(monto), 0) as deuda 
            FROM deudas_proveedores 
            WHERE proveedor_id = ? AND estado = 'pendiente'
        `, [proveedor_id]);
        
        sendJSON(res, { success: true, deuda: parseFloat(deuda[0].deuda) });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerHistorialPagos(req, res) {
    try {
        const proveedor_id = parseInt(req.query.proveedor_id || '0');
        
        if (!proveedor_id) {
            sendJSON(res, { success: false, error: 'ID de proveedor requerido' });
            return;
        }
        
        const pagos = await query(`
            SELECT * FROM pagos_proveedores 
            WHERE proveedor_id = ? 
            ORDER BY fecha_pago DESC
        `, [proveedor_id]);
        
        sendJSON(res, { success: true, pagos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function registrarPago(data, res) {
    try {
        const { proveedor_id, semana_inicio, semana_fin, total_leche, costo_total, deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids } = data;
        
        // Obtener nombre del proveedor
        const proveedorInfo = await query("SELECT nombre FROM proveedores WHERE id = ?", [proveedor_id]);
        const proveedor_nombre = proveedorInfo.length > 0 ? proveedorInfo[0].nombre : '';
        
        await transaction(async (conn) => {
            await conn.execute(`
                INSERT INTO pagos_proveedores (
                    proveedor_id, semana_inicio, semana_fin, total_leche, costo_total,
                    deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [proveedor_id, semana_inicio, semana_fin, total_leche, costo_total, deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids || null]);
            
            // Marcar recepciones como pagadas
            await conn.execute(`
                UPDATE materia_prima 
                SET pagado = 1 
                WHERE proveedor_id = ? 
                  AND fecha BETWEEN ? AND ? 
                  AND (pagado = 0 OR pagado IS NULL)
            `, [proveedor_id, semana_inicio, semana_fin]);
            
            // Actualizar cuenta por pagar
            await conn.execute(`
                UPDATE cuentas_pagar 
                SET monto_pagado = ?, estado = 'pagado' 
                WHERE descripcion LIKE ? 
                  AND fecha_inicio = ?
                  AND oculto = 0
            `, [costo_total, `%${proveedor_nombre}%`, semana_inicio]);
            
            // Marcar adelantos como aplicados
            if (adelantos_ids) {
                const ids = adelantos_ids.split(',');
                for (const id of ids) {
                    const numId = parseInt(id);
                    if (numId > 0) {
                        await conn.execute("UPDATE adelantos_proveedores SET estado = 'aplicado' WHERE id = ?", [numId]);
                    }
                }
            }
            
            // Descontar de deudas de proveedores
            if (deducciones > 0) {
                let restante = deducciones;
                const deudas = await conn.execute(`
                    SELECT id, monto FROM deudas_proveedores 
                    WHERE proveedor_id = ? AND estado = 'pendiente'
                    ORDER BY fecha ASC
                `, [proveedor_id]);
                
                for (const deuda of deudas[0]) {
                    if (restante <= 0) break;
                    if (restante >= deuda.monto) {
                        await conn.execute("UPDATE deudas_proveedores SET estado = 'pagado' WHERE id = ?", [deuda.id]);
                        restante -= deuda.monto;
                    } else {
                        const nuevoMonto = deuda.monto - restante;
                        await conn.execute("UPDATE deudas_proveedores SET monto = ? WHERE id = ?", [nuevoMonto, deuda.id]);
                        restante = 0;
                    }
                }
            }
        });
        
        sendJSON(res, { success: true, message: 'Pago registrado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarPago(data, res) {
    try {
        const { id } = data;
        
        await transaction(async (conn) => {
            const [pago] = await conn.execute("SELECT * FROM pagos_proveedores WHERE id = ?", [id]);
            
            if (pago.length === 0) {
                throw new Error('Pago no encontrado');
            }
            
            const row = pago[0];
            
            // Marcar recepciones como no pagadas
            await conn.execute(`
                UPDATE materia_prima SET pagado = 0 
                WHERE proveedor_id = ? 
                  AND fecha BETWEEN ? AND ?
            `, [row.proveedor_id, row.semana_inicio, row.semana_fin]);
            
            // Restaurar adelantos como pendientes
            if (row.adelantos_ids) {
                const ids = row.adelantos_ids.split(',');
                for (const aid of ids) {
                    const numId = parseInt(aid);
                    if (numId > 0) {
                        await conn.execute("UPDATE adelantos_proveedores SET estado = 'pendiente' WHERE id = ?", [numId]);
                    }
                }
            }
            
            // Eliminar el pago
            await conn.execute("DELETE FROM pagos_proveedores WHERE id = ?", [id]);
        });
        
        sendJSON(res, { success: true, message: 'Pago eliminado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
