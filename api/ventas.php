<?php
// db/ventas.php - CON SUCURSAL
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Para POST, leer action del JSON
$action = '';
$data = [];

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    $action = isset($data['action']) ? $data['action'] : '';
}

// Para GET, leer de la URL
if ($method === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
}

// Si no hay acción, buscar en $_POST
if (empty($action)) {
    $action = isset($_POST['action']) ? $_POST['action'] : '';
}

// DEPURACIÓN: Registrar la acción detectada
error_log("=== VENTAS.PHP DEBUG ===");
error_log("Method: $method");
error_log("Action detectada: '$action'");

if ($method === 'GET') {
    if ($action === 'obtener_por_cliente') {
        $cliente_id = isset($_GET['cliente_id']) ? intval($_GET['cliente_id']) : 0;

        if ($cliente_id > 0) {
            $sql = "SELECT v.*, 
                           s.nombre as sucursal_nombre,
                           (SELECT SUM(vd.cantidad * vd.precio_unitario) FROM ventas_detalle vd WHERE vd.venta_id = v.id) as total_calculado
                    FROM ventas v 
                    LEFT JOIN sucursales s ON v.sucursal_id = s.id
                    WHERE v.cliente_id = $cliente_id
                    ORDER BY v.fecha DESC, v.id DESC";
            $result = $conn->query($sql);

            $ventas = [];
            while ($row = $result->fetch_assoc()) {
                $ventas[] = $row;
            }

            echo json_encode(['success' => true, 'ventas' => $ventas]);
        } else {
            echo json_encode(['success' => false, 'error' => 'ID de cliente inválido']);
        }
        exit;
    }
    
    if ($action === 'obtener') {
        // MODIFICADO: JOIN con clientes y sucursales
        $sql = "SELECT v.*, 
                       c.nombre as cliente_nombre, 
                       c.rif as cliente_rif, 
                       c.telefono as cliente_telefono, 
                       c.contacto as cliente_contacto, 
                       c.email as cliente_email, 
                       c.direccion as cliente_direccion,
                       s.id as sucursal_id,
                       s.nombre as sucursal_nombre,
                       (SELECT SUM(vd.cantidad * vd.precio_unitario) FROM ventas_detalle vd WHERE vd.venta_id = v.id) as total_calculado
                FROM ventas v 
                JOIN clientes c ON v.cliente_id = c.id
                LEFT JOIN sucursales s ON v.sucursal_id = s.id
                ORDER BY v.fecha DESC, v.id DESC";
        $result = $conn->query($sql);
        
        $ventas = [];
        while ($row = $result->fetch_assoc()) {
            // Reorganizar el array para que sea compatible con el frontend actual
            $ventaFormateada = [
                'id' => $row['id'],
                'cliente' => $row['cliente_nombre'],
                'rif' => $row['cliente_rif'],
                'telefono' => $row['cliente_telefono'],
                'contacto' => $row['cliente_contacto'],
                'email' => $row['cliente_email'],
                'direccion' => $row['cliente_direccion'],
                'fecha' => $row['fecha'],
                'metodo_pago' => $row['metodo_pago'],
                'tiene_descuento' => $row['tiene_descuento'],
                'descuento_porcentaje' => $row['descuento_porcentaje'],
                'descuento_monto' => $row['descuento_monto'],
                'es_credito' => $row['es_credito'],
                'subtotal' => $row['subtotal'],
                'total' => $row['total'],
                'observaciones' => $row['observaciones'],
                'created_at' => $row['created_at'],
                'sucursal_id' => $row['sucursal_id'],
                'sucursal_nombre' => $row['sucursal_nombre']
            ];
            $ventas[] = $ventaFormateada;
        }
        
        echo json_encode(['success' => true, 'ventas' => $ventas]);
        exit;
    }
    
    if ($action === 'obtener_detalle') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        if ($id > 0) {
            // MODIFICADO: JOIN con clientes y sucursales
            $sql = "SELECT v.*, 
                           c.nombre as cliente_nombre, 
                           c.rif as cliente_rif, 
                           c.telefono as cliente_telefono, 
                           c.contacto as cliente_contacto, 
                           c.email as cliente_email, 
                           c.direccion as cliente_direccion,
                           s.id as sucursal_id,
                           s.nombre as sucursal_nombre,
                           vd.*, 
                           p.nombre as producto_nombre, 
                           p.es_leche 
                    FROM ventas v 
                    JOIN clientes c ON v.cliente_id = c.id
                    LEFT JOIN sucursales s ON v.sucursal_id = s.id
                    JOIN ventas_detalle vd ON v.id = vd.venta_id 
                    LEFT JOIN productos p ON vd.producto_id = p.id 
                    WHERE v.id = $id";
            $result = $conn->query($sql);
            
            $detalles = [];
            $ventaData = null;
            
            while ($row = $result->fetch_assoc()) {
                if (!$ventaData) {
                    $ventaData = [
                        'venta_id' => $row['id'],
                        'cliente' => $row['cliente_nombre'],
                        'rif' => $row['cliente_rif'],
                        'telefono' => $row['cliente_telefono'],
                        'contacto' => $row['cliente_contacto'],
                        'email' => $row['cliente_email'],
                        'direccion' => $row['cliente_direccion'],
                        'fecha' => $row['fecha'],
                        'metodo_pago' => $row['metodo_pago'],
                        'tiene_descuento' => $row['tiene_descuento'],
                        'descuento_porcentaje' => $row['descuento_porcentaje'],
                        'descuento_monto' => $row['descuento_monto'],
                        'es_credito' => $row['es_credito'],
                        'subtotal' => $row['subtotal'],
                        'total' => $row['total'],
                        'observaciones' => $row['observaciones'],
                        'sucursal_id' => $row['sucursal_id'],
                        'sucursal_nombre' => $row['sucursal_nombre']
                    ];
                }
                
                $detalles[] = [
                    'id' => $row['id'],
                    'venta_id' => $row['venta_id'],
                    'producto_id' => $row['producto_id'],
                    'producto_nombre' => $row['producto_nombre'],
                    'es_leche' => $row['es_leche'],
                    'cantidad' => $row['cantidad'],
                    'piezas' => $row['piezas'],
                    'precio_unitario' => $row['precio_unitario']
                ];
            }
            
            echo json_encode(['success' => true, 'venta' => $ventaData, 'detalles' => $detalles]);
        } else {
            echo json_encode(['success' => false, 'error' => 'ID inválido']);
        }
        exit;
    }
}

