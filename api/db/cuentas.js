import { query, sendJSON, parseBody } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (req.method === 'GET') {
        switch (action) {
            case 'obtener_deudas_cliente':
                await obtenerDeudasCliente(req, res);
                break;
            case 'obtener_cobrar_pendientes':
                await obtenerCobrarPendientes(res);
                break;
            case 'obtener_pagar':
                await obtenerPagar(res);
                break;
            case 'obtener_cobrar':
                await obtenerCobrar(res);
                break;
            case 'obtener_historial_pagos':
                await obtenerHistorialPagos(req, res);
                break;
            case 'obtener_detalle_cobrar':
                await obtenerDetalleCobrar(req, res);
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
            case 'guardar_pagar':
                await guardarPagar(data, res);
                break;
            case 'guardar_cobrar':
                await guardarCobrar(data, res);
                break;
            case 'cambiar_estado_pagar':
                await cambiarEstadoPagar(data, res);
                break;
            case 'cambiar_estado_cobrar':
                await cambiarEstadoCobrar(data, res);
                break;
            case 'eliminar_pagar':
                await eliminarPagar(data, res);
                break;
            case 'eliminar_cobrar':
                await eliminarCobrar(data, res);
                break;
            case 'registrar_pago_parcial':
                await registrarPagoParcial(data, res);
                break;
            case 'eliminar_pago_parcial':
                await eliminarPagoParcial(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerDeudasCliente(req, res) {
    try {
        const cliente_id = parseInt(req.query.cliente_id || '0');
        
        if (cliente_id <= 0) {
            sendJSON(res, { success: false, error: 'ID de cliente inválido' });
            return;
        }
        
        const deudas = await query(`
            SELECT cc.*, v.fecha as fecha_venta 
            FROM cuentas_cobrar cc
            JOIN ventas v ON cc.venta_id = v.id
            WHERE v.cliente_id = ? AND cc.estado = 'pendiente'
            ORDER BY cc.fecha_vencimiento ASC
        `, [cliente_id]);
        
        const deudasConPendiente = deudas.map(row => ({
            ...row,
            monto_pendiente: row.monto - (row.monto_cobrado || 0)
        }));
        
        sendJSON(res, { success: true, deudas: deudasConPendiente });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerCobrarPendientes(res) {
    try {
        const cuentas = await query(`
            SELECT cc.*, 
                   (cc.monto - COALESCE(cc.monto_cobrado, 0)) as monto_pendiente,
                   CASE 
                       WHEN v.id IS NOT NULL THEN c.nombre
                       ELSE cc.descripcion
                   END as cliente_nombre
            FROM cuentas_cobrar cc
            LEFT JOIN ventas v ON cc.venta_id = v.id
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE cc.estado = 'pendiente' 
               OR (cc.monto - COALESCE(cc.monto_cobrado, 0)) > 0.01
            ORDER BY cliente_nombre ASC
        `);
        
        const cuentasFiltradas = cuentas.filter(row => {
            const montoPendiente = row.monto - (row.monto_cobrado || 0);
            return montoPendiente > 0.01;
        }).map(row => ({
            ...row,
            monto_pendiente: row.monto - (row.monto_cobrado || 0)
        }));
        
        sendJSON(res, { success: true, datos: cuentasFiltradas });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerPagar(res) {
    try {
        const datos = await query(`
            SELECT cp.*, 
                     cp.monto as monto_original,
                     COALESCE(cp.monto_pagado, 0) as monto_pagado,
                     (cp.monto - COALESCE(cp.monto_pagado, 0)) as monto_pendiente,
                     CASE 
                         WHEN cp.descripcion LIKE '% litros%' THEN 'proveedor'
                         ELSE 'normal'
                     END as tipo_cuenta
              FROM cuentas_pagar cp 
              WHERE cp.oculto = 0 OR cp.oculto IS NULL
              ORDER BY cp.fecha_inicio DESC, cp.id DESC
        `);
        
        sendJSON(res, { success: true, datos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerCobrar(res) {
    try {
        const datos = await query(`
            SELECT *, (monto - COALESCE(monto_cobrado, 0)) as monto_pendiente,
                     COALESCE(monto_cobrado, 0) as monto_pagado
              FROM cuentas_cobrar 
              ORDER BY id DESC
        `);
        
        sendJSON(res, { success: true, datos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarPagar(data, res) {
    try {
        const { descripcion, monto, fecha_inicio, fecha_vencimiento } = data;
        
        await query(`
            INSERT INTO cuentas_pagar (descripcion, monto, monto_original, fecha_inicio, fecha_vencimiento, estado, oculto) 
            VALUES (?, ?, ?, ?, ?, 'pendiente', 0)
        `, [descripcion, monto, monto, fecha_inicio, fecha_vencimiento]);
        
        sendJSON(res, { success: true, message: 'Cuenta guardada' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarCobrar(data, res) {
    try {
        const { descripcion, monto, fecha_inicio, fecha_vencimiento } = data;
        
        await query(`
            INSERT INTO cuentas_cobrar (descripcion, monto, monto_original, fecha_inicio, fecha_vencimiento, estado) 
            VALUES (?, ?, ?, ?, ?, 'pendiente')
        `, [descripcion, monto, monto, fecha_inicio, fecha_vencimiento]);
        
        sendJSON(res, { success: true, message: 'Cuenta guardada' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function cambiarEstadoPagar(data, res) {
    try {
        await query("UPDATE cuentas_pagar SET estado = 'pagado', monto_pagado = monto WHERE id = ?", [data.id]);
        sendJSON(res, { success: true });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function cambiarEstadoCobrar(data, res) {
    try {
        await query("UPDATE cuentas_cobrar SET estado = 'cobrado', monto_cobrado = monto WHERE id = ?", [data.id]);
        sendJSON(res, { success: true });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarPagar(data, res) {
    try {
        await query("DELETE FROM cuentas_pagar WHERE id = ?", [data.id]);
        sendJSON(res, { success: true });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarCobrar(data, res) {
    try {
        await query("DELETE FROM cuentas_cobrar WHERE id = ?", [data.id]);
        sendJSON(res, { success: true });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function registrarPagoParcial(data, res) {
    try {
        const { id, tipo, monto_pago, metodo_pago, referencia, observaciones } = data;
        const fecha = new Date().toISOString().split('T')[0];
        
        const table = tipo === 'pagar' ? 'cuentas_pagar' : 'cuentas_cobrar';
        const montoPagadoCol = tipo === 'pagar' ? 'monto_pagado' : 'monto_cobrado';
        
        await transaction(async (conn) => {
            const [cuenta] = await conn.execute(
                `SELECT monto, COALESCE(${montoPagadoCol}, 0) as pagado, estado FROM ${table} WHERE id = ?`,
                [id]
            );
            
            const montoTotal = parseFloat(cuenta[0].monto);
            const montoActualPagado = parseFloat(cuenta[0].pagado);
            const nuevoPagado = montoActualPagado + monto_pago;
            const nuevoEstado = nuevoPagado >= montoTotal ? (tipo === 'pagar' ? 'pagado' : 'cobrado') : 'pendiente';
            
            await conn.execute(
                `UPDATE ${table} SET ${montoPagadoCol} = ?, estado = ? WHERE id = ?`,
                [nuevoPagado, nuevoEstado, id]
            );
            
            await conn.execute(
                `INSERT INTO pagos_cuentas (cuenta_id, tipo_cuenta, monto, fecha, metodo_pago, referencia, observaciones) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, tipo, monto_pago, fecha, metodo_pago, referencia || '', observaciones || '']
            );
        });
        
        sendJSON(res, { success: true, message: 'Pago registrado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarPagoParcial(data, res) {
    try {
        const { pago_id, cuenta_id, tipo } = data;
        const table = tipo === 'pagar' ? 'cuentas_pagar' : 'cuentas_cobrar';
        const montoPagadoCol = tipo === 'pagar' ? 'monto_pagado' : 'monto_cobrado';
        
        await transaction(async (conn) => {
            const [pago] = await conn.execute(
                "SELECT * FROM pagos_cuentas WHERE id = ? AND cuenta_id = ? AND tipo_cuenta = ?",
                [pago_id, cuenta_id, tipo]
            );
            
            if (pago.length === 0) throw new Error('Pago no encontrado');
            
            const montoARestar = parseFloat(pago[0].monto);
            
            const [cuenta] = await conn.execute(
                `SELECT monto, COALESCE(${montoPagadoCol}, 0) as pagado FROM ${table} WHERE id = ?`,
                [cuenta_id]
            );
            
            const montoTotal = parseFloat(cuenta[0].monto);
            let nuevoPagado = parseFloat(cuenta[0].pagado) - montoARestar;
            
            if (nuevoPagado <= 0) nuevoPagado = 0;
            const nuevoEstado = nuevoPagado >= montoTotal ? (tipo === 'pagar' ? 'pagado' : 'cobrado') : 'pendiente';
            
            await conn.execute(
                `UPDATE ${table} SET ${montoPagadoCol} = ?, estado = ? WHERE id = ?`,
                [nuevoPagado, nuevoEstado, cuenta_id]
            );
            
            await conn.execute("DELETE FROM pagos_cuentas WHERE id = ?", [pago_id]);
        });
        
        sendJSON(res, { success: true, message: 'Pago eliminado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerHistorialPagos(req, res) {
    try {
        const id = parseInt(req.query.id || '0');
        const tipo = req.query.tipo || '';
        
        const pagos = await query(
            "SELECT * FROM pagos_cuentas WHERE cuenta_id = ? AND tipo_cuenta = ? ORDER BY fecha DESC",
            [id, tipo]
        );
        
        sendJSON(res, { success: true, pagos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerDetalleCobrar(req, res) {
    try {
        const id = parseInt(req.query.id || '0');
        
        if (id <= 0) {
            sendJSON(res, { success: false, error: 'ID inválido' });
            return;
        }
        
        const cuentas = await query(`
            SELECT c.*, 
                     c.monto as monto_original,
                     COALESCE(c.monto_cobrado, 0) as monto_cobrado,
                     (c.monto - COALESCE(c.monto_cobrado, 0)) as monto_pendiente
              FROM cuentas_cobrar c 
              WHERE c.id = ?
        `, [id]);
        
        if (cuentas.length === 0) {
            sendJSON(res, { success: false, error: 'Cuenta no encontrada' });
            return;
        }
        
        const cuenta = cuentas[0];
        
        // Inicializar datos del cliente
        cuenta.cliente_nombre = '';
        cuenta.rif = '';
        cuenta.telefono = '';
        cuenta.direccion = '';
        cuenta.contacto = '';
        cuenta.email = '';
        
        if (cuenta.venta_id && cuenta.venta_id > 0) {
            const venta = await query(`
                SELECT c.nombre as cliente_nombre, c.rif, c.telefono, c.direccion, c.email, c.contacto 
                FROM ventas v
                JOIN clientes c ON v.cliente_id = c.id
                WHERE v.id = ?
            `, [cuenta.venta_id]);
            
            if (venta.length > 0) {
                cuenta.cliente_nombre = venta[0].cliente_nombre || '';
                cuenta.rif = venta[0].rif || '';
                cuenta.telefono = venta[0].telefono || '';
                cuenta.direccion = venta[0].direccion || '';
                cuenta.contacto = venta[0].contacto || '';
                cuenta.email = venta[0].email || '';
            }
        }
        
        if (!cuenta.cliente_nombre) {
            const match = cuenta.descripcion.match(/Cliente:\s*(.+?)(?:\s*\-|\s*$|$)/);
            cuenta.cliente_nombre = match ? match[1].trim() : 'Cliente no especificado';
        }
        
        sendJSON(res, { success: true, cuenta });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
