<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

switch($action) {
    case 'obtener_semanas_detalle':
        obtenerSemanasDetalle($conn);
        break;
    case 'guardar_pago':
        guardarPago($conn);
        break;
    case 'eliminar_pago':
        eliminarPago($conn);
        break;
	case 'registrar_pago_valorado':
        registrarPagoValorado($conn);
        break;
	case 'registrar_pago_fijo':
        registrarPagoFijo($conn);
        break;
    case 'obtener_agrupado_por_dia':
        $query = "SELECT DATE(fecha_pago) as fecha_pago, 
                         DAYOFWEEK(fecha_pago) as dia_semana
                  FROM nomina_pagos 
                  GROUP BY DATE(fecha_pago)
                  ORDER BY fecha_pago DESC";
        $result = $conn->query($query);
        $dias = [];
        while ($row = $result->fetch_assoc()) {
            $pagosQuery = "SELECT n.*, t.nombre as trabajador_nombre, t.cargo 
                           FROM nomina_pagos n
                           JOIN trabajadores t ON n.trabajador_id = t.id
                           WHERE DATE(n.fecha_pago) = '{$row['fecha_pago']}'
                           ORDER BY t.nombre";
            $pagosResult = $conn->query($pagosQuery);
            $pagos = [];
            while ($pago = $pagosResult->fetch_assoc()) {
                $pagos[] = $pago;
            }
            $row['pagos'] = $pagos;
            $dias[] = $row;
        }
        echo json_encode(['success' => true, 'dias' => $dias]);
        break;

    case 'obtener_pagos_por_dia':
        $fecha = $conn->real_escape_string($_GET['fecha']);
        $query = "SELECT n.*, t.nombre as trabajador_nombre, t.cargo 
                  FROM nomina_pagos n
                  JOIN trabajadores t ON n.trabajador_id = t.id
                  WHERE DATE(n.fecha_pago) = '$fecha'
                  ORDER BY t.nombre";
        $result = $conn->query($query);
        $pagos = [];
        while ($row = $result->fetch_assoc()) {
            $pagos[] = $row;
        }
        echo json_encode(['success' => true, 'pagos' => $pagos]);
        break;
    case 'obtener_pagos_semana_actual':
        // Obtener la semana actual (Lunes a Domingo)
        $hoy = new DateTime();
        $lunes = clone $hoy;
        $lunes->modify('monday this week');
        $domingo = clone $lunes;
        $domingo->modify('+6 days');

        $fechaInicio = $lunes->format('Y-m-d');
        $fechaFin = $domingo->format('Y-m-d');

        $query = "SELECT n.*, t.nombre as trabajador_nombre, t.cargo,
                         DAYOFWEEK(n.fecha_pago) as dia_semana
                  FROM nomina_pagos n
                  JOIN trabajadores t ON n.trabajador_id = t.id
                  WHERE n.fecha_pago BETWEEN '$fechaInicio' AND '$fechaFin'
                  ORDER BY n.fecha_pago DESC, t.nombre";
        $result = $conn->query($query);

        $pagosPorDia = [];
        while ($row = $result->fetch_assoc()) {
            $dia = $row['dia_semana'];
            if (!isset($pagosPorDia[$dia])) {
                $pagosPorDia[$dia] = [];
            }
            $pagosPorDia[$dia][] = $row;
        }

        echo json_encode([
            'success' => true,
            'semana' => [
                'inicio' => $fechaInicio,
                'fin' => $fechaFin
            ],
            'pagos_por_dia' => $pagosPorDia
        ]);
        break;
   case 'obtener_dias_con_pagos':
        $query = "SELECT DATE(fecha_pago) as fecha_pago, 
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
                  ORDER BY fecha_pago DESC";
        $result = $conn->query($query);
        $dias = [];
        while ($row = $result->fetch_assoc()) {
            $pagosQuery = "SELECT n.*, t.nombre as trabajador_nombre, t.cargo 
                           FROM nomina_pagos n
                           JOIN trabajadores t ON n.trabajador_id = t.id
                           WHERE DATE(n.fecha_pago) = '{$row['fecha_pago']}'
                           ORDER BY t.nombre";
            $pagosResult = $conn->query($pagosQuery);
            $pagos = [];
            while ($pago = $pagosResult->fetch_assoc()) {
                $pagos[] = $pago;
            }
            $row['pagos'] = $pagos;
            $dias[] = $row;
        }
        echo json_encode(['success' => true, 'dias' => $dias]);
        break;
    case 'obtener_historial_completo':
        $query = "SELECT n.*, t.nombre as trabajador_nombre, t.cargo
                  FROM nomina_pagos n
                  JOIN trabajadores t ON n.trabajador_id = t.id
                  ORDER BY n.fecha_pago DESC, t.nombre";
        $result = $conn->query($query);
        $pagos = [];
        while ($row = $result->fetch_assoc()) {
            $pagos[] = $row;
        }
        echo json_encode(['success' => true, 'pagos' => $pagos]);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
        break;
}