if ($method === 'POST') {
    if ($action === 'guardar') {
        $conn->begin_transaction();
        
        try {
            // Validar datos requeridos
            if (empty($data['cliente_id'])) {
                throw new Exception('El ID del cliente es requerido');
            }
            if (empty($data['productos']) || count($data['productos']) == 0) {
                throw new Exception('Debe agregar al menos un producto');
            }
            
            $cliente_id = intval($data['cliente_id']);
            $sucursal_id = isset($data['sucursal_id']) && !empty($data['sucursal_id']) ? intval($data['sucursal_id']) : 'NULL';
            $fecha = $conn->real_escape_string($data['fecha']);
            $metodo_pago = $conn->real_escape_string($data['metodo_pago']);
            $tiene_descuento = isset($data['tiene_descuento']) && $data['tiene_descuento'] ? 1 : 0;
            $descuento_porcentaje = isset($data['descuento_porcentaje']) ? floatval($data['descuento_porcentaje']) : 0;
            $descuento_monto = isset($data['descuento_monto']) ? floatval($data['descuento_monto']) : 0;
            $es_credito = isset($data['es_credito']) && $data['es_credito'] ? 1 : 0;
            $observaciones = isset($data['observaciones']) ? $conn->real_escape_string($data['observaciones']) : '';
            $subtotal = isset($data['subtotal']) ? floatval($data['subtotal']) : 0;
            $total = isset($data['total']) ? floatval($data['total']) : 0;
            
            // Insertar venta CON sucursal
            $sucursal_sql = ($sucursal_id === 'NULL') ? 'NULL' : $sucursal_id;
            $sql = "INSERT INTO ventas (cliente_id, sucursal_id, fecha, metodo_pago, tiene_descuento, 
                    descuento_porcentaje, descuento_monto, es_credito, subtotal, total, observaciones) 
                    VALUES ($cliente_id, $sucursal_sql, '$fecha', '$metodo_pago', $tiene_descuento, 
                    $descuento_porcentaje, $descuento_monto, $es_credito, $subtotal, $total, '$observaciones')";
            
            if (!$conn->query($sql)) {
                throw new Exception('Error al guardar venta: ' . $conn->error);
            }
            
            $venta_id = $conn->insert_id;
            
            // Insertar productos
            foreach ($data['productos'] as $producto) {
                $producto_id = intval($producto['id']);
                $cantidad = floatval($producto['cantidad']);
                $piezas = isset($producto['piezas']) ? intval($producto['piezas']) : 0;
                $precio_unitario = floatval($producto['precio_unitario']);

                $query = "INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, piezas, precio_unitario) 
                          VALUES ($venta_id, $producto_id, $cantidad, $piezas, $precio_unitario)";
                if (!$conn->query($query)) {
                    throw new Exception('Error al insertar detalle: ' . $conn->error);
                }
            }
            
            // Si es crédito, agregar a cuentas por cobrar
            if ($es_credito == 1) {
                $sqlCliente = "SELECT nombre FROM clientes WHERE id = $cliente_id";
                $resultCliente = $conn->query($sqlCliente);
                $clienteNombre = '';
                if ($resultCliente && $resultCliente->num_rows > 0) {
                    $rowCliente = $resultCliente->fetch_assoc();
                    $clienteNombre = $rowCliente['nombre'];
                }
                
                $fecha_vencimiento = date('Y-m-d', strtotime($fecha . ' + 7 days'));
                $descripcion_cuenta = "Venta a crédito - Cliente: " . $conn->real_escape_string($clienteNombre);
                
                $sql_cuenta = "INSERT INTO cuentas_cobrar (descripcion, monto, fecha_inicio, fecha_vencimiento, estado, venta_id, monto_original, monto_cobrado) 
                               VALUES ('$descripcion_cuenta', $total, '$fecha', '$fecha_vencimiento', 'pendiente', $venta_id, $total, 0)";
                
                if (!$conn->query($sql_cuenta)) {
                    error_log("Error al guardar en cuentas_cobrar: " . $conn->error);
                }
            }
            
            $conn->commit();
            
            // Obtener la venta completa con datos del cliente y sucursal
            $sql_venta = "SELECT v.*, c.nombre as cliente_nombre, c.rif, c.telefono, c.contacto, c.email, c.direccion,
                                 s.nombre as sucursal_nombre
                          FROM ventas v 
                          JOIN clientes c ON v.cliente_id = c.id 
                          LEFT JOIN sucursales s ON v.sucursal_id = s.id
                          WHERE v.id = $venta_id";
            $result = $conn->query($sql_venta);
            $venta = $result->fetch_assoc();
            
            if (isset($venta['cliente_nombre'])) {
                $venta['cliente'] = $venta['cliente_nombre'];
                unset($venta['cliente_nombre']);
            }
            
            $sql_detalles = "SELECT vd.*, COALESCE(p.nombre, 'Producto') as producto_nombre, COALESCE(p.es_leche, 0) as es_leche 
                             FROM ventas_detalle vd 
                             LEFT JOIN productos p ON vd.producto_id = p.id 
                             WHERE vd.venta_id = $venta_id";
            $result_detalles = $conn->query($sql_detalles);
            $detalles = [];
            while ($row = $result_detalles->fetch_assoc()) {
                $detalles[] = $row;
            }
            
            echo json_encode([
                'success' => true, 
                'venta_id' => $venta_id,
                'venta' => $venta,
                'detalles' => $detalles
            ]);
            
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'eliminar') {
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id > 0) {
            $conn->begin_transaction();
            try {
                $conn->query("DELETE FROM cuentas_cobrar WHERE venta_id = $id");
                $conn->query("DELETE FROM ventas_detalle WHERE venta_id = $id");
                $conn->query("DELETE FROM ventas WHERE id = $id");
                $conn->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'ID inválido']);
        }
        exit;
    }
}

echo json_encode(['success' => false, 'error' => "Acción no válida: '$action' - Method: $method"]);
$conn->close();
?>