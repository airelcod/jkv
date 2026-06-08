import { query, sendJSON, parseBody } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        sendJSON(res, {});
        return;
    }
    
    const { action } = req.query;
    
    if (action === 'obtener_tabla') {
        await obtenerTabla(req, res);
        return;
    }
    
    if (action === 'obtener_produccion_producto') {
        await obtenerProduccionProducto(req, res);
        return;
    }
    
    if (action === 'eliminar_registro') {
        if (req.method !== 'POST') {
            sendJSON(res, { success: false, error: 'Método no permitido' });
            return;
        }
        await eliminarRegistro(req, res);
        return;
    }
    
    if (action === 'guardar') {
        if (req.method !== 'POST') {
            sendJSON(res, { success: false, error: 'Método no permitido' });
            return;
        }
        await guardarProduccion(req, res);
        return;
    }
    
    sendJSON(res, { success: false, error: 'Acción no válida: ' + action });
}

function obtenerSemanaActual() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    let inicio = new Date(hoy);
    
    if (diaSemana === 3) {
        inicio = hoy;
    } else if (diaSemana === 4) {
        inicio.setDate(hoy.getDate() - 1);
    } else if (diaSemana === 5) {
        inicio.setDate(hoy.getDate() - 2);
    } else if (diaSemana === 6) {
        inicio.setDate(hoy.getDate() - 3);
    } else if (diaSemana === 0) {
        inicio.setDate(hoy.getDate() - 4);
    } else if (diaSemana === 1) {
        inicio.setDate(hoy.getDate() - 5);
    } else if (diaSemana === 2) {
        inicio.setDate(hoy.getDate() - 6);
    }
    return inicio;
}

