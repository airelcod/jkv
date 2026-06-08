<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

switch($action) {
    case 'obtener_deuda':
        obtenerDeudaProveedor($conn);
        break;
    case 'obtener_historial':
        obtenerHistorialPagos($conn);
        break;
    case 'registrar_pago':
        registrarPago($conn);
        break;
    case 'eliminar_pago':
        eliminarPago($conn);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
        break;
}

function obtenerDeudaProveedor($conn) {
    $proveedor_id = intval($_GET['proveedor_id'] ?? 0);
    if (!$proveedor_id) {
        echo json_encode(['success' => false, 'error' => 'ID de proveedor requerido']);
        return;
    }
    
    $query = "SELECT COALESCE(SUM(monto), 0) as deuda 
              FROM deudas_proveedores 
              WHERE proveedor_id = $proveedor_id AND estado = 'pendiente'";
    $result = $conn->query($query);
    $deuda = 0;
    if ($result && $row = $result->fetch_assoc()) {
        $deuda = floatval($row['deuda']);
    }
    
    echo json_encode(['success' => true, 'deuda' => $deuda]);
}

function obtenerHistorialPagos($conn) {
    $proveedor_id = intval($_GET['proveedor_id'] ?? 0);
    if (!$proveedor_id) {
        echo json_encode(['success' => false, 'error' => 'ID de proveedor requerido']);
        return;
    }
    
    $query = "SELECT * FROM pagos_proveedores 
              WHERE proveedor_id = $proveedor_id 
              ORDER BY fecha_pago DESC";
    $result = $conn->query($query);
    $pagos = [];
    while ($row = $result->fetch_assoc()) {
        $pagos[] = $row;
    }
    
    echo json_encode(['success' => true, 'pagos' => $pagos]);
}

function registrarPago($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $proveedor_id = intval($input['proveedor_id']);
    $semana_inicio = $conn->real_escape_string($input['semana_inicio']);
    $semana_fin = $conn->real_escape_string($input['semana_fin']);
    $total_leche = floatval($input['total_leche']);
    $costo_total = floatval($input['costo_total']);
    $deducciones = floatval($input['deducciones']);
    $monto_pagado = floatval($input['monto_pagado']);
    $fecha_pago = $conn->real_escape_string($input['fecha_pago']);
    $metodo_pago = $conn->real_escape_string($input['metodo_pago'] ?? 'efectivo');
    $observaciones = $conn->real_escape_string($input['observaciones'] ?? '');
    $adelantos_ids = isset($input['adelantos_ids']) && !empty($input['adelantos_ids']) ? $conn->real_escape_string($input['adelantos_ids']) : null;
    
    // Obtener nombre del proveedor
    $provQuery = "SELECT nombre FROM proveedores WHERE id = $proveedor_id";
    $provResult = $conn->query($provQuery);
    $proveedor_nombre = '';
    if ($provResult && $row = $provResult->fetch_assoc()) {
        $proveedor_nombre = $row['nombre'];
    }
    
    $conn->begin_transaction();
    
    try {
        // 1. Insertar el pago (incluyendo adelantos_ids)
        $query = "INSERT INTO pagos_proveedores (
                    proveedor_id, semana_inicio, semana_fin, total_leche, costo_total,
                    deducciones, monto_pagado, fecha_pago, metodo_pago, observaciones, adelantos_ids
                  ) VALUES (
                    $proveedor_id, '$semana_inicio', '$semana_fin', $total_leche, $costo_total,
                    $deducciones, $monto_pagado, '$fecha_pago', '$metodo_pago', '$observaciones', " . ($adelantos_ids ? "'$adelantos_ids'" : "NULL") . "
                  )";
        
        if (!$conn->query($query)) {
            throw new Exception("Error al insertar pago: " . $conn->error);
        }
        
        $pago_id = $conn->insert_id;
        
        // 2. Marcar las recepciones de esa semana como pagadas
        $updateMP = "UPDATE materia_prima 
                     SET pagado = 1 
                     WHERE proveedor_id = $proveedor_id 
                     AND fecha BETWEEN '$semana_inicio' AND '$semana_fin' 
                     AND (pagado = 0 OR pagado IS NULL)";
        $conn->query($updateMP);
        
        // 3. Actualizar la cuenta por pagar
        $updateCuenta = "UPDATE cuentas_pagar 
                         SET monto_pagado = $costo_total, 
                             estado = 'pagado' 
                         WHERE descripcion LIKE '%$proveedor_nombre%' 
                         AND fecha_inicio = '$semana_inicio'
                         AND oculto = 0";
        $conn->query($updateCuenta);
        
        // 4. Marcar adelantos como aplicados
        if ($adelantos_ids) {
            $ids = explode(',', $adelantos_ids);
            foreach ($ids as $id) {
                $id = intval($id);
                if ($id > 0) {
                    $conn->query("UPDATE adelantos_proveedores SET estado = 'aplicado' WHERE id = $id");
                }
            }
        }
        
        // 5. Descontar de deudas de proveedores (préstamos)
        if ($deducciones > 0) {
            $restante = $deducciones;
            $deudas = $conn->query("SELECT id, monto FROM deudas_proveedores 
                                    WHERE proveedor_id = $proveedor_id AND estado = 'pendiente'
                                    ORDER BY fecha ASC");
            
            while ($deuda = $deudas->fetch_assoc()) {
                if ($restante <= 0) break;
                
                if ($restante >= $deuda['monto']) {
                    $conn->query("UPDATE deudas_proveedores SET estado = 'pagado' WHERE id = {$deuda['id']}");
                    $restante -= $deuda['monto'];
                } else {
                    $nuevo_monto = $deuda['monto'] - $restante;
                    $conn->query("UPDATE deudas_proveedores SET monto = $nuevo_monto WHERE id = {$deuda['id']}");
                    $restante = 0;
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

function eliminarPago($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    $conn->begin_transaction();
    
    try {
        // Obtener info del pago
        $pago = $conn->query("SELECT proveedor_id, semana_inicio, semana_fin, adelantos_ids 
                              FROM pagos_proveedores WHERE id = $id");
        
        if (!$pago || $pago->num_rows === 0) {
            throw new Exception("Pago no encontrado");
        }
        
        $row = $pago->fetch_assoc();
        $proveedor_id = $row['proveedor_id'];
        $semana_inicio = $row['semana_inicio'];
        $semana_fin = $row['semana_fin'];
        $adelantos_ids = $row['adelantos_ids'];
        
        // Marcar recepciones como no pagadas
        $conn->query("UPDATE materia_prima SET pagado = 0 
                      WHERE proveedor_id = $proveedor_id 
                      AND fecha BETWEEN '$semana_inicio' AND '$semana_fin'");
        
        // Restaurar adelantos como pendientes
        if ($adelantos_ids) {
            $ids = explode(',', $adelantos_ids);
            foreach ($ids as $aid) {
                $aid = intval($aid);
                if ($aid > 0) {
                    $conn->query("UPDATE adelantos_proveedores SET estado = 'pendiente' WHERE id = $aid");
                }
            }
        }
        
        // Eliminar el pago
        $conn->query("DELETE FROM pagos_proveedores WHERE id = $id");
        
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Pago eliminado']);
        
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>