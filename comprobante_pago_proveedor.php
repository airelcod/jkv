<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Pago a Proveedor - Agroindustria Láctea J.K.V. C.A.</title>
    <style>
        @font-face { font-family: 'mainFont'; src: url('source/font.ttf'); }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'mainFont', 'Segoe UI', Arial, sans-serif; background: #e0e0e0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .comprobante-container { max-width: 1100px; width: 100%; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; }
        .header { background: #278233; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .empresa-info h1 { color: white; font-size: 18px; margin-bottom: 5px; }
        .empresa-info p { color: rgba(255,255,255,0.8); font-size: 11px; }
        .comprobante-info { text-align: right; color: white; }
        .comprobante-info .numero { font-size: 20px; font-weight: bold; }
        .proveedor-section { background: #f5f5f5; padding: 15px 20px; border-bottom: 1px solid #ddd; }
        .proveedor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; }
        .proveedor-item { display: flex; font-size: 13px; }
        .proveedor-item .label { font-weight: bold; width: 100px; color: #555; }
        .recepcion-section { padding: 20px; }
        .recepcion-section h3 { color: #278233; margin-bottom: 15px; font-size: 16px; border-left: 4px solid #278233; padding-left: 12px; }
        .tabla-recepcion { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tabla-recepcion th { background: #278233; color: white; padding: 10px; text-align: center; }
        .tabla-recepcion td { padding: 8px 10px; text-align: center; border-bottom: 1px solid #eee; }
        .tabla-recepcion tr:hover { background: rgba(0,0,0,0.05); }
        .totales-section { padding: 20px; background: #fafafa; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
        .totales { width: 350px; }
        .total-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .total-line.total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #278233; margin-top: 8px; padding-top: 12px; color: #278233; }
        .acciones { display: flex; justify-content: flex-end; gap: 15px; padding: 15px 20px; background: #f0f0f0; }
        .btn { padding: 8px 20px; border: none; border-radius: 5px; cursor: pointer; font-family: 'mainFont', sans-serif; font-size: 13px; transition: all 0.3s; }
        .btn-cerrar { background: #666; color: white; }
        .btn-cerrar:hover { background: #555; }
        .observaciones { background: #fff8e1; padding: 12px 20px; margin: 0 20px 20px; border-radius: 5px; font-size: 12px; color: #856404; }
        @media print { body { background: white; padding: 0; } .acciones { display: none; } }
        .badge-normal { background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .badge-especial { background: #ff9800; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .badge-organica { background: #8BC34A; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    </style>
</head>
<body>
    <div class="comprobante-container">
        <div class="header">
            <div class="empresa-info">
                <h1>AGROINDUSTRIA LÁCTEA J.K.V. C.A.</h1>
                <p>RIF: J-41022340-5 | Telf: (0412) 302-7063</p>
                <p>Carretera Lara-Zulia (Km 82) | Palmarito - Cerro Verde</p>
            </div>
            <div class="comprobante-info">
                <div class="numero">COMPROBANTE DE PAGO A PROVEEDOR</div>
                <div class="fecha" id="fechaComprobante"></div>
            </div>
        </div>
        
        <div class="proveedor-section" id="proveedorInfo"></div>
        
        <div class="recepcion-section">
            <h3>RECEPCIONES DE LECHE EN EL PERÍODO</h3>
            <div style="overflow-x: auto;">
                <table class="tabla-recepcion">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo Leche</th>
                            <th>Cantidad (L)</th>
                            <th>Costo por Litro ($)</th>
                            <th>Total ($)</th>
                        </tr>
                    </thead>
                    <tbody id="tablaRecepcionesBody"></tbody>
                </table>
            </div>
        </div>
        
        <div class="totales-section">
            <div class="totales">
                <div class="total-line"><span>SUBTOTAL LECHE:</span><span id="subtotalLeche">$0.00</span></div>
                <div class="total-line" id="adelantosLine" style="display: none;"><span>ADELANTOS DEDUCIDOS:</span><span id="adelantosDeducidos">$0.00</span></div>
                <div class="total-line total-final"><span>TOTAL PAGADO:</span><span id="totalPagado">$0.00</span></div>
            </div>
        </div>
        
        <div id="observacionesContainer" style="display: none;" class="observaciones">
            <strong>Observaciones:</strong><br>
            <span id="observacionesTexto"></span>
        </div>
        
        <div class="acciones">
            <button class="btn btn-cerrar" onclick="window.close()">Cerrar</button>
        </div>
    </div>

    <script>
        let datosPago = null;

        function cargarDatos() {
            const datosStr = sessionStorage.getItem('pagoProveedorData');
            if (!datosStr) {
                alert('No hay datos para generar el comprobante');
                window.close();
                return;
            }
            datosPago = JSON.parse(datosStr);
            mostrarComprobante();
        }

        function mostrarComprobante() {
            const { proveedor, periodoInicio, periodoFin, recepciones, totalPagado, adelantosDeducidos, observaciones } = datosPago;
            
            document.getElementById('fechaComprobante').innerHTML = new Date().toLocaleDateString('es-ES');
            
            const proveedorHtml = `
                <div class="proveedor-grid">
                    <div class="proveedor-item"><span class="label">Proveedor:</span><span>${escapeHtml(proveedor.nombre)}</span></div>
                    <div class="proveedor-item"><span class="label">Contacto:</span><span>${escapeHtml(proveedor.contacto || 'N/A')}</span></div>
                    <div class="proveedor-item"><span class="label">Teléfono:</span><span>${escapeHtml(proveedor.telefono || 'N/A')}</span></div>
                    <div class="proveedor-item"><span class="label">Período:</span><span>${formatearFecha(periodoInicio)} → ${formatearFecha(periodoFin)}</span></div>
                </div>
            `;
            document.getElementById('proveedorInfo').innerHTML = proveedorHtml;
            
            let subtotal = 0;
            let html = '';
            recepciones.forEach(r => {
                const fecha = formatearFecha(r.fecha);
                const cantidad = parseFloat(r.cantidad_litros).toFixed(2);
                const costoPorLitro = parseFloat(r.costo_por_litro).toFixed(2);
                const total = parseFloat(r.total_costo).toFixed(2);
                subtotal += parseFloat(total);
                
                let claseBadge = 'badge-normal';
                let textoLeche = 'Normal';
                if (r.tipo_leche === 'especial') {
                    claseBadge = 'badge-especial';
                    textoLeche = 'Especial';
                } else if (r.tipo_leche === 'organica') {
                    claseBadge = 'badge-organica';
                    textoLeche = 'Orgánica';
                }
                
                html += `
                    <tr>
                        <td style="white-space: nowrap;">${fecha}<br><small>${r.hora ? r.hora.substring(0,5) : '00:00'}</small></td>
                        <td><span class="${claseBadge}">${textoLeche}</span></td>
                        <td><strong>${cantidad} L</strong></td>
                        <td>$${costoPorLitro}</td>
                        <td><strong>$${total}</strong></td>
                    </tr>
                `;
            });
            
            document.getElementById('tablaRecepcionesBody').innerHTML = html;
            document.getElementById('subtotalLeche').innerHTML = `$${subtotal.toFixed(2)}`;
            
            if (adelantosDeducidos > 0) {
                document.getElementById('adelantosLine').style.display = 'flex';
                document.getElementById('adelantosDeducidos').innerHTML = `$${adelantosDeducidos.toFixed(2)}`;
            }
            
            document.getElementById('totalPagado').innerHTML = `$${parseFloat(totalPagado).toFixed(2)}`;
            
            if (observaciones && observaciones.trim() !== '') {
                document.getElementById('observacionesTexto').innerHTML = escapeHtml(observaciones);
                document.getElementById('observacionesContainer').style.display = 'block';
            }
        }
        
        function formatearFecha(fecha) {
            if (!fecha) return '';
            const partes = fecha.split('-');
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        cargarDatos();
    </script>
</body>
</html>