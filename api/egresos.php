<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

switch ($action) {
    case 'obtener':
        obtenerEgresos($conn);
        break;
    case 'guardar':
        guardarEgreso($conn);
        break;
    case 'eliminar':
        eliminarEgreso($conn);
        break;
    case 'obtener_categorias':
        obtenerCategorias($conn);
        break;
    case 'guardar_categoria':
        guardarCategoria($conn);
        break;
    case 'actualizar_categoria':
        actualizarCategoria($conn);
        break;
    case 'eliminar_categoria':
        eliminarCategoria($conn);
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Acción no válida: ' . $action]);
        break;
}

function obtenerEgresos($conn) {
    $categoria_nombre = isset($_GET['categoria']) ? $conn->real_escape_string($_GET['categoria']) : '';
    $tipo = $_GET['tipo'] ?? '';
    
    $where = [];
    if (!empty($categoria_nombre)) {
        $where[] = "categoria = '$categoria_nombre'";
    }
    if ($tipo === 'gasto' || $tipo === 'costo') {
        $where[] = "tipo = '$tipo'";
    }
    
    $whereClause = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);
    
    $query = "SELECT * FROM egresos $whereClause ORDER BY fecha DESC, id DESC";
    $result = $conn->query($query);
    $egresos = [];
    while ($row = $result->fetch_assoc()) {
        $egresos[] = $row;
    }
    echo json_encode(['success' => true, 'datos' => $egresos]);
}

function guardarEgreso($conn) {
    $input = json_decode(file_get_contents('php://input'), true);

    $tipo = $conn->real_escape_string($input['tipo']);
    $fecha = $input['fecha'];
    $descripcion = $conn->real_escape_string($input['descripcion']);
    $monto = floatval($input['monto']);
    $categoria = isset($input['categoria']) ? $conn->real_escape_string($input['categoria']) : '';
    $metodo_pago = $conn->real_escape_string($input['metodo_pago'] ?? 'efectivo');
    $referencia = isset($input['referencia']) ? $conn->real_escape_string($input['referencia']) : null;
    $observaciones = isset($input['observaciones']) ? $conn->real_escape_string($input['observaciones']) : null;

    $categoriaValue = empty($categoria) ? 'NULL' : "'$categoria'";
    $referenciaValue = $referencia ? "'$referencia'" : 'NULL';
    $observacionesValue = $observaciones ? "'$observaciones'" : 'NULL';

    $query = "INSERT INTO egresos (tipo, fecha, descripcion, monto, categoria, metodo_pago, referencia, observaciones)
              VALUES ('$tipo', '$fecha', '$descripcion', $monto, $categoriaValue, '$metodo_pago', $referenciaValue, $observacionesValue)";

    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Egreso registrado', 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarEgreso($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    $query = "DELETE FROM egresos WHERE id = $id";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Egreso eliminado']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function obtenerCategorias($conn) {
    $tipo = $_GET['tipo'] ?? '';
    $where = $tipo ? "WHERE tipo = '$tipo' AND activo = 1" : "WHERE activo = 1";
    $query = "SELECT * FROM categorias_egresos $where ORDER BY nombre";
    $result = $conn->query($query);
    $categorias = [];
    while ($row = $result->fetch_assoc()) {
        $categorias[] = $row;
    }
    echo json_encode(['success' => true, 'categorias' => $categorias]);
}

function guardarCategoria($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = $conn->real_escape_string($input['nombre']);
    $tipo = $conn->real_escape_string($input['tipo']);
    
    $query = "INSERT INTO categorias_egresos (nombre, tipo) VALUES ('$nombre', '$tipo')";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Categoría creada', 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function actualizarCategoria($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    $nombre = $conn->real_escape_string($input['nombre']);
    
    $query = "UPDATE categorias_egresos SET nombre = '$nombre' WHERE id = $id";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Categoría actualizada']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}

function eliminarCategoria($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id']);
    
    // Verificar si hay egresos con esta categoría
    $check = $conn->query("SELECT id FROM egresos WHERE categoria = (SELECT nombre FROM categorias_egresos WHERE id = $id) LIMIT 1");
    if ($check && $check->num_rows > 0) {
        echo json_encode(['success' => false, 'error' => 'No se puede eliminar la categoría porque tiene egresos asociados']);
        return;
    }
    
    $query = "DELETE FROM categorias_egresos WHERE id = $id";
    if ($conn->query($query)) {
        echo json_encode(['success' => true, 'message' => 'Categoría eliminada']);
    } else {
        echo json_encode(['success' => false, 'error' => $conn->error]);
    }
}
?>