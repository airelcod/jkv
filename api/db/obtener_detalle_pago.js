import { query, sendJSON } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    if (req.method !== 'GET') {
        sendJSON(res, { success: false, error: 'Método no permitido' });
        return;
    }
    
    try {
        const pago_id = parseInt(req.query.id || '0');
        
        if (!pago_id) {
            sendJSON(res, { success: false, error: 'ID de pago requerido' });
            return;
        }
        
        const pagos = await query(`
            SELECT n.*, t.nombre as trabajador_nombre, t.cedula, t.cargo, t.sucursal_id, t.dia_corte,
                   s.nombre as sucursal_nombre
            FROM nomina_pagos n
            JOIN trabajadores t ON n.trabajador_id = t.id
            LEFT JOIN sucursales s ON t.sucursal_id = s.id
            WHERE n.id = ?
        `, [pago_id]);
        
        if (pagos.length === 0) {
            sendJSON(res, { success: false, error: 'Pago no encontrado' });
            return;
        }
        
        const pago = pagos[0];
        
        // Calcular período
        const diasSemana = {
            1: 'Domingo', 2: 'Lunes', 3: 'Martes', 4: 'Miércoles',
            5: 'Jueves', 6: 'Viernes', 7: 'Sábado'
        };
        
        const diaCorte = pago.dia_corte || 2;
        const fechaPago = new Date(pago.fecha_pago);
        fechaPago.setHours(12, 0, 0, 0);
        
        let finPeriodo = new Date(fechaPago);
        let diaSemanaPago = finPeriodo.getDay();
        let diaSemanaMapeado = diaSemanaPago === 0 ? 7 : diaSemanaPago;
        
        while (diaSemanaMapeado !== diaCorte) {
            finPeriodo.setDate(finPeriodo.getDate() - 1);
            diaSemanaPago = finPeriodo.getDay();
            diaSemanaMapeado = diaSemanaPago === 0 ? 7 : diaSemanaPago;
        }
        
        const inicioPeriodo = new Date(finPeriodo);
        inicioPeriodo.setDate(finPeriodo.getDate() - 6);
        
        const periodo_inicio = inicioPeriodo.toISOString().split('T')[0];
        const periodo_fin = finPeriodo.toISOString().split('T')[0];
        
        // Obtener producción
        const produccion = await query(`
            SELECT p.fecha, p.tipo_producto, 
                   SUM(p.peso_kg) as peso_kg, 
                   SUM(p.piezas) as piezas,
                   pr.es_leche
            FROM produccion_diaria p
            JOIN productos pr ON p.tipo_producto = pr.nombre
            WHERE p.trabajador_id = ? 
              AND p.fecha BETWEEN ? AND ?
            GROUP BY p.fecha, p.tipo_producto
            ORDER BY p.fecha, p.tipo_producto
        `, [pago.trabajador_id, periodo_inicio, periodo_fin]);
        
        // Calcular totales por producto
        const totalesProductos = {};
        for (const p of produccion) {
            if (!totalesProductos[p.tipo_producto]) {
                totalesProductos[p.tipo_producto] = {
                    peso: 0,
                    piezas: 0,
                    es_leche: p.es_leche
                };
            }
            totalesProductos[p.tipo_producto].peso += parseFloat(p.peso_kg || 0);
            totalesProductos[p.tipo_producto].piezas += parseInt(p.piezas || 0);
        }
        
        // Obtener valores unitarios
        const valoresUnitarios = await query(`
            SELECT fecha, producto, cantidad, valor_unitario, subtotal 
            FROM pago_detalle_valores 
            WHERE pago_id = ?
            ORDER BY fecha, producto
        `, [pago_id]);
        
        sendJSON(res, {
            success: true,
            pago,
            periodo_inicio,
            periodo_fin,
            dia_corte_nombre: diasSemana[diaCorte],
            produccion,
            totales_productos: totalesProductos,
            valores_unitarios: valoresUnitarios
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
