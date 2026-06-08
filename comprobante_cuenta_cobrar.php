<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estado de Cuenta por Cobrar - Agroindustria Láctea J.K.V. C.A.</title>
    <style>
        @font-face { font-family: 'mainFont'; src: url('source/font.ttf'); }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'mainFont', 'Segoe UI', Arial, sans-serif; background: #e0e0e0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .comprobante-container { max-width: 1000px; width: 100%; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; }
        .header { background: #278233; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
        .empresa-info h1 { color: white; font-size: 18px; margin-bottom: 5px; }
        .empresa-info p { color: rgba(255,255,255,0.8); font-size: 11px; }
        .comprobante-info { text-align: right; color: white; }
        .comprobante-info .numero { font-size: 20px; font-weight: bold; }
        
        .cliente-section { background: #f5f5f5; padding: 15px 20px; border-bottom: 1px solid #ddd; }
        .cliente-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; }
        .cliente-item { display: flex; font-size: 13px; }
        .cliente-item .label { font-weight: bold; width: 100px; color: #555; }
        
        .productos-section { padding: 20px; }
        .productos-section h3 { color: #278233; margin-bottom: 15px; font-size: 16px; border-left: 4px solid #278233; padding-left: 12px; }
        .tabla-productos { width: 100%; border-collapse: collapse; }
        .tabla-productos th { background: #278233; color: white; padding: 10px; text-align: center; }
        .tabla-productos td { padding: 8px 10px; text-align: center; border-bottom: 1px solid #eee; }
        
        .totales-section { padding: 20px; background: #fafafa; border-top: 1px solid #eee; border-bottom: 1px solid #eee; display: flex; justify-content: flex-end; }
        .totales { width: 350px; }
        .total-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .total-line.total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #278233; margin-top: 8px; padding-top: 12px; color: #278233; }
        
        .pagos-section { padding: 20px; background: #fff8e1; }
        .pagos-section h3 { color: #856404; margin-bottom: 15px; font-size: 16px; border-left: 4px solid #f4d71b; padding-left: 12px; }
        .tabla-pagos { width: 100%; border-collapse: collapse; }
        .tabla-pagos th { background: #f4d71b; color: #333; padding: 10px; text-align: center; }
        .tabla-pagos td { padding: 8px 10px; text-align: center; border-bottom: 1px solid #eee; }
        .total-pagado { font-weight: bold; color: #278233; }
        .saldo-pendiente { font-weight: bold; color: #856404; }
        .estado-pagado { background: rgba(36,150,0,0.15); color: #249600; padding: 4px 10px; border-radius: 4px; display: inline-block; font-weight: bold; }
        .estado-pendiente { background: rgba(244,215,27,0.3); color: #a18f1b; padding: 4px 10px; border-radius: 4px; display: inline-block; font-weight: bold; }
        
        .acciones { display: flex; justify-content: flex-end; gap: 15px; padding: 15px 20px; background: #f0f0f0; }
        .btn { padding: 8px 20px; border: none; border-radius: 5px; cursor: pointer; font-family: 'mainFont', sans-serif; font-size: 13px; transition: all 0.3s; }
        .btn-imprimir { background: #278233; color: white; }
        .btn-imprimir:hover { background: #1e6b28; }
        .btn-cerrar { background: #666; color: white; }
        .btn-cerrar:hover { background: #555; }
        
        .observaciones { background: #fff8e1; padding: 12px 20px; margin: 0 20px 20px; border-radius: 5px; font-size: 12px; color: #856404; }
        
        @media print { body { background: white; padding: 0; } .acciones { display: none; } }
    </style>
</head>
<body>
    <div class="comprobante-container" id="comprobanteContainer">
        <div class="header">
            <div class="empresa-info">
                <h1>AGROINDUSTRIA LÁCTEA J.K.V. C.A.</h1>
                <p>RIF: J-41022340-5 | Telf: (0412) 302-7063</p>
                <p>Carretera Lara-Zulia (Km 82) | Palmarito - Cerro Verde</p>
            </div>
            <div class="comprobante-info">
                <div class="numero">ESTADO DE CUENTA POR COBRAR</div>
                <div class="fecha" id="fechaComprobante"></div>
            </div>
        </div>
        
        <div id="contenidoDinamico">
            <!-- El contenido se llenará dinámicamente -->
            <div class="cargando" style="text-align:center;padding:40px;">
                <div class="spinner" style="display:inline-block;width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #278233;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p>Cargando datos...</p>
            </div>
        </div>
        
        <div class="acciones">
            <button class="btn btn-imprimir" onclick="imprimirComprobante()">Imprimir / Guardar PDF</button>
            <button class="btn btn-cerrar" onclick="window.close()">Cerrar</button>
        </div>
    </div>

    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>

    <script>
        let datosCuenta = null;

        function cargarDatos() {
            const datosStr = sessionStorage.getItem('cuentaCobrarData');
            if (!datosStr) {
                document.getElementById('contenidoDinamico').innerHTML = '<div style="padding:40px;text-align:center;color:#f44336;">No hay datos para generar el comprobante</div>';
                return;
            }
            datosCuenta = JSON.parse(datosStr);
            mostrarComprobante();
        }

        function mostrarComprobante() {
            const { cuenta, detalles_productos, pagos, empresa } = datosCuenta;
            
            document.getElementById('fechaComprobante').innerHTML = new Date().toLocaleDateString('es-ES');
            
            // Calcular saldos
            const montoOriginal = parseFloat(cuenta.monto);
            const montoPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            const saldoPendiente = montoOriginal - montoPagado;
            const estado = saldoPendiente <= 0 ? 'PAGADO' : 'PENDIENTE';
            
            let html = `
                <div class="cliente-section">
                    <div class="cliente-grid">
                        <div class="cliente-item"><span class="label">Cliente:</span><span>${escapeHtml(cuenta.cliente_nombre || cuenta.descripcion)}</span></div>
                        <div class="cliente-item"><span class="label">RIF/C.I.:</span><span>${escapeHtml(cuenta.rif || '-')}</span></div>
                        <div class="cliente-item"><span class="label">Teléfono:</span><span>${escapeHtml(cuenta.telefono || '-')}</span></div>
                        <div class="cliente-item"><span class="label">Dirección:</span><span>${escapeHtml(cuenta.direccion || '-')}</span></div>
                        <div class="cliente-item"><span class="label">Fecha Emisión:</span><span>${formatearFecha(cuenta.fecha_inicio)}</span></div>
                        <div class="cliente-item"><span class="label">Fecha Vencimiento:</span><span>${formatearFecha(cuenta.fecha_vencimiento)}</span></div>
                        <div class="cliente-item"><span class="label">Estado:</span><span><span class="${estado === 'PAGADO' ? 'estado-pagado' : 'estado-pendiente'}">${estado}</span></span></div>
                    </div>
                </div>
            `;
            
            // Mostrar productos si hay
            if (detalles_productos && detalles_productos.length > 0) {
                html += `
                    <div class="productos-section">
                        <h3>Detalle de Productos</h3>
                        <div style="overflow-x: auto;">
                            <table class="tabla-productos">
                                <thead>
                                    <tr><th>Cantidad</th><th>Producto</th><th>Precio Unitario</th><th>Total</th></tr>
                                </thead>
                                <tbody>
                `;
                
                detalles_productos.forEach(det => {
                    const cantidad = parseFloat(det.cantidad).toFixed(2);
                    const precio = parseFloat(det.precio_unitario).toFixed(2);
                    const total = (cantidad * precio).toFixed(2);
                    const productoNombre = formatearNombre(det.producto_nombre || 'Producto');
                    
                    html += `
                        <tr>
                            <td>${cantidad} ${det.unidad === 'litros' ? 'L' : 'kg'}</td>
                            <td>${productoNombre}</td>
                            <td>$${precio}</td>
                            <td>$${total}</td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
            
            // Historial de pagos
            if (pagos && pagos.length > 0) {
                html += `
                    <div class="pagos-section">
                        <h3>Historial de Pagos / Abonos</h3>
                        <div style="overflow-x: auto;">
                            <table class="tabla-pagos">
                                <thead>
                                    <tr><th>Fecha</th><th>Monto Pagado</th><th>Método de Pago</th><th>Referencia</th><th>Observaciones</th></tr>
                                </thead>
                                <tbody>
                `;
                
                pagos.forEach(pago => {
                    const monto = parseFloat(pago.monto).toFixed(2);
                    html += `
                        <tr>
                            <td>${formatearFecha(pago.fecha)}</td>
                            <td><strong>$${monto}</strong></td>
                            <td>${pago.metodo_pago || 'N/A'}</td>
                            <td>${pago.referencia || '-'}</td>
                            <td>${pago.observaciones || '-'}</td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="pagos-section">
                        <h3>Historial de Pagos / Abonos</h3>
                        <div style="text-align:center;padding:20px;color:#999;">
                            No hay pagos registrados para esta cuenta
                        </div>
                    </div>
                `;
            }
            
            // Totales
            html += `
                <div class="totales-section">
                    <div class="totales">
                        <div class="total-line"><span>Monto Original:</span><span>$${montoOriginal.toFixed(2)}</span></div>
                        <div class="total-line"><span>Total Pagado:</span><span class="total-pagado">$${montoPagado.toFixed(2)}</span></div>
                        <div class="total-line total-final"><span>Saldo Pendiente:</span><span class="saldo-pendiente">$${saldoPendiente.toFixed(2)}</span></div>
                    </div>
                </div>
            `;
            
            // Observaciones de la cuenta
            if (cuenta.observaciones) {
                html += `
                    <div class="observaciones">
                        <strong>Observaciones de la cuenta:</strong><br>
                        ${escapeHtml(cuenta.observaciones)}
                    </div>
                `;
            }
            
            document.getElementById('contenidoDinamico').innerHTML = html;
        }
        
        function imprimirComprobante() {
            window.print();
        }
        
        function formatearFecha(fecha) {
            if (!fecha) return '';
            const partes = fecha.split('-');
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        
        function formatearNombre(texto) {
            if (!texto) return '';
            return texto.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
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