async function obtenerTabla(req, res) {
    try {
        const trabajador_id = parseInt(req.query.trabajador_id || '0');
        const sucursal_id = parseInt(req.query.sucursal_id || '0');
        
        const inicioSemana = obtenerSemanaActual();
        const fechaInicio = inicioSemana.toISOString().split('T')[0];
        const fechaFin = new Date(inicioSemana);
        fechaFin.setDate(inicioSemana.getDate() + 6);
        const fechaFinStr = fechaFin.toISOString().split('T')[0];
        
        // Obtener productos activos
        const productos = await query(`
            SELECT nombre, es_leche, id FROM productos WHERE activo = 1 
            ORDER BY CASE WHEN es_leche = 1 THEN 0 ELSE 1 END, nombre
        `);
        
        const productosData = {};
        const listaProductos = [];
        for (const p of productos) {
            listaProductos.push(p.nombre);
            productosData[p.nombre] = {
                nombre: p.nombre,
                es_leche: p.es_leche,
                id: p.id
            };
        }
        
        // Construir consulta según filtros
        let querySQL, params;
        if (trabajador_id > 0) {
            querySQL = `
                SELECT fecha, tipo_producto, peso_kg, piezas 
                FROM produccion_diaria 
                WHERE fecha BETWEEN ? AND ? 
                  AND trabajador_id = ?
                ORDER BY fecha, tipo_producto
            `;
            params = [fechaInicio, fechaFinStr, trabajador_id];
        } else if (sucursal_id > 0) {
            querySQL = `
                SELECT p.fecha, p.tipo_producto, SUM(p.peso_kg) as peso_kg, SUM(p.piezas) as piezas 
                FROM produccion_diaria p
                JOIN trabajadores t ON p.trabajador_id = t.id
                WHERE p.fecha BETWEEN ? AND ? 
                  AND t.sucursal_id = ?
                GROUP BY p.fecha, p.tipo_producto
                ORDER BY p.fecha, p.tipo_producto
            `;
            params = [fechaInicio, fechaFinStr, sucursal_id];
        } else {
            querySQL = `
                SELECT fecha, tipo_producto, SUM(peso_kg) as peso_kg, SUM(piezas) as piezas 
                FROM produccion_diaria 
                WHERE fecha BETWEEN ? AND ?
                GROUP BY fecha, tipo_producto
                ORDER BY fecha, tipo_producto
            `;
            params = [fechaInicio, fechaFinStr];
        }
        
        const datosRaw = await query(querySQL, params);
        
        const datos = {};
        for (const row of datosRaw) {
            if (!datos[row.fecha]) datos[row.fecha] = {};
            datos[row.fecha][row.tipo_producto] = {
                peso: row.peso_kg,
                piezas: row.piezas
            };
        }
        
        const nombresDias = ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'];
        const fechas = [];
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(inicioSemana);
            fecha.setDate(inicioSemana.getDate() + i);
            fechas.push(fecha);
        }
        
        const hoyStr = new Date().toISOString().split('T')[0];
        
        // Generar HTML
        let html = '<div style="overflow-x: auto; width: 100%; margin-top:12px">';
        html += '<table style="width: 100%; border-collapse: collapse; border: 1px solid rgba(0,0,0,0.4); background: white;">';
        html += '<thead><tr style="background: #278233; color: white;">';
        html += '<th style="padding: 8px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.4);">Fecha</th>';
        
        for (const producto of listaProductos) {
            const nombreFormateado = producto.replace(/_/g, ' ');
            const idProducto = productosData[producto].id;
            html += `<th style='position: relative; padding: 12px 8px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.4);'>
                <span style='cursor: pointer; text-decoration: underline; text-decoration-style: dotted;' onclick="verProduccionProducto('${producto}')">${nombreFormateado}</span>
                <span class='delete-producto-th' data-producto='${producto}' data-id='${idProducto}' style='cursor: pointer; margin-left: 8px; font-size: 14px;' onclick="event.stopPropagation(); eliminarProductoTH('${producto}', ${idProducto})">×</span>
            </th>`;
        }
        html += '</tr></thead><tbody>';
        
        for (let i = 0; i < fechas.length; i++) {
            const fecha = fechas[i];
            const fechaStr = fecha.toISOString().split('T')[0];
            const fechaMostrar = `${fecha.getDate().toString().padStart(2,'0')}/${(fecha.getMonth()+1).toString().padStart(2,'0')}/${fecha.getFullYear()}`;
            const nombreDia = nombresDias[i];
            const esHoy = fechaStr === hoyStr;
            const bgColor = esHoy ? 'background-color: #fff3cd;' : '';
            
            html += `<tr style='${bgColor} border-bottom: 1px solid rgba(0,0,0,0.05);'>`;
            html += `<td style='padding: 10px 8px; vertical-align: top;'><strong>${fechaMostrar}</strong><br><small>${nombreDia}</small></td>`;
            
            for (const producto of listaProductos) {
                const prod = datos[fechaStr]?.[producto];
                const esLeche = productosData[producto].es_leche;
                
                html += "<td style='padding: 8px; text-align:center; white-space: nowrap;'>";
                
                if (prod && ((prod.peso && prod.peso > 0) || (prod.piezas && prod.piezas > 0))) {
                    if (esLeche) {
                        html += `<div style='display: inline-block; padding: 3px; border-radius: 3px; cursor: pointer; justify-content:center' class='producto-leche' data-fecha='${fechaStr}' data-producto='${producto}' data-sucursal-id='${sucursal_id}' data-tipo='leche' onclick='eliminarRegistroProduccion(this)'>🥛 ${parseFloat(prod.peso).toFixed(2)} L</div>`;
                    } else {
                        html += '<div style="display: flex; gap: 6px; align-items: center; flex-wrap: nowrap;justify-content:center;">';
                        if (prod.peso && prod.peso > 0) {
                            html += `<div style='display: inline-block; padding: 3px; border-right: 1px solid rgba(0,0,0,0); cursor: pointer;' class='producto-peso' data-fecha='${fechaStr}' data-producto='${producto}' data-sucursal-id='${sucursal_id}' data-tipo='peso' onclick='eliminarRegistroProduccion(this)'>⚖️ ${parseFloat(prod.peso).toFixed(2)} kg</div>`;
                        }
                        if (prod.piezas && prod.piezas > 0) {
                            html += `<div style='display: inline-block; padding: 3px; border-left: 1px solid rgba(0,0,0,0); cursor: pointer;' class='producto-piezas' data-fecha='${fechaStr}' data-producto='${producto}' data-sucursal-id='${sucursal_id}' data-tipo='piezas' onclick='eliminarRegistroProduccion(this)'>📦 ${prod.piezas} pz</div>`;
                        }
                        html += '</div>';
                    }
                } else {
                    html += '<span style="color:#ccc;">-</span>';
                }
                html += '</td>';
            }
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
        
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        res.status(500).send(`<div style="color:red">Error: ${error.message}</div>`);
    }
}