function obtenerSemanasDetalle($conn) {
    $query = "SELECT DISTINCT semana_inicio, semana_fin 
              FROM nomina_pagos 
              ORDER BY semana_inicio DESC";
    $result = $conn->query($query);
    $semanas = [];
    while ($row = $result->fetch_assoc()) {
        $pagos = $conn->query("SELECT n.*, t.nombre as trabajador_nombre 
                               FROM nomina_pagos n
                               JOIN trabajadores t ON n.trabajador_id = t.id
                               WHERE n.semana_inicio = '{$row['semana_inicio']}'
                               ORDER BY t.nombre");
        $row['pagos'] = [];
        while ($pago = $pagos->fetch_assoc()) {
            $row['pagos'][] = $pago;
        }
        $semanas[] = $row;
    }
    echo json_encode(['success' => true, 'semanas' => $semanas]);
}

function registrarPagoFijo($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $trabajador_id = intval($data['trabajador_id']);
    $sueldo_fijo = floatval($data['sueldo_fijo']);
    $deducciones = floatval($data['deducciones']);
    $total_pagado = floatval($data['total_pagado']);
    $periodo_inicio = $conn->real_escape_string($data['periodo_inicio']);
    $periodo_fin = $conn->real_escape_string($data['periodo_fin']);
    $observaciones = $conn->real_escape_string($data['observaciones'] ?? '');
    $fecha_pago = date('Y-m-d');
    
    $conn->begin_transaction();
    
    try {
        // 1. Insertar el pago en nomina_pagos
        $query = "INSERT INTO nomina_pagos 
                  (trabajador_id, semana_inicio, semana_fin, salario_semanal, deducciones, total_pagado, fecha_pago, metodo_pago, observaciones) 
                  VALUES 
                  ($trabajador_id, '$periodo_inicio', '$periodo_fin', $sueldo_fijo, $deducciones, $total_pagado, '$fecha_pago', 'efectivo', '$observaciones')";
        
        if (!$conn->query($query)) {
            throw new Exception($conn->error);
        }
        
        $pago_id = $conn->insert_id;
        
        // 2. Si hay deducciones, marcar los préstamos como pagados (parcial o totalmente)
        if ($deducciones > 0) {
            // Obtener préstamos pendientes ordenados por fecha
            $prestamosQuery = "SELECT id, monto FROM prestamos 
                               WHERE trabajador_id = $trabajador_id AND estado = 'pendiente' 
                               ORDER BY fecha ASC";
            $prestamosResult = $conn->query($prestamosQuery);
            
            $restante = $deducciones;
            while ($prestamo = $prestamosResult->fetch_assoc()) {
                if ($restante <= 0) break;
                
                if ($restante >= $prestamo['monto']) {
                    // Pagar completamente este préstamo
                    $updateQuery = "UPDATE prestamos SET estado = 'pagado' WHERE id = {$prestamo['id']}";
                    $conn->query($updateQuery);
                    $restante -= $prestamo['monto'];
                } else {
                    // Pago parcial (para futura implementación)
                    // Por ahora, no soportamos pagos parciales de préstamos
                    break;
                }
            }
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Pago registrado correctamente', 'pago_id' => $pago_id]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function registrarPagoValorado($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $trabajador_id = intval($input['trabajador_id']);
    $subtotal = floatval($input['subtotal']);
    $total_usd = floatval($input['total_usd']);
    $total_bs = floatval($input['total_bs']);
    $tasa_cambio = floatval($input['tasa_cambio']);
    $periodo_inicio = $conn->real_escape_string($input['periodo_inicio']);
    $periodo_fin = $conn->real_escape_string($input['periodo_fin']);
    $valores = $input['valores_unitarios'];
    $observaciones_usuario = isset($input['observaciones']) ? $conn->real_escape_string($input['observaciones']) : '';
    
    // Obtener préstamos pendientes
    $prestamosQuery = "SELECT id, monto FROM prestamos WHERE trabajador_id = $trabajador_id AND estado = 'pendiente' ORDER BY fecha ASC";
    $prestamosResult = $conn->query($prestamosQuery);
    
    $total_deuda = 0;
    while ($row = $prestamosResult->fetch_assoc()) {
        $total_deuda += floatval($row['monto']);
    }
    
    $deducciones = min($total_deuda, $subtotal);
    $total_pagado = $subtotal - $deducciones;
    $fecha_pago = date('Y-m-d');
    $metodo_pago = 'efectivo';
    
    // Construir observaciones finales
    $observaciones_final = "Pago valorado | Tasa: $tasa_cambio Bs/USD";
    if (!empty($observaciones_usuario)) {
        $observaciones_final .= " | Observaciones: $observaciones_usuario";
    }
    
    $conn->begin_transaction();
    
    try {
        // 1. Insertar el pago
        $query = "INSERT INTO nomina_pagos (
                    trabajador_id, semana_inicio, semana_fin, salario_semanal, 
                    deducciones, prestamos_pagados, total_pagado, fecha_pago, 
                    metodo_pago, observaciones
                  ) VALUES (
                    $trabajador_id, '$periodo_inicio', '$periodo_fin', $subtotal, 
                    $deducciones, $deducciones, $total_pagado, '$fecha_pago', 
                    '$metodo_pago', '$observaciones_final'
                  )";
        
        if (!$conn->query($query)) {
            throw new Exception("Error al insertar pago: " . $conn->error);
        }
        
        $pago_id = $conn->insert_id;
        
        // 2. Guardar detalle de valores
        $createTable = "CREATE TABLE IF NOT EXISTS pago_detalle_valores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pago_id INT NOT NULL,
            fecha DATE NOT NULL,
            producto VARCHAR(50) NOT NULL,
            cantidad DECIMAL(10,2) NOT NULL,
            valor_unitario DECIMAL(10,2) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL
        )";
        $conn->query($createTable);
        
        foreach ($valores as $item) {
            $fecha = $item['fecha'];
            $producto = $conn->real_escape_string($item['producto']);
            $cantidad = floatval($item['cantidad']);
            $valor = floatval($item['valor']);
            $subtotal_item = $cantidad * $valor;
            
            $insertDetalle = "INSERT INTO pago_detalle_valores (pago_id, fecha, producto, cantidad, valor_unitario, subtotal) 
                              VALUES ($pago_id, '$fecha', '$producto', $cantidad, $valor, $subtotal_item)";
            if (!$conn->query($insertDetalle)) {
                throw new Exception("Error al guardar detalle: " . $conn->error);
            }
        }
        
        // 3. Marcar préstamos como pagados
        $restante = $deducciones;
        $prestamosResult2 = $conn->query("SELECT id, monto FROM prestamos WHERE trabajador_id = $trabajador_id AND estado = 'pendiente' ORDER BY fecha ASC");
        
        while ($prestamo = $prestamosResult2->fetch_assoc()) {
            if ($restante <= 0) break;
            
            if ($restante >= $prestamo['monto']) {
                $conn->query("UPDATE prestamos SET estado = 'pagado' WHERE id = {$prestamo['id']}");
                $restante -= $prestamo['monto'];
            } else {
                $nuevo_monto = $prestamo['monto'] - $restante;
                $conn->query("UPDATE prestamos SET monto = $nuevo_monto WHERE id = {$prestamo['id']}");
                $restante = 0;
            }
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Pago registrado exitosamente',
            'pago_id' => $pago_id
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function guardarPago($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $trabajador_id = intval($input['trabajador_id']);
    $semana_inicio = $conn->real_escape_string($input['semana_inicio']);
    $semana_fin = $conn->real_escape_string($input['semana_fin']);
    $salario_semanal = floatval($input['salario_semanal']);
    $deducciones = floatval($input['deducciones']);
    $total_pagado = floatval($input['total_pagado']);
    $fecha_pago = $conn->real_escape_string($input['fecha_pago']);
    $metodo_pago = $conn->real_escape_string($input['metodo_pago'] ?? 'efectivo');
    $observaciones = $conn->real_escape_string($input['observaciones'] ?? '');
    
    // Verificar si ya existe pago para esta semana
    $check = $conn->query("SELECT id FROM nomina_pagos 
                          WHERE trabajador_id = $trabajador_id AND semana_inicio = '$semana_inicio'");
    
    if ($check->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'Esta semana ya tiene registro de pago para este trabajador']);
        exit;
    }
    
    $conn->begin_transaction();
    
    try {
        // 1. Insertar el pago
        $query = "INSERT INTO nomina_pagos (
                    trabajador_id, semana_inicio, semana_fin, salario_semanal, 
                    deducciones, prestamos_pagados, total_pagado, fecha_pago, 
                    metodo_pago, observaciones
                  ) VALUES (
                    $trabajador_id, '$semana_inicio', '$semana_fin', $salario_semanal, 
                    $deducciones, $deducciones, $total_pagado, '$fecha_pago', 
                    '$metodo_pago', '$observaciones'
                  )";
        
        if (!$conn->query($query)) {
            throw new Exception("Error al insertar pago: " . $conn->error);
        }
        
        // 2. Marcar préstamos como pagados (los más antiguos primero)
        if ($deducciones > 0) {
            $restante = $deducciones;
            
            // Obtener préstamos pendientes ordenados por fecha
            $prestamos = $conn->query("SELECT id, monto FROM prestamos 
                                       WHERE trabajador_id = $trabajador_id AND estado = 'pendiente'
                                       ORDER BY fecha ASC");
            
            while ($prestamo = $prestamos->fetch_assoc()) {
                if ($restante <= 0) break;
                
                if ($restante >= $prestamo['monto']) {
                    // Pagar préstamo completo
                    $conn->query("UPDATE prestamos SET estado = 'pagado' WHERE id = {$prestamo['id']}");
                    $restante -= $prestamo['monto'];
                } else {
                    // Pago parcial - actualizar el monto del préstamo
                    $nuevo_monto = $prestamo['monto'] - $restante;
                    $conn->query("UPDATE prestamos SET monto = $nuevo_monto WHERE id = {$prestamo['id']}");
                    $restante = 0;
                }
            }
        }
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Pago registrado correctamente']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

function eliminarPago($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    // Obtener información del pago
    $pago = $conn->query("SELECT trabajador_id, semana_inicio, prestamos_pagados 
                          FROM nomina_pagos WHERE id = $id");
    
    if (!$pago || $pago->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Pago no encontrado']);
        exit;
    }
    
    $row = $pago->fetch_assoc();
    $trabajador_id = $row['trabajador_id'];
    $semana_inicio = $row['semana_inicio'];
    $prestamos_pagados = floatval($row['prestamos_pagados']);
    
    $conn->begin_transaction();
    
    try {
        // Aquí deberías restaurar los préstamos, pero es complejo
        // Por simplicidad, solo eliminamos el pago y no restauramos préstamos
        $conn->query("DELETE FROM nomina_pagos WHERE id = $id");
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Pago eliminado correctamente']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>