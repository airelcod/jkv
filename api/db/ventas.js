
import { query, sendJSON, parseBody, transaction } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (req.method === 'GET') {
        switch (action) {
            case 'obtener_por_cliente':
                await obtenerVentasPorCliente(req, res);
                break;
            case 'obtener':
                await obtenerVentas(res);
                break;
            case 'obtener_detalle':
                await obtenerDetalleVenta(req, res);
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
                await guardarVenta(data, res);
                break;
            case 'eliminar':
                await eliminarVenta(data, res);
                break;
            default:
                sendJSON(res, { success: false, error: 'Acción no válida: ' + postAction });
        }
        return;
    }
    
    sendJSON(res, { success: false, error: 'Método no soportado' });
}

async function obtenerVentasPorCliente(req, res) {
    try {
        const cliente_id = parseInt(req.query.cliente_id || '0');
        
        if (cliente_id <= 0) {
            sendJSON(res, { success: false, error: 'ID de cliente inválido' });
            return;
        }
        
        const ventas = await query(`
            SELECT v.*, s.nombre as sucursal_nombre,
                   (SELECT SUM(vd.cantidad * vd.precio_unitario) FROM ventas_detalle vd WHERE vd.venta_id = v.id) as total_calculado
            FROM ventas v 
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            WHERE v.cliente_id = ?
            ORDER BY v.fecha DESC, v.id DESC
        `, [cliente_id]);
        
        sendJSON(res, { success: true, ventas });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerVentas(res) {
    try {
        const ventasRaw = await query(`
            SELECT v.*, c.nombre as cliente_nombre, c.rif as cliente_rif, c.telefono as cliente_telefono, 
                   c.contacto as cliente_contacto, c.email as cliente_email, c.direccion as cliente_direccion,
                   s.id as sucursal_id, s.nombre as sucursal_nombre,
                   (SELECT SUM(vd.cantidad * vd.precio_unitario) FROM ventas_detalle vd WHERE vd.venta_id = v.id) as total_calculado
            FROM ventas v 
            JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            ORDER BY v.fecha DESC, v.id DESC
        `);
        
        const ventas = ventasRaw.map(row => ({
            id: row.id,
            cliente: row.cliente_nombre,
            rif: row.cliente_rif,
            telefono: row.cliente_telefono,
            contacto: row.cliente_contacto,
            email: row.cliente_email,
            direccion: row.cliente_direccion,
            fecha: row.fecha,
            metodo_pago: row.metodo_pago,
            tiene_descuento: row.tiene_descuento,
            descuento_porcentaje: row.descuento_porcentaje,
            descuento_monto: row.descuento_monto,
            es_credito: row.es_credito,
            subtotal: row.subtotal,
            total: row.total,
            observaciones: row.observaciones,
            created_at: row.created_at,
            sucursal_id: row.sucursal_id,
            sucursal_nombre: row.sucursal_nombre
        }));
        
        sendJSON(res, { success: true, ventas });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function obtenerDetalleVenta(req, res) {
    try {
        const id = parseInt(req.query.id || '0');
        
        if (id <= 0) {
            sendJSON(res, { success: false, error: 'ID inválido' });
            return;
        }
        
        const detallesRaw = await query(`
            SELECT v.*, c.nombre as cliente_nombre, c.rif as cliente_rif, c.telefono as cliente_telefono, 
                   c.contacto as cliente_contacto, c.email as cliente_email, c.direccion as cliente_direccion,
                   s.id as sucursal_id, s.nombre as sucursal_nombre,
                   vd.*, p.nombre as producto_nombre, p.es_leche 
            FROM ventas v 
            JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            JOIN ventas_detalle vd ON v.id = vd.venta_id 
            LEFT JOIN productos p ON vd.producto_id = p.id 
            WHERE v.id = ?
        `, [id]);
        
        if (detallesRaw.length === 0) {
            sendJSON(res, { success: false, error: 'Venta no encontrada' });
            return;
        }
        
        const ventaData = {
            venta_id: detallesRaw[0].id,
            cliente: detallesRaw[0].cliente_nombre,
            rif: detallesRaw[0].cliente_rif,
            telefono: detallesRaw[0].cliente_telefono,
            contacto: detallesRaw[0].cliente_contacto,
            email: detallesRaw[0].cliente_email,
            direccion: detallesRaw[0].cliente_direccion,
            fecha: detallesRaw[0].fecha,
            metodo_pago: detallesRaw[0].metodo_pago,
            tiene_descuento: detallesRaw[0].tiene_descuento,
            descuento_porcentaje: detallesRaw[0].descuento_porcentaje,
            descuento_monto: detallesRaw[0].descuento_monto,
            es_credito: detallesRaw[0].es_credito,
            subtotal: detallesRaw[0].subtotal,
            total: detallesRaw[0].total,
            observaciones: detallesRaw[0].observaciones,
            sucursal_id: detallesRaw[0].sucursal_id,
            sucursal_nombre: detallesRaw[0].sucursal_nombre
        };
        
        const detalles = detallesRaw.map(row => ({
            id: row.id,
            venta_id: row.venta_id,
            producto_id: row.producto_id,
            producto_nombre: row.producto_nombre,
            es_leche: row.es_leche,
            cantidad: row.cantidad,
            piezas: row.piezas,
            precio_unitario: row.precio_unitario
        }));
        
        sendJSON(res, { success: true, venta: ventaData, detalles });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarVenta(data, res) {
    try {
        const { cliente_id, sucursal_id, fecha, metodo_pago, tiene_descuento, 
                descuento_porcentaje, descuento_monto, es_credito, observaciones, 
                subtotal, total, productos } = data;
        
        if (!cliente_id || !productos || productos.length === 0) {
            sendJSON(res, { success: false, error: 'Datos incompletos' });
            return;
        }
        
        let venta_id;
        
        await transaction(async (conn) => {
            const sucursalValue = (sucursal_id && sucursal_id !== '') ? parseInt(sucursal_id) : null;
            
            const [result] = await conn.execute(`
                INSERT INTO ventas (cliente_id, sucursal_id, fecha, metodo_pago, tiene_descuento, 
                        descuento_porcentaje, descuento_monto, es_credito, subtotal, total, observaciones) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [cliente_id, sucursalValue, fecha, metodo_pago, tiene_descuento ? 1 : 0, 
                descuento_porcentaje || 0, descuento_monto || 0, es_credito ? 1 : 0, subtotal, total, observaciones || '']);
            
            venta_id = result.insertId;
            
            for (const producto of productos) {
                await conn.execute(`
                    INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, piezas, precio_unitario) 
                    VALUES (?, ?, ?, ?, ?)
                `, [venta_id, producto.id, producto.cantidad, producto.piezas || 0, producto.precio_unitario]);
            }
            
            // Si es crédito, agregar a cuentas por cobrar
            if (es_credito) {
                const clienteInfo = await conn.execute("SELECT nombre FROM clientes WHERE id = ?", [cliente_id]);
                const clienteNombre = clienteInfo[0].length > 0 ? clienteInfo[0][0].nombre : '';
                
                const fechaVencimiento = new Date(fecha);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);
                const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
                const descripcionCuenta = `Venta a crédito - Cliente: ${clienteNombre}`;
                
                await conn.execute(`
                    INSERT INTO cuentas_cobrar (descripcion, monto, fecha_inicio, fecha_vencimiento, estado, venta_id, monto_original, monto_cobrado) 
                    VALUES (?, ?, ?, ?, 'pendiente', ?, ?, 0)
                `, [descripcionCuenta, total, fecha, fechaVencimientoStr, venta_id, total]);
            }
        });
        
        // Obtener la venta completa para respuesta
        const ventaInfo = await query(`
            SELECT v.*, c.nombre as cliente_nombre, c.rif, c.telefono, c.contacto, c.email, c.direccion,
                   s.nombre as sucursal_nombre
            FROM ventas v 
            JOIN clientes c ON v.cliente_id = c.id 
            LEFT JOIN sucursales s ON v.sucursal_id = s.id
            WHERE v.id = ?
        `, [venta_id]);
        
        const venta = ventaInfo[0];
        venta.cliente = venta.cliente_nombre;
        delete venta.cliente_nombre;
        
        const detallesVenta = await query(`
            SELECT vd.*, COALESCE(p.nombre, 'Producto') as producto_nombre, COALESCE(p.es_leche, 0) as es_leche 
            FROM ventas_detalle vd 
            LEFT JOIN productos p ON vd.producto_id = p.id 
            WHERE vd.venta_id = ?
        `, [venta_id]);
        
        sendJSON(res, { 
            success: true, 
            venta_id, 
            venta, 
            detalles: detallesVenta 
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarVenta(data, res) {
    try {
        const id = data.id;
        
        if (!id || id <= 0) {
            sendJSON(res, { success: false, error: 'ID inválido' });
            return;
        }
        
        await transaction(async (conn) => {
            await conn.execute("DELETE FROM cuentas_cobrar WHERE venta_id = ?", [id]);
            await conn.execute("DELETE FROM ventas_detalle WHERE venta_id = ?", [id]);
            await conn.execute("DELETE FROM ventas WHERE id = ?", [id]);
        });
        
        sendJSON(res, { success: true });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
