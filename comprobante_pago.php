<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Pago - Agroindustria Láctea J.K.V. C.A.</title>
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
        .trabajador-section { background: #f5f5f5; padding: 15px 20px; border-bottom: 1px solid #ddd; }
        .trabajador-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; }
        .trabajador-item { display: flex; font-size: 13px; }
        .trabajador-item .label { font-weight: bold; width: 100px; color: #555; }
        .produccion-section { padding: 20px; }
        .produccion-section h3 { color: #278233; margin-bottom: 15px; font-size: 16px; border-left: 4px solid #278233; padding-left: 12px; }
        .tabla-produccion { width: 100%; border-collapse: collapse; }
        .tabla-produccion th { background: #278233; color: white; padding: 10px; text-align: center; }
        .tabla-produccion td { padding: 8px 10px; text-align: center; border-bottom: 1px solid #eee; }
        .tabla-produccion input { width: 100px; padding: 6px; text-align: center; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; }
        .tabla-produccion input:focus { outline: none; border-color: #278233; }
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
        
        #tasaContainer {
            transition: background 0.2s ease;
            border-radius: 4px;
            padding: 4px 8px;
            margin: 0 -8px;
        }
        #tasaContainer:hover {
            background: rgba(39,130,51,0.1);
        }
        .tasa-click-indicator {
            font-size: 10px;
            margin-left: 5px;
            opacity: 0.6;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #278233;
        }
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
                <div class="numero">COMPROBANTE DE PAGO</div>
                <div class="fecha" id="fechaComprobante"></div>
            </div>
        </div>
        
        <div class="trabajador-section" id="trabajadorInfo"></div>
        
        <div class="produccion-section">
            <h3>PRODUCCIÓN DEL PERÍODO</h3>
            <div style="overflow-x: auto;">
                <table class="tabla-produccion">
                    <thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Valor Unitario ($)</th><th>Subtotal ($)</th></tr></thead>
                    <tbody id="tablaProduccionBody"></tbody>
                </table>
            </div>
        </div>
        
        <div class="totales-section">
            <div class="totales">
                <div class="total-line"><span>SUBTOTAL PRODUCCIÓN:</span><span id="subtotalProduccion">$0.00</span></div>
                <div class="total-line"><span>DEDUCCIÓN (PRÉSTAMOS):</span><span id="deduccion">$0.00</span></div>
                <div class="total-line"><span>TOTAL A PAGAR (USD):</span><span id="totalUSD">$0.00</span></div>
                <div class="total-line" id="tasaContainer" style="cursor: pointer; position: relative;">
                    <span>TASA DE CAMBIO (BS/USD):</span>
                    <span id="tasaCambioDisplay">Bs 400.00</span>
                </div>
                <div id="tasaEditor" style="display: none; margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 5px;">
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <input type="number" id="tasaInputManual" step="0.01" value="400" style="flex: 2; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                        <button id="btnAplicarTasa" style="background: #278233; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Aplicar</button>
                        <button id="btnObtenerAuto" style="background: #f4d71b; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Auto</button>
                        <button id="btnCancelarTasa" style="background: #999; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    </div>
                    <div id="tasaInfo" style="font-size: 11px; color: #666; margin-top: 8px;"></div>
                </div>
                <div class="total-line total-final"><span>TOTAL A PAGAR (BS):</span><span id="totalBs">Bs 0.00</span></div>
            </div>
        </div>
        
        <div style="padding: 20px 20px 0 20px;">
            <div class="form-group">
                <label>Observaciones (opcional):</label>
                <textarea id="observacionesPago" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: inherit; resize: vertical;" placeholder="Ej: Pago correspondiente a la semana, incluye bonos, etc."></textarea>
            </div>
        </div>
        
        <div class="acciones">
            <button class="btn btn-pagar" onclick="confirmarPago()">Confirmar Pago</button>
            <button class="btn btn-cerrar" onclick="window.close()">Cerrar</button>
        </div>
    </div>

    <script>
        let datosComprobante = null;
        let tasaCambio = 400;
        let tasaManualActiva = false;

        async function obtenerTasaActual() {
            try {
                const response = await fetch('db/obtener_tasa_dolar.php');
                const data = await response.json();
                if (data.success && data.tasa > 0 && !tasaManualActiva) {
                    tasaCambio = data.tasa;
                    document.getElementById('tasaInputManual').value = tasaCambio.toFixed(2);
                    document.getElementById('tasaInfo').innerHTML = `Última actualización: ${data.fecha} (${data.fuente})`;
                    actualizarDisplayTasa();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error:', error);
                return false;
            }
        }

        function actualizarDisplayTasa() {
            document.getElementById('tasaCambioDisplay').innerHTML = `Bs ${tasaCambio.toFixed(2)}`;
        }

        function mostrarEditorTasa(event) {
            event.stopPropagation();
            const editor = document.getElementById('tasaEditor');
            if (editor.style.display === 'none') {
                document.getElementById('tasaInputManual').value = tasaCambio.toFixed(2);
                editor.style.display = 'block';
            } else {
                editor.style.display = 'none';
            }
        }

        function ocultarEditorTasa() {
            document.getElementById('tasaEditor').style.display = 'none';
            tasaManualActiva = false;
        }

        function aplicarTasaManual() {
            const newValue = parseFloat(document.getElementById('tasaInputManual').value);
            if (!isNaN(newValue) && newValue > 0) {
                tasaCambio = newValue;
                tasaManualActiva = true;
                document.getElementById('tasaInfo').innerHTML = `Tasa modificada manualmente - ${new Date().toLocaleTimeString()}`;
                actualizarDisplayTasa();
                recalcularTotales();
                ocultarEditorTasa();
            } else {
                alert('Ingrese un valor válido para la tasa');
            }
        }

        async function obtenerTasaAuto() {
            tasaManualActiva = false;
            await obtenerTasaActual();
            recalcularTotales();
            ocultarEditorTasa();
            alert(`Tasa actualizada a Bs ${tasaCambio.toFixed(2)}`);
        }

        function inicializarTasaEvents() {
            const tasaContainer = document.getElementById('tasaContainer');
            if (tasaContainer) {
                // Remover event listener anterior si existe
                tasaContainer.removeEventListener('click', mostrarEditorTasa);
                tasaContainer.addEventListener('click', mostrarEditorTasa);
            }
            
            const btnAplicar = document.getElementById('btnAplicarTasa');
            if (btnAplicar) {
                btnAplicar.removeEventListener('click', aplicarTasaManual);
                btnAplicar.addEventListener('click', aplicarTasaManual);
            }
            
            const btnAuto = document.getElementById('btnObtenerAuto');
            if (btnAuto) {
                btnAuto.removeEventListener('click', obtenerTasaAuto);
                btnAuto.addEventListener('click', obtenerTasaAuto);
            }
            
            const btnCancelar = document.getElementById('btnCancelarTasa');
            if (btnCancelar) {
                btnCancelar.removeEventListener('click', ocultarEditorTasa);
                btnCancelar.addEventListener('click', ocultarEditorTasa);
            }
        }

        function cargarDatos() {
            const datosStr = sessionStorage.getItem('comprobanteData');
            if (!datosStr) {
                alert('No hay datos para generar el comprobante');
                window.close();
                return;
            }
            datosComprobante = JSON.parse(datosStr);

            obtenerTasaActual().then(() => {
                mostrarComprobante();
                inicializarTasaEvents();
            });
        }

        function mostrarComprobante() {
            const { trabajador, deuda_pendiente, produccion, periodoInicio, periodoFin } = datosComprobante;
            
            document.getElementById('fechaComprobante').innerHTML = new Date().toLocaleDateString('es-ES');
            
            const trabajadorHtml = `
                <div class="trabajador-grid">
                    <div class="trabajador-item"><span class="label">Trabajador:</span><span>${escapeHtml(trabajador.nombre)}</span></div>
                    <div class="trabajador-item"><span class="label">Cédula:</span><span>${trabajador.cedula || 'N/A'}</span></div>
                    <div class="trabajador-item"><span class="label">Cargo:</span><span>${trabajador.cargo || 'N/A'}</span></div>
                    <div class="trabajador-item"><span class="label">Sucursal:</span><span>${trabajador.sucursal || 'N/A'}</span></div>
                    <div class="trabajador-item"><span class="label">Período:</span><span>${formatearFecha(periodoInicio)} → ${formatearFecha(periodoFin)}</span></div>
                </div>
            `;
            document.getElementById('trabajadorInfo').innerHTML = trabajadorHtml;
            document.getElementById('deduccion').innerHTML = `$${deuda_pendiente.toFixed(2)}`;
            
            let html = '';
            produccion.forEach((prod, index) => {
                const fecha = formatearFecha(prod.fecha);
                const nombreProducto = formatearNombre(prod.tipo_producto);
                const esLeche = prod.es_leche == 1;
                const cantidad = parseFloat(prod.peso_kg || prod.piezas || 0);
                const unidad = esLeche ? 'litros' : 'kg';
                const cantidadTexto = `${cantidad.toFixed(2)} ${unidad}`;
                
                html += `<tr data-index="${index}">
                    <td>${fecha}</td>
                    <td>${nombreProducto}</td>
                    <td>${cantidadTexto}</td>
                    <td><input type="number" step="0.01" class="valor-input" data-index="${index}" value="0.00" placeholder="0.00"></td>
                    <td class="subtotal-cell">$0.00</br><small>subtotal</small></td>
                </tr>`;
            });
            document.getElementById('tablaProduccionBody').innerHTML = html;
            
            // Agregar indicador de clic en la tasa
            const tasaSpan = document.querySelector('#tasaContainer span:last-child');
            if (tasaSpan && !document.querySelector('.tasa-click-indicator')) {
                const indicator = document.createElement('small');
                indicator.className = 'tasa-click-indicator';
                indicator.textContent = ' (clic para modificar)';
                indicator.style.fontSize = '10px';
                indicator.style.opacity = '0.6';
                tasaSpan.appendChild(indicator);
            }
            
            document.querySelectorAll('.valor-input').forEach(input => {
                input.addEventListener('input', recalcularTotales);
            });
            
            recalcularTotales();
        }
        
        function recalcularTotales() {
            let subtotal = 0;
            document.querySelectorAll('.valor-input').forEach(input => {
                const index = parseInt(input.getAttribute('data-index'));
                const prod = datosComprobante.produccion[index];
                const cantidad = parseFloat(prod.peso_kg || prod.piezas || 0);
                const valor = parseFloat(input.value) || 0;
                const subtotalRow = cantidad * valor;
                subtotal += subtotalRow;
                const subtotalCell = input.closest('tr').querySelector('.subtotal-cell');
                if (subtotalCell) {
                    subtotalCell.innerHTML = `$${subtotalRow.toFixed(2)}</br><small>subtotal</small>`;
                }
            });

            const deuda = datosComprobante.deuda_pendiente || 0;
            const totalUSD = subtotal - deuda;
            const totalBs = totalUSD * tasaCambio;

            document.getElementById('subtotalProduccion').innerHTML = `$${subtotal.toFixed(2)}`;
            document.getElementById('totalUSD').innerHTML = `$${totalUSD.toFixed(2)}`;
            document.getElementById('totalBs').innerHTML = `Bs ${totalBs.toFixed(2)}`;
            document.getElementById('tasaCambioDisplay').innerHTML = `Bs ${tasaCambio.toFixed(2)}`;

            datosComprobante.subtotal = subtotal;
            datosComprobante.totalUSD = totalUSD;
        }
        
        function confirmarPago() {
            const valores = [];
            document.querySelectorAll('.valor-input').forEach((input, idx) => {
                valores.push({
                    producto: datosComprobante.produccion[idx].tipo_producto,
                    fecha: datosComprobante.produccion[idx].fecha,
                    valor: parseFloat(input.value) || 0,
                    cantidad: parseFloat(datosComprobante.produccion[idx].peso_kg || datosComprobante.produccion[idx].piezas || 0)
                });
            });

            const observaciones = document.getElementById('observacionesPago').value.trim();
            const subtotal = parseFloat(document.getElementById('subtotalProduccion').innerHTML.replace('$', ''));
            const totalUSD = parseFloat(document.getElementById('totalUSD').innerHTML.replace('$', ''));
            const totalBs = totalUSD * tasaCambio;

            let mensaje = `Confirmar pago para ${datosComprobante.trabajador.nombre}:\n\n`;
            mensaje += `Subtotal: $${subtotal.toFixed(2)}\n`;
            mensaje += `Deuda: $${datosComprobante.deuda_pendiente.toFixed(2)}\n`;
            mensaje += `Total USD: $${totalUSD.toFixed(2)}\n`;
            mensaje += `Total Bs: Bs ${totalBs.toFixed(2)}\n`;
            if (observaciones) {
                mensaje += `\nObservaciones: ${observaciones}\n`;
            }
            mensaje += `\n¿Registrar este pago?`;

            if (confirm(mensaje)) {
                registrarPago(valores, subtotal, totalUSD, totalBs, observaciones);
            }
        }
        
        async function registrarPago(valores, subtotal, totalUSD, totalBs, observaciones) {
            const data = {
                action: 'registrar_pago_valorado',
                trabajador_id: datosComprobante.trabajador.id,
                valores_unitarios: valores,
                subtotal: subtotal,
                total_usd: totalUSD,
                total_bs: totalBs,
                tasa_cambio: tasaCambio,
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