import { query, sendJSON, parseBody, transaction } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (req.method === 'GET') {
        switch (action) {
            case 'obtener_semanas_detalle':
                await obtenerSemanasDetalle(res);
                break;
            case 'obtener_pagos_por_dia':
                await obtenerPagosPorDia(req, res);
                break;
            case 'obtener_dias_con_pagos':
                await obtenerDiasConPagos(res);
                break;
            case 'obtener_historial_completo':
                await obtenerHistorialCompleto(res);
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
            case 'guardar_pago':
                await guardarPago(data, res);
                break;
            case 'eliminar_pago':
                await eliminarPago(data, res);
                break;
            case 'registrar_pago_valorado':
                await registrarPagoValorado(data, res);
                break;
            case 'registrar_pago_fijo':
                await registrarPagoFijo(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerSemanasDetalle(res) {
    try {
        const semanas = await query(`
            SELECT DISTINCT semana_inicio, semana_fin 
            FROM nomina_pagos 
            ORDER BY semana_inicio DESC
        `);
        
        for (const semana of semanas) {
            const pagos = await query(`
                SELECT n.*, t.nombre as trabajador_nombre 
                FROM nomina_pagos n
                JOIN trabajadores t ON n.trabajador_id = t.id
                WHERE n.semana_inicio = ?
                ORDER BY t.nombre
            `, [semana.semana_inicio]);
            semana.pagos = pagos;
        }
        
        sendJSON(res, { success: true, semanas });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerPagosPorDia(req, res) {
    try {
        const { fecha } = req.query;
        
        const pagos = await query(`
            SELECT n.*, t.nombre as trabajador_nombre, t.cargo 
            FROM nomina_pagos n
            JOIN trabajadores t ON n.trabajador_id = t.id
            WHERE DATE(n.fecha_pago) = ?
            ORDER BY t.nombre
        `, [fecha]);
        
        sendJSON(res, { success: true, pagos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerDiasConPagos(res) {
    try {
        const dias = await query(`
            SELECT DATE(fecha_pago) as fecha_pago, 
                   DAYOFWEEK(fecha_pago) as dia_semana,
                   CASE DAYOFWEEK(fecha_pago)
                       WHEN 1 THEN 'Domingo'
                       WHEN 2 THEN 'Lunes'
                       WHEN 3 THEN 'Martes'
                       WHEN 4 THEN 'Miércoles'
                       WHEN 5 THEN 'Jueves'
                       WHEN 6 THEN 'Viernes'
                       WHEN 7 THEN 'Sábado'
                   END as nombre_dia
            FROM nomina_pagos 
            GROUP BY DATE(fecha_pago)
            ORDER BY fecha_pago DESC
        `);
        
        for (const dia of dias) {
            const pagos = await query(`
                SELECT n.*, t.nombre as trabajador_nombre, t.cargo 
                FROM nomina_pagos n
                JOIN trabajadores t ON n.trabajador_id = t.id
                WHERE DATE(n.fecha_pago) = ?
                ORDER BY t.nombre
            `, [dia.fecha_pago]);
            dia.pagos = pagos;
        }
        
        sendJSON(res, { success: true, dias });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerHistorialCompleto(res) {
    try {
        const pagos = await query(`
            SELECT n.*, t.nombre as trabajador_nombre, t.cargo
            FROM nomina_pagos n
            JOIN trabajadores t ON n.trabajador_id = t.id
            ORDER BY n.fecha_pago DESC, t.nombre
        `);
        
        sendJSON(res, { success: true, pagos });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function registrarPagoFijo(data, res) {
    try {
        const { trabajador_id, sueldo_fijo, deducciones, total_pagado, periodo_inicio, periodo_fin, observaciones } = data;
        const fecha_pago = new Date().toISOString().split('T')[0];
        
        await transaction(async (conn) => {
            await conn.execute(`
                INSERT INTO nomina_pagos 
                (trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, total_pagado, fecha_pago, metodo_pago, observaciones) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'efectivo', ?)
            `, [trabajador_id, periodo_inicio, periodo_fin, sueldo_fijo, deducciones, total_pagado, fecha_pago, observaciones]);
            
            // Marcar préstamos como pagados
            if (deducciones > 0) {
                let restante = deducciones;
                const prestamos = await conn.execute(`
                    SELECT id, monto FROM prestamos 
                    WHERE trabajador_id = ? AND estado = 'pendiente' 
                    ORDER BY fecha ASC
                `, [trabajador_id]);
                
                for (const prestamo of prestamos[0]) {
                    if (restante <= 0) break;
                    if (restante >= prestamo.monto) {
                        await conn.execute("UPDATE prestamos SET estado = 'pagado' WHERE id = ?", [prestamo.id]);
                        restante -= prestamo.monto;
                    }
                }
            }
        });
        
        sendJSON(res, { success: true, message: 'Pago registrado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function registrarPagoValorado(data, res) {
    try {
        const { trabajador_id, subtotal, total_usd, total_bs, tasa_cambio, periodo_inicio, periodo_fin, valores, observaciones } = data;
        const fecha_pago = new Date().toISOString().split('T')[0];
        
        // Obtener préstamos pendientes
        const prestamos = await query(`
            SELECT id, monto FROM prestamos 
            WHERE trabajador_id = ? AND estado = 'pendiente' 
            ORDER BY fecha ASC
        `, [trabajador_id]);
        
        let total_deuda = prestamos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const deducciones = Math.min(total_deuda, subtotal);
        const total_pagado = subtotal - deducciones;
        
        await transaction(async (conn) => {
            const observacionesFinal = `Pago valorado | Tasa: ${tasa_cambio} Bs/USD${observaciones ? ` | Observaciones: ${observaciones}` : ''}`;
            
            const [result] = await conn.execute(`
                INSERT INTO nomina_pagos (
                    trabajador_id, semana_inicio, semana_fin, salario_semanal, 
                    deducciones, prestamos_pagados, total_pagado, fecha_pago, 
                    metodo_pago, observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'efectivo', ?)
            `, [trabajador_id, periodo_inicio, periodo_fin, subtotal, deducciones, deducciones, total_pagado, fecha_pago, observacionesFinal]);
            
            const pago_id = result.insertId;
            
            // Crear tabla de detalle si no existe
            await conn.execute(`
                CREATE TABLE IF NOT EXISTS pago_detalle_valores (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pago_id INT NOT NULL,
                    fecha DATE NOT NULL,
                    producto VARCHAR(50) NOT NULL,
                    cantidad DECIMAL(10,2) NOT NULL,
                    valor_unitario DECIMAL(10,2) NOT NULL,
                    subtotal DECIMAL(10,2) NOT NULL
                )
            `);
            
            // Guardar detalle de valores
            for (const item of valores) {
                const subtotal_item = item.cantidad * item.valor;
                await conn.execute(`
                    INSERT INTO pago_detalle_valores (pago_id, fecha, producto, cantidad, valor_unitario, subtotal) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [pago_id, item.fecha, item.producto, item.cantidad, item.valor, subtotal_item]);
            }
            
            // Marcar préstamos como pagados
            let restante = deducciones;
            const prestamos2 = await conn.execute(`
                SELECT id, monto FROM prestamos 
                WHERE trabajador_id = ? AND estado = 'pendiente' 
                ORDER BY fecha ASC
            `, [trabajador_id]);
            
            for (const prestamo of prestamos2[0]) {
                if (restante <= 0) break;
                if (restante >= prestamo.monto) {
                    await conn.execute("UPDATE prestamos SET estado = 'pagado' WHERE id = ?", [prestamo.id]);
                    restante -= prestamo.monto;
                } else {
                    const nuevo_monto = prestamo.monto - restante;
                    await conn.execute("UPDATE prestamos SET monto = ? WHERE id = ?", [nuevo_monto, prestamo.id]);
                    restante = 0;
                }
            }
        });
        
        sendJSON(res, { success: true, message: 'Pago registrado exitosamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarPago(data, res) {
    try {
        const { trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, total_pagado, fecha_pago, metodo_pago, observaciones } = data;
        
        // Verificar si ya existe pago
        const check = await query(`
            SELECT id FROM nomina_pagos 
            WHERE trabajador_id = ? AND semana_inicio = ?
        `, [trabajador_id, semana_inicio]);
        
        if (check.length > 0) {
            sendJSON(res, { success: false, error: 'Esta semana ya tiene registro de pago para este trabajador' });
            return;
        }
        
        await transaction(async (conn) => {
            await conn.execute(`
                INSERT INTO nomina_pagos (
                    trabajador_id, semana_inicio, semana_fin, salario_semanal, 
                    deducciones, prestamos_pagados, total_pagado, fecha_pago, 
                    metodo_pago, observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, deducciones, total_pagado, fecha_pago, metodo_pago, observaciones]);
            
            // Marcar préstamos como pagados
            if (deducciones > 0) {
                let restante = deducciones;
                const prestamos = await conn.execute(`
                    SELECT id, monto FROM prestamos 
                    WHERE trabajador_id = ? AND estado = 'pendiente'
                    ORDER BY fecha ASC
                `, [trabajador_id]);
                
                for (const prestamo of prestamos[0]) {
                    if (restante <= 0) break;
                    if (restante >= prestamo.monto) {
                        await conn.execute("UPDATE prestamos SET estado = 'pagado' WHERE id = ?", [prestamo.id]);
                        restante -= prestamo.monto;
                    } else {
                        const nuevo_monto = prestamo.monto - restante;
                        await conn.execute("UPDATE prestamos SET monto = ? WHERE id = ?", [nuevo_monto, prestamo.id]);
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

async function eliminarPago(id) {
    if (!confirm('¿Estás seguro de eliminar este pago? Esta acción también restaurará los préstamos pagados en esta transacción.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/db/nomina.js', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                action: 'eliminar_pago',  // 🔑 IMPORTANTE: Agregar el action
                id: id 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Pago eliminado correctamente');
            // Recargar todo
            if (typeof cargarTrabajadores === 'function') cargarTrabajadores();
            if (typeof cargarDiasConPagos === 'function') cargarDiasConPagos();
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al eliminar el pago');
    }
}