async function obtenerProduccionProducto(req, res) {
    try {
        const { producto, fecha_inicio, fecha_fin, sucursal_id } = req.query;
        
        if (!producto) {
            sendJSON(res, { success: false, error: 'Producto no especificado' });
            return;
        }
        
        let fechaInicio = fecha_inicio;
        let fechaFin = fecha_fin;
        
        if (!fechaInicio && !fechaFin) {
            fechaFin = new Date().toISOString().split('T')[0];
            const fechaObj = new Date();
            fechaObj.setDate(fechaObj.getDate() - 30);
            fechaInicio = fechaObj.toISOString().split('T')[0];
        }
        
        let querySQL = `
            SELECT p.fecha, 
                   COALESCE(SUM(p.peso_kg), 0) as total_peso,
                   COALESCE(SUM(p.piezas), 0) as total_piezas,
                   t.nombre as trabajador_nombre,
                   t.id as trabajador_id,
                   s.nombre as sucursal_nombre
            FROM produccion_diaria p
            JOIN trabajadores t ON p.trabajador_id = t.id
            LEFT JOIN sucursales s ON t.sucursal_id = s.id
            WHERE p.tipo_producto = ?
              AND p.fecha BETWEEN ? AND ?
        `;
        let params = [producto, fechaInicio, fechaFin];
        
        if (sucursal_id && sucursal_id > 0) {
            querySQL += " AND t.sucursal_id = ?";
            params.push(sucursal_id);
        }
        
        querySQL += " GROUP BY p.fecha, t.id ORDER BY p.fecha DESC, t.nombre ASC";
        
        const datosRaw = await query(querySQL, params);
        
        const trabajadores = [];
        const fechas = [];
        const datos = {};
        
        for (const row of datosRaw) {
            const fecha = row.fecha;
            const trabajador = row.trabajador_nombre;
            
            if (!fechas.includes(fecha)) fechas.push(fecha);
            if (!trabajadores.includes(trabajador)) trabajadores.push(trabajador);
            
            if (!datos[fecha]) datos[fecha] = {};
            datos[fecha][trabajador] = {
                peso: parseFloat(row.total_peso),
                piezas: parseInt(row.total_piezas),
                sucursal: row.sucursal_nombre
            };
        }
        
        // Obtener información del producto
        const prodInfo = await query("SELECT nombre, es_leche FROM productos WHERE nombre = ?", [producto]);
        const esLeche = prodInfo.length > 0 ? prodInfo[0].es_leche === 1 : false;
        
        sendJSON(res, {
            success: true,
            producto,
            es_leche: esLeche,
            fechas,
            trabajadores,
            datos,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
        });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function eliminarRegistro(req, res) {
    try {
        const data = await parseBody(req);
        const { fecha, producto, tipo, sucursal_id } = data;
        
        if (!fecha || !producto) {
            sendJSON(res, { success: false, error: 'Datos incompletos' });
            return;
        }
        
        let querySQL;
        
        if (tipo === 'leche') {
            querySQL = "DELETE FROM produccion_diaria WHERE fecha = ? AND tipo_producto = ?";
            if (sucursal_id && sucursal_id > 0) {
                querySQL += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)";
                await query(querySQL, [fecha, producto, sucursal_id]);
            } else {
                await query(querySQL, [fecha, producto]);
            }
        } else if (tipo === 'peso') {
            querySQL = "UPDATE produccion_diaria SET peso_kg = NULL WHERE fecha = ? AND tipo_producto = ?";
            if (sucursal_id && sucursal_id > 0) {
                querySQL += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)";
                await query(querySQL, [fecha, producto, sucursal_id]);
            } else {
                await query(querySQL, [fecha, producto]);
            }
        } else if (tipo === 'piezas') {
            querySQL = "UPDATE produccion_diaria SET piezas = NULL WHERE fecha = ? AND tipo_producto = ?";
            if (sucursal_id && sucursal_id > 0) {
                querySQL += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)";
                await query(querySQL, [fecha, producto, sucursal_id]);
            } else {
                await query(querySQL, [fecha, producto]);
            }
        } else {
            sendJSON(res, { success: false, error: 'Tipo de eliminación no válido' });
            return;
        }
        
        // Limpiar registros vacíos
        if (tipo === 'peso' || tipo === 'piezas') {
            let deleteSQL = "DELETE FROM produccion_diaria WHERE fecha = ? AND tipo_producto = ? AND (peso_kg IS NULL OR peso_kg = 0) AND (piezas IS NULL OR piezas = 0)";
            if (sucursal_id && sucursal_id > 0) {
                deleteSQL += " AND trabajador_id IN (SELECT id FROM trabajadores WHERE sucursal_id = ?)";
                await query(deleteSQL, [fecha, producto, sucursal_id]);
            } else {
                await query(deleteSQL, [fecha, producto]);
            }
        }
        
        sendJSON(res, { success: true, message: 'Registro eliminado correctamente' });
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}

