import { query } from './config.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Método no permitido' });
        return;
    }
    
    try {
        const { tipo, nombre } = req.query;
        
        if (tipo !== 'sucursal') {
            res.status(400).json({ success: false, error: 'Tipo no soportado' });
            return;
        }
        
        const filename = `export_sucursal_${nombre}_${new Date().toISOString().split('T')[0]}.csv`;
        
        const registros = await query(
            "SELECT * FROM produccion_diaria WHERE sucursal = ? ORDER BY fecha",
            [nombre]
        );
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Crear CSV
        const columns = ['id', 'fecha', 'sucursal', 'tipo_producto', 'peso_kg', 'piezas', 'created_at'];
        let csv = columns.join(',') + '\n';
        
        for (const row of registros) {
            const values = columns.map(col => {
                let val = row[col];
                if (val === null || val === undefined) return '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            csv += values.join(',') + '\n';
        }
        
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
