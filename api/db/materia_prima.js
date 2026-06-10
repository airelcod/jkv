import { query, sendJSON, parseBody, transaction } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (req.method === 'GET') {
        switch (action) {
            case 'obtener':
                await obtenerMateriaPrima(req, res);
                break;
            case 'obtener_proveedores':
                await obtenerProveedores(res);
                break;
            case 'obtener_adelantos':
                await obtenerAdelantos(req, res);
                break;
            case 'obtener_deuda_adelantos':
                await obtenerDeudaAdelantos(req, res);
                break;
            case 'obtener_proveedor':
                await obtenerProveedor(req, res);
                break;
            case 'obtener_detalle_recepcion':
                await obtenerDetalleRecepcion(req, res);
                break;
            case 'obtener_resumen_semanal':
                await obtenerResumenSemanal(req, res);
                break;
            case 'obtener_recepciones_por_periodo':
                await obtenerRecepcionesPorPeriodo(req, res);
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
                await guardarMateriaPrima(data, res);
                break;
            case 'eliminar':
                await eliminarMateriaPrima(data, res);
                break;
            case 'guardar_proveedor':
                await guardarProveedor(data, res);
                break;
            case 'guardar_adelanto':
                await guardarAdelanto(data, res);
                break;
            case 'eliminar_adelanto':
                await eliminarAdelanto(data, res);
                break;
            case 'actualizar_adelanto':
                await actualizarAdelanto(data, res);
                break;
            case 'actualizar_proveedor':
                await actualizarProveedor(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerMateriaPrima(req, res) {
    try {
        const { proveedor_id, modo = 'tabla' } = req.query;
        let whereProveedor = '';
        let params = [];
        
        if (proveedor_id && proveedor_id > 0) {
            whereProveedor = 'AND mp.proveedor_id = ?';
            params.push(proveedor_id);
        }
        
        // Recepciones no pagadas
        const noPagadas = await query(`
            SELECT mp.*, p.nombre as proveedor_nombre, p.contacto, p.telefono,
                   (mp.cantidad_litros * mp.costo_por_litro) as total_calculado,
                   0 as es_cabecera
            FROM materia_prima mp
            LEFT JOIN proveedores p ON mp.proveedor_id = p.id
            WHERE (mp.pagado = 0 OR mp.pagado IS NULL) ${whereProveedor}
            ORDER BY mp.fecha DESC, mp.hora DESC
        `, params);
        
        const datos = noPagadas.map(row => ({
            ...row,
            total_costo: row.total_costo || row.total_calculado,
            es_cabecera: false
        }));
        
        // Pagos agrupados
        let wherePagos = '';
        let pagosParams = [];
        if (proveedor_id && proveedor_id > 0) {
            wherePagos = 'AND pp.proveedor_id = ?';
            pagosParams.push(proveedor_id);
        }
        
        const pagos = await query(`
            SELECT pp.*, p.nombre as proveedor_nombre 
            FROM pagos_proveedores pp
            LEFT JOIN proveedores p ON pp.proveedor_id = p.id
            WHERE 1=1 ${wherePagos}
            ORDER BY pp.fecha_pago DESC
        `, pagosParams);
        
        for (const pago of pagos) {
            const recepciones = await query(`
                SELECT mp.*, p.contacto, p.telefono,
                       (mp.cantidad_litros * mp.costo_por_litro) as total_calculado
                FROM materia_prima mp
                LEFT JOIN proveedores p ON mp.proveedor_id = p.id
                WHERE mp.proveedor_id = ? 
                  AND mp.fecha BETWEEN ? AND ?
                  AND mp.pagado = 1
                ORDER BY mp.fecha ASC, mp.hora ASC
            `, [pago.proveedor_id, pago.semana_inicio, pago.semana_fin]);
            
            if (recepciones.length > 0) {
                let totalLitros = 0, totalCosto = 0;
                const recepcionesProc = recepciones.map(r => {
                    const costo = r.total_costo || r.total_calculado;
                    totalLitros += r.cantidad_litros;
                    totalCosto += costo;
                    return { ...r, total_costo: costo };
                });
                
                datos.push({
                    es_cabecera: true,
                    pago_id: pago.id,
                    proveedor_id: pago.proveedor_id,
                    proveedor_nombre: pago.proveedor_nombre,
                    semana_inicio: pago.semana_inicio,
                    semana_fin: pago.semana_fin,
                    total_litros: totalLitros,
                    total_costo: pago.costo_total,
                    monto_pagado: pago.monto_pagado,
                    deducciones: pago.deducciones,
                    fecha_pago: pago.fecha_pago,
                    metodo_pago: pago.metodo_pago,
                    observaciones: pago.observaciones,
                    recepciones: recepcionesProc
                });
            }
        }
        
        datos.sort((a, b) => {
            if (a.es_cabecera !== b.es_cabecera) return a.es_cabecera ? 1 : -1;
            if (!a.es_cabecera && !b.es_cabecera) {
                return new Date(b.fecha) - new Date(a.fecha);
            }
            if (a.es_cabecera && b.es_cabecera) {
                return new Date(b.fecha_pago) - new Date(a.fecha_pago);
            }
            return 0;
        });
        
        sendJSON(res, { success: true, datos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerProveedores(res) {
    try {
        const proveedores = await query("SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre");
        sendJSON(res, { success: true, proveedores });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarMateriaPrima(data, res) {
    try {
        const { fecha, hora, proveedor_id, proveedor_nombre, tipo_leche, 
                cantidad_litros, costo_por_litro, guardar_en_cuentas,
                pago_con_producto, producto_entregado, cantidad_producto, observaciones } = data;
        
        const costo_total = cantidad_litros * (costo_por_litro || 0);
        
        const result = await query(`
            INSERT INTO materia_prima 
            (fecha, hora, proveedor_id, proveedor_nombre, tipo_leche,
             cantidad_litros, costo_por_litro, total_costo, guardar_en_cuentas, 
             pago_con_producto, producto_entregado, cantidad_producto, observaciones) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [fecha, hora || new Date().toTimeString().slice(0,8), proveedor_id, proveedor_nombre, 
            tipo_leche || 'normal', cantidad_litros, costo_por_litro || 0, costo_total, 
            guardar_en_cuentas || 0, pago_con_producto || 0, producto_entregado || null, 
            cantidad_producto || null, observaciones || null]);
        
        sendJSON(res, { success: true, message: 'Registro guardado', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarMateriaPrima(data, res) {
    try {
        await query("DELETE FROM materia_prima WHERE id = ?", [data.id]);
        sendJSON(res, { success: true, message: 'Registro eliminado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarProveedor(data, res) {
    try {
        const { nombre, contacto, telefono, email, direccion, dia_corte = 2 } = data;
        
        const result = await query(`
            INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, dia_corte) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [nombre, contacto || '', telefono || '', email || '', direccion || '', dia_corte]);
        
        sendJSON(res, { success: true, message: 'Proveedor agregado', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerAdelantos(req, res) {
    try {
        const { proveedor_id } = req.query;
        let where = '';
        let params = [];
        
        if (proveedor_id && proveedor_id > 0) {
            where = 'WHERE proveedor_id = ?';
            params.push(proveedor_id);
        }
        
        const adelantos = await query(`
            SELECT a.*, p.nombre as proveedor_nombre 
            FROM adelantos_proveedores a
            LEFT JOIN proveedores p ON a.proveedor_id = p.id
            ${where}
            ORDER BY a.fecha DESC
        `, params);
        
        sendJSON(res, { success: true, adelantos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarAdelanto(data, res) {
    try {
        const { proveedor_id, monto, fecha, descripcion, metodo_pago, referencia } = data;
        
        const result = await query(`
            INSERT INTO adelantos_proveedores 
            (proveedor_id, monto, fecha, descripcion, metodo_pago, referencia, estado) 
            VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
        `, [proveedor_id, monto, fecha, descripcion || '', metodo_pago || 'efectivo', referencia || '']);
        
        sendJSON(res, { success: true, message: 'Adelanto registrado', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarAdelanto(data, res) {
    try {
        const check = await query(
            "SELECT id FROM pagos_proveedores WHERE adelantos_deducidos LIKE ? LIMIT 1",
            [`%"${data.id}"%`]
        );
        
        if (check.length > 0) {
            sendJSON(res, { success: false, error: 'No se puede eliminar porque este adelanto ya fue aplicado en un pago' });
            return;
        }
        
        await query("DELETE FROM adelantos_proveedores WHERE id = ?", [data.id]);
        sendJSON(res, { success: true, message: 'Adelanto eliminado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function actualizarAdelanto(data, res) {
    try {
        const { id, monto, fecha, descripcion, metodo_pago, referencia } = data;
        
        await query(`
            UPDATE adelantos_proveedores SET 
            monto = ?, fecha = ?, descripcion = ?, metodo_pago = ?, referencia = ?
            WHERE id = ?
        `, [monto, fecha, descripcion || '', metodo_pago || 'efectivo', referencia || '', id]);
        
        sendJSON(res, { success: true, message: 'Adelanto actualizado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function actualizarProveedor(data, res) {
    try {
        const { id, nombre, contacto, telefono, email, direccion, dia_corte } = data;
        
        await query(`
            UPDATE proveedores SET 
            nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, dia_corte = ?
            WHERE id = ?
        `, [nombre, contacto || '', telefono || '', email || '', direccion || '', dia_corte || 2, id]);
        
        sendJSON(res, { success: true, message: 'Proveedor actualizado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerDeudaAdelantos(req, res) {
    try {
        const { proveedor_id } = req.query;
        if (!proveedor_id) {
            sendJSON(res, { success: false, error: 'ID de proveedor requerido' });
            return;
        }
        
        const deuda = await query(`
            SELECT COALESCE(SUM(monto), 0) as deuda 
            FROM adelantos_proveedores 
            WHERE proveedor_id = ? AND estado = 'pendiente'
        `, [proveedor_id]);
        
        sendJSON(res, { success: true, deuda: parseFloat(deuda[0].deuda) });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerProveedor(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            sendJSON(res, { success: false, error: 'ID de proveedor requerido' });
            return;
        }
        
        const proveedores = await query("SELECT * FROM proveedores WHERE id = ? AND activo = 1", [id]);
        
        if (proveedores.length > 0) {
            sendJSON(res, { success: true, proveedor: proveedores[0] });
        } else {
            sendJSON(res, { success: false, error: 'Proveedor no encontrado' });
        }
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerDetalleRecepcion(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            sendJSON(res, { success: false, error: 'ID de recepción requerido' });
            return;
        }
        
        const recepciones = await query(`
            SELECT mp.*, p.contacto, p.telefono, p.email, p.direccion, p.dia_corte
            FROM materia_prima mp
            LEFT JOIN proveedores p ON mp.proveedor_id = p.id
            WHERE mp.id = ?
        `, [id]);
        
        if (recepciones.length > 0) {
            sendJSON(res, { success: true, recepcion: recepciones[0] });
        } else {
            sendJSON(res, { success: false, error: 'Recepción no encontrada' });
        }
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerResumenSemanal(req, res) {
    try {
        const { proveedor_id, inicio, fin } = req.query;
        
        if (!proveedor_id || !inicio || !fin) {
            sendJSON(res, { success: false, error: 'Faltan parámetros' });
            return;
        }
        
        const resumen = await query(`
            SELECT 
                COALESCE(SUM(cantidad_litros), 0) as total_leche,
                COALESCE(SUM(total_costo), 0) as total_costo
            FROM materia_prima 
            WHERE proveedor_id = ? 
                AND fecha BETWEEN ? AND ?
                AND (pagado = 0 OR pagado IS NULL)
        `, [proveedor_id, inicio, fin]);
        
        sendJSON(res, {
            success: true,
            total_leche: parseFloat(resumen[0].total_leche),
            total_costo: parseFloat(resumen[0].total_costo)
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerRecepcionesPorPeriodo(req, res) {
    try {
        const { proveedor_id, inicio, fin } = req.query;
        
        if (!proveedor_id || !inicio || !fin) {
            sendJSON(res, { success: false, error: 'Faltan parámetros' });
            return;
        }
        
        const recepciones = await query(`
            SELECT * FROM materia_prima 
            WHERE proveedor_id = ? 
                AND fecha BETWEEN ? AND ?
                AND pagado = 1
            ORDER BY fecha ASC
        `, [proveedor_id, inicio, fin]);
        
        const recepcionesConCosto = recepciones.map(row => {
            if (!row.total_costo || row.total_costo === 0) {
                row.total_costo = row.cantidad_litros * row.costo_por_litro;
            }
            return row;
        });
        
        sendJSON(res, { success: true, recepciones: recepcionesConCosto });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
