<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Pago - Sueldo Fijo</title>
    <style>
        @font-face { font-family: 'mainFont'; src: url('source/font.ttf'); }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'mainFont', 'Segoe UI', Arial, sans-serif; background: #e0e0e0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .comprobante-container { max-width: 700px; width: 100%; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; }
        .header { background: #278233; padding: 20px 25px; color: white; }
        .header h1 { font-size: 18px; margin-bottom: 5px; }
        .header p { font-size: 11px; opacity: 0.8; }
        .comprobante-info { text-align: right; margin-top: 10px; }
        .trabajador-section { background: #f5f5f5; padding: 20px; border-bottom: 1px solid #ddd; }
        .trabajador-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .trabajador-item { display: flex; font-size: 13px; }
        .trabajador-item .label { font-weight: bold; width: 100px; color: #555; }
        .sueldo-section { padding: 30px; text-align: center; }
        .sueldo-monto { font-size: 48px; color: #278233; font-weight: bold; margin: 20px 0; }
        .totales-section { padding: 20px; background: #fafafa; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
        .totales { width: 350px; }
        .total-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .total-line.total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #278233; margin-top: 8px; padding-top: 12px; color: #278233; }
        .acciones { display: flex; justify-content: flex-end; gap: 15px; padding: 15px 20px; background: #f0f0f0; }
        .btn { padding: 8px 20px; border: none; border-radius: 5px; cursor: pointer; font-family: 'mainFont', sans-serif; font-size: 13px; transition: all 0.3s; }
        .btn-pagar { background: #278233; color: white; }
        .btn-pagar:hover { background: #1e6b28; }
        .btn-cerrar { background: #666; color: white; }
        .btn-cerrar:hover { background: #555; }
        .observaciones { background: #fff8e1; padding: 12px 20px; margin: 0 20px 20px; border-radius: 5px; font-size: 12px; color: #856404; }
        @media print { body { background: white; padding: 0; } .acciones { display: none; } }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #278233; }
    </style>
</head>
<body>
    <div class="comprobante-container">
        <div class="header">
            <h1>AGROINDUSTRIA LÁCTEA J.K.V. C.A.</h1>
            <p>RIF: J-41022340-5 | Telf: (0412) 302-7063</p>
            <p>Carretera Lara-Zulia (Km 82) | Palmarito - Cerro Verde</p>
            <div class="comprobante-info">
                <div>COMPROBANTE DE PAGO - SUELDO FIJO</div>
                <div id="fechaComprobante"></div>
            </div>
        </div>
        
        <div class="trabajador-section" id="trabajadorInfo"></div>
        
        <div class="sueldo-section">
            <h3 style="color: #278233;">SUELDO FIJO SEMANAL</h3>
            <div class="sueldo-monto" id="sueldoMonto">$0.00</div>
            <p style="color: #666;">Pago correspondiente al período</p>
            <p id="periodoTexto" style="color: #666; font-size: 12px;"></p>
        </div>
        
        <div class="totales-section">
            <div class="totales">
                <div class="total-line"><span>SUELDO BASE:</span><span id="sueldoBase">$0.00</span></div>
                <div class="total-line"><span>DEDUCCIÓN (PRÉSTAMOS):</span><span id="deduccion">$0.00</span></div>
                <div class="total-line total-final"><span>TOTAL A PAGAR:</span><span id="totalPagar">$0.00</span></div>
            </div>
        </div>
        
        <div style="padding: 20px;">
            <div class="form-group">
                <label>Observaciones (opcional):</label>
                <textarea id="observacionesPago" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit; resize: vertical;" placeholder="Ej: Pago de sueldo fijo correspondiente a la semana"></textarea>
            </div>
        </div>
        
        <div class="acciones">
            <button class="btn btn-pagar" onclick="confirmarPago()">Confirmar Pago</button>
            <button class="btn btn-cerrar" onclick="window.close()">Cerrar</button>
        </div>
    </div>

    <script>
        let datosComprobante = null;
        
        function cargarDatos() {
            const datosStr = sessionStorage.getItem('comprobanteData');
            if (!datosStr) {
                alert('No hay datos para generar el comprobante');
                window.close();
                return;
            }
            datosComprobante = JSON.parse(datosStr);
            mostrarComprobante();
        }
        
        function mostrarComprobante() {
            const { trabajador, deuda_pendiente, periodoInicio, periodoFin, produccion } = datosComprobante;
            const sueldoFijo = trabajador.sueldo_fijo || 0;
            
            document.getElementById('fechaComprobante').innerHTML = new Date().toLocaleDateString('es-ES');
            document.getElementById('periodoTexto').innerHTML = `${formatearFecha(periodoInicio)} → ${formatearFecha(periodoFin)}`;
            document.getElementById('sueldoMonto').innerHTML = `$${sueldoFijo.toFixed(2)}`;
            document.getElementById('sueldoBase').innerHTML = `$${sueldoFijo.toFixed(2)}`;
            document.getElementById('deduccion').innerHTML = `$${deuda_pendiente.toFixed(2)}`;
            document.getElementById('totalPagar').innerHTML = `$${(sueldoFijo - deuda_pendiente).toFixed(2)}`;
            
            const trabajadorHtml = `
                <div class="trabajador-grid">
                    <div class="trabajador-item"><span class="label">Trabajador:</span><span>${escapeHtml(trabajador.nombre)}</span></div>
                    <div class="trabajador-item"><span class="label">Cédula:</span><span>${trabajador.cedula || 'N/A'}</span></div>
                    <div class="trabajador-item"><span class="label">Cargo:</span><span>${trabajador.cargo || 'N/A'}</span></div>
                    <div class="trabajador-item"><span class="label">Sucursal:</span><span>${trabajador.sucursal || 'N/A'}</span></div>
                </div>
            `;
            document.getElementById('trabajadorInfo').innerHTML = trabajadorHtml;
        }
        
        function confirmarPago() {
            const observaciones = document.getElementById('observacionesPago').value.trim();
            const { trabajador, deuda_pendiente, periodoInicio, periodoFin } = datosComprobante;
            const sueldoFijo = trabajador.sueldo_fijo || 0;
            const totalPagar = sueldoFijo - deuda_pendiente;
            
            let mensaje = `Confirmar pago de sueldo fijo para ${trabajador.nombre}:\n\n`;
            mensaje += `Sueldo fijo: $${sueldoFijo.toFixed(2)}\n`;
            mensaje += `Deuda: $${deuda_pendiente.toFixed(2)}\n`;
            mensaje += `Total a pagar: $${totalPagar.toFixed(2)}\n`;
            mensaje += `Período: ${formatearFecha(periodoInicio)} → ${formatearFecha(periodoFin)}\n`;
            if (observaciones) mensaje += `\nObservaciones: ${observaciones}\n`;
            mensaje += `\n¿Registrar este pago?`;
            
            if (confirm(mensaje)) {
                registrarPago(totalPagar, sueldoFijo, deuda_pendiente, observaciones);
            }
        }
        
        async function registrarPago(totalPagar, sueldoFijo, deuda, observaciones) {
            const data = {
                action: 'registrar_pago_fijo',
                trabajador_id: datosComprobante.trabajador.id,
                sueldo_fijo: sueldoFijo,
                deducciones: deuda,
                total_pagado: totalPagar,
                periodo_inicio: datosComprobante.periodoInicio,
                periodo_fin: datosComprobante.periodoFin,
                observaciones: observaciones
            };
            
            try {
                const response = await fetch('db/nomina.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    alert('Pago registrado exitosamente');
                    if (window.opener && !window.opener.closed) {
                        if (window.opener.cargarDiasConPagos) window.opener.cargarDiasConPagos();
                        if (window.opener.cargarTrabajadores) window.opener.cargarTrabajadores();
                    }
                    window.close();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error al registrar el pago');
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