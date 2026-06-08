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
                await obtenerTrabajadores(res);
                break;
            case 'obtener_uno':
                await obtenerTrabajador(req, res);
                break;
            case 'obtener_prestamos':
                await obtenerPrestamos(req, res);
                break;
            case 'obtener_deuda':
                await obtenerDeudaTrabajador(req, res);
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
                await guardarTrabajador(data, res);
                break;
            case 'actualizar':
                await actualizarTrabajador(data, res);
                break;
            case 'eliminar':
                await eliminarTrabajador(data, res);
                break;
            case 'guardar_prestamo':
                await guardarPrestamo(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerTrabajadores(res) {
    try {
        const trabajadores = await query(`
            SELECT id, nombre, cedula, cargo, telefono, sucursal_id, dia_corte, 
                   COALESCE(tipo_pago, 'produccion') as tipo_pago, 
                   COALESCE(sueldo_fijo, 0) as sueldo_fijo,
                   (SELECT COALESCE(SUM(monto), 0) FROM prestamos WHERE trabajador_id = trabajadores.id AND estado = 'pendiente') as deuda_pendiente 
            FROM trabajadores 
            WHERE activo = 1 
            ORDER BY nombre
        `);
        
        sendJSON(res, { success: true, trabajadores });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerTrabajador(req, res) {
    try {
        const id = parseInt(req.query.id || '0');
        
        if (!id) {
            sendJSON(res, { success: false, error: 'ID requerido' });
            return;
        }
        
        const trabajadores = await query(`
            SELECT t.*, s.nombre as sucursal_nombre 
            FROM trabajadores t
            LEFT JOIN sucursales s ON t.sucursal_id = s.id
            WHERE t.id = ? AND t.activo = 1
        `, [id]);
        
        if (trabajadores.length > 0) {
            const t = trabajadores[0];
            t.tipo_pago = t.tipo_pago || 'produccion';
            t.sueldo_fijo = parseFloat(t.sueldo_fijo || 0);
            sendJSON(res, { success: true, trabajador: t });
        } else {
            sendJSON(res, { success: false, error: 'Trabajador no encontrado' });
        }
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerPrestamos(req, res) {
    try {
        const trabajador_id = parseInt(req.query.trabajador_id || '0');
        
        if (!trabajador_id) {
            sendJSON(res, { success: false, error: 'ID de trabajador requerido' });
            return;
        }
        
        const prestamos = await query(`
            SELECT id, monto, fecha, descripcion, estado 
            FROM prestamos 
            WHERE trabajador_id = ? 
            ORDER BY fecha DESC
        `, [trabajador_id]);
        
        let deuda_total = 0;
        for (const p of prestamos) {
            if (p.estado === 'pendiente') {
                deuda_total += parseFloat(p.monto);
            }
        }
        
        sendJSON(res, { success: true, prestamos, deuda_total });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerDeudaTrabajador(req, res) {
    try {
        const trabajador_id = parseInt(req.query.trabajador_id || '0');
        
        if (!trabajador_id) {
            sendJSON(res, { success: false, error: 'ID de trabajador requerido' });
            return;
        }
        
        const deuda = await query(`
            SELECT COALESCE(SUM(monto), 0) as deuda 
            FROM prestamos 
            WHERE trabajador_id = ? AND estado = 'pendiente'
        `, [trabajador_id]);
        
        sendJSON(res, { success: true, deuda: parseFloat(deuda[0].deuda) });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarTrabajador(data, res) {
    try {
        const { nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo } = data;
        
        const sucursalValue = (sucursal_id && sucursal_id !== '') ? parseInt(sucursal_id) : null;
        
        const result = await query(`
            INSERT INTO trabajadores (nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [nombre, cedula, cargo || '', telefono || '', sucursalValue, dia_corte || 2, tipo_pago || 'produccion', sueldo_fijo || 0]);
        
        sendJSON(res, { success: true, message: 'Trabajador agregado', id: result.insertId });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function actualizarTrabajador(data, res) {
    try {
        const { id, nombre, cedula, cargo, telefono, sucursal_id, dia_corte, tipo_pago, sueldo_fijo } = data;
        
        const sucursalValue = (sucursal_id && sucursal_id !== '') ? parseInt(sucursal_id) : null;
        
        await query(`
            UPDATE trabajadores SET 
                nombre = ?, cedula = ?, cargo = ?, telefono = ?, 
                sucursal_id = ?, dia_corte = ?, tipo_pago = ?, sueldo_fijo = ?
            WHERE id = ?
        `, [nombre, cedula, cargo || '', telefono || '', sucursalValue, dia_corte || 2, tipo_pago || 'produccion', sueldo_fijo || 0, id]);
        
        sendJSON(res, { success: true, message: 'Trabajador actualizado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarTrabajador(data, res) {
    try {
        const { id } = data;
        
        await transaction(async (conn) => {
            // Eliminar pagos de nómina
            await conn.execute("DELETE FROM nomina_pagos WHERE trabajador_id = ?", [id]);
            // Eliminar préstamos
            await conn.execute("DELETE FROM prestamos WHERE trabajador_id = ?", [id]);
            // Desactivar trabajador
            await conn.execute("UPDATE trabajadores SET activo = 0 WHERE id = ?", [id]);
        });
        
        sendJSON(res, { success: true, message: 'Trabajador y sus registros asociados eliminados' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarPrestamo(data, res) {
    try {
        const { trabajador_id, monto, fecha, descripcion } = data;
        
        await query(`
            INSERT INTO prestamos (trabajador_id, monto, fecha, descripcion) 
            VALUES (?, ?, ?, ?)
        `, [trabajador_id, monto, fecha, descripcion || '']);
        
        sendJSON(res, { success: true, message: 'Préstamo registrado' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