async function guardarProduccion(req, res) {
    try {
        const data = await parseBody(req);
        const { fecha, trabajador_id, tipo_producto, peso_kg, piezas } = data;
        
        if (!fecha || !tipo_producto) {
            sendJSON(res, { success: false, error: 'La fecha y el producto son requeridos' });
            return;
        }
        
        if (new Date(fecha) > new Date()) {
            sendJSON(res, { success: false, error: 'No se pueden agregar fechas futuras' });
            return;
        }
        
        // Verificar si es leche
        const prodInfo = await query("SELECT es_leche FROM productos WHERE nombre = ?", [tipo_producto]);
        const esLeche = prodInfo.length > 0 ? prodInfo[0].es_leche === 1 : false;
        
        if (esLeche && (!peso_kg || peso_kg <= 0)) {
            sendJSON(res, { success: false, error: 'Debe ingresar la cantidad de litros de leche' });
            return;
        }
        if (!esLeche && (!peso_kg || peso_kg <= 0) && (!piezas || piezas <= 0)) {
            sendJSON(res, { success: false, error: 'Debe ingresar peso o cantidad de piezas' });
            return;
        }
        
        // Verificar si existe
        const existe = await query(`
            SELECT id FROM produccion_diaria WHERE fecha = ? AND trabajador_id = ? AND tipo_producto = ?
        `, [fecha, trabajador_id || 0, tipo_producto]);
        
        const pesoValue = peso_kg && peso_kg > 0 ? parseFloat(peso_kg) : null;
        const piezasValue = piezas && piezas > 0 ? parseInt(piezas) : null;
        
        if (existe.length > 0) {
            await query(`
                UPDATE produccion_diaria SET peso_kg = ?, piezas = ? 
                WHERE fecha = ? AND trabajador_id = ? AND tipo_producto = ?
            `, [pesoValue, piezasValue, fecha, trabajador_id || 0, tipo_producto]);
            sendJSON(res, { success: true, message: 'Registro actualizado correctamente' });
        } else {
            await query(`
                INSERT INTO produccion_diaria (fecha, trabajador_id, tipo_producto, peso_kg, piezas) 
                VALUES (?, ?, ?, ?, ?)
            `, [fecha, trabajador_id || 0, tipo_producto, pesoValue, piezasValue]);
            sendJSON(res, { success: true, message: 'Registro guardado correctamente' });
        }
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
