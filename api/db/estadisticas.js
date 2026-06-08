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
        const response = {
            success: true,
            cuentas: { pagar: 0, cobrar: 0 },
            egresos: { total: 0, por_categoria: [] },
            trabajadores: { total_deuda: 0, lista_deudas: [] },
            produccion: {
                dias: ['Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes'],
                diaria: [0, 0, 0, 0, 0, 0, 0],
                por_producto: []
            }
        };
        
        // Cuentas
        const cuentasPagar = await query("SELECT IFNULL(SUM(monto), 0) as total FROM cuentas_pagar WHERE estado = 'pendiente'");
        response.cuentas.pagar = parseFloat(cuentasPagar[0].total);
        
        const cuentasCobrar = await query("SELECT IFNULL(SUM(monto), 0) as total FROM cuentas_cobrar WHERE estado = 'pendiente'");
        response.cuentas.cobrar = parseFloat(cuentasCobrar[0].total);
        
        // Egresos
        const egresosTotal = await query("SELECT IFNULL(SUM(monto), 0) as total FROM egresos");
        response.egresos.total = parseFloat(egresosTotal[0].total);
        
        const egresosCat = await query("SELECT IFNULL(categoria, 'Sin categoría') as categoria, SUM(monto) as total FROM egresos GROUP BY categoria");
        response.egresos.por_categoria = egresosCat.map(row => ({
            categoria: row.categoria,
            total: parseFloat(row.total)
        }));
        
        // Trabajadores deudas
        const deudasTrabajadores = await query(`
            SELECT t.id, t.nombre, IFNULL(SUM(p.monto), 0) as deuda 
            FROM trabajadores t
            LEFT JOIN prestamos p ON t.id = p.trabajador_id AND p.estado = 'pendiente'
            WHERE t.activo = 1
            GROUP BY t.id
            HAVING deuda > 0
        `);
        
        let totalDeuda = 0;
        response.trabajadores.lista_deudas = deudasTrabajadores.map(row => {
            totalDeuda += parseFloat(row.deuda);
            return { nombre: row.nombre, deuda: parseFloat(row.deuda) };
        });
        response.trabajadores.total_deuda = totalDeuda;
        
        // Producción - semana actual con corte Miércoles
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        let diasARetroceder = (diaSemana + 4) % 7;
        let inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diasARetroceder);
        
        const fechaInicio = inicioSemana.toISOString().split('T')[0];
        const fechaFin = new Date(inicioSemana);
        fechaFin.setDate(inicioSemana.getDate() + 6);
        const fechaFinStr = fechaFin.toISOString().split('T')[0];
        
        const produccionDiaria = await query(`
            SELECT fecha, IFNULL(SUM(peso_kg), 0) as total 
            FROM produccion_diaria 
            WHERE fecha BETWEEN ? AND ? 
            GROUP BY fecha
        `, [fechaInicio, fechaFinStr]);
        
        produccionDiaria.forEach(row => {
            const fechaObj = new Date(row.fecha);
            let diaNum = fechaObj.getDay();
            let idx = (diaNum + 3) % 7;
            if (idx >= 0 && idx < 7) {
                response.produccion.diaria[idx] = parseFloat(row.total);
            }
        });
        
        const produccionProductos = await query(`
            SELECT tipo_producto, 
                   IFNULL(SUM(peso_kg), 0) as total_kg, 
                   IFNULL(SUM(piezas), 0) as total_piezas 
            FROM produccion_diaria 
            WHERE fecha BETWEEN ? AND ? 
            GROUP BY tipo_producto
        `, [fechaInicio, fechaFinStr]);
        
        for (const row of produccionProductos) {
            const productoInfo = await query("SELECT es_leche FROM productos WHERE nombre = ?", [row.tipo_producto]);
            const esLeche = productoInfo.length > 0 ? productoInfo[0].es_leche : 0;
            
            const productoNombre = row.tipo_producto.replace(/_/g, ' ');
            const totalKg = parseFloat(row.total_kg);
            const totalPiezas = parseInt(row.total_piezas);
            
            if (totalKg > 0) {
                response.produccion.por_producto.push({
                    nombre: productoNombre,
                    total: totalKg,
                    unidad: esLeche === 1 ? 'litros' : 'kg'
                });
            }
            if (totalPiezas > 0) {
                response.produccion.por_producto.push({
                    nombre: productoNombre + ' (piezas)',
                    total: totalPiezas,
                    unidad: 'pz'
                });
            }
        }
        
        sendJSON(res, response);
    } catch (error) {
        sendJSON(res, { success: false, error: error.message }, 500);
    }
}
