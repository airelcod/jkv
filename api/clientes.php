<?php
// db/clientes.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// HABILITAR DEPURACIÓN PARA VER ERRORES
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';  // Usar __DIR__ para ruta absoluta

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($action === 'obtener_todos') {
        // Verificar si la tabla clientes tiene la columna activo
        $checkColumn = $conn->query("SHOW COLUMNS FROM clientes LIKE 'activo'");
        if ($checkColumn && $checkColumn->num_rows > 0) {
            $sql = "SELECT id, nombre, rif, telefono, contacto, email, direccion FROM clientes WHERE activo = 1 ORDER BY nombre ASC";
        } else {
            $sql = "SELECT id, nombre, rif, telefono, contacto, email, direccion FROM clientes ORDER BY nombre ASC";
        }
        
        $result = $conn->query($sql);
        
        if (!$result) {
            echo json_encode(['success' => false, 'error' => 'Error en consulta: ' . $conn->error]);
            exit;
        }
        
        $clientes = [];
        while ($row = $result->fetch_assoc()) {
            $clientes[] = $row;
        }
        echo json_encode(['success' => true, 'clientes' => $clientes]);
        exit;
    }
    
    if ($action === 'obtener_uno' && $id > 0) {
        // Verificar si la tabla clientes tiene la columna activo
        $checkColumn = $conn->query("SHOW COLUMNS FROM clientes LIKE 'activo'");
        if ($checkColumn && $checkColumn->num_rows > 0) {
            $sql = "SELECT * FROM clientes WHERE id = $id AND activo = 1";
        } else {
            $sql = "SELECT * FROM clientes WHERE id = $id";
        }
        
        $result = $conn->query($sql);
        
        if (!$result) {
            echo json_encode(['success' => false, 'error' => 'Error en consulta: ' . $conn->error]);
            exit;
        }
        
        if ($result->num_rows > 0) {
            $cliente = $result->fetch_assoc();
            echo json_encode(['success' => true, 'cliente' => $cliente]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Cliente no encontrado']);
        }
        exit;
    }
    
    // Si no hay acción válida
    echo json_encode(['success' => false, 'error' => 'Acción GET no válida: ' . $action]);
    exit;
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    $action = $data['action'] ?? '';

    if ($action === 'guardar') {
        $nombre = isset($data['nombre']) ? $conn->real_escape_string(trim($data['nombre'])) : '';
        $rif = isset($data['rif']) ? $conn->real_escape_string($data['rif']) : '';
        $telefono = isset($data['telefono']) ? $conn->real_escape_string($data['telefono']) : '';
        $contacto = isset($data['contacto']) ? $conn->real_escape_string($data['contacto']) : '';
        $email = isset($data['email']) ? $conn->real_escape_string($data['email']) : '';
        $direccion = isset($data['direccion']) ? $conn->real_escape_string($data['direccion']) : '';

        if (empty($nombre)) {
            echo json_encode(['success' => false, 'error' => 'El nombre del cliente es requerido']);
            exit;
        }

        // Verificar si la columna activo existe
        $checkColumn = $conn->query("SHOW COLUMNS FROM clientes LIKE 'activo'");
        if ($checkColumn && $checkColumn->num_rows > 0) {
            $sql = "INSERT INTO clientes (nombre, rif, telefono, contacto, email, direccion, activo) 
                    VALUES ('$nombre', '$rif', '$telefono', '$contacto', '$email', '$direccion', 1)";
        } else {
            $sql = "INSERT INTO clientes (nombre, rif, telefono, contacto, email, direccion) 
                    VALUES ('$nombre', '$rif', '$telefono', '$contacto', '$email', '$direccion')";
        }
        
        if ($conn->query($sql)) {
            $newId = $conn->insert_id;
            echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Cliente creado correctamente']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error al guardar: ' . $conn->error]);
        }
        exit;
    }

    if ($action === 'actualizar') {
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $nombre = isset($data['nombre']) ? $conn->real_escape_string(trim($data['nombre'])) : '';
        $rif = isset($data['rif']) ? $conn->real_escape_string($data['rif']) : '';
        $telefono = isset($data['telefono']) ? $conn->real_escape_string($data['telefono']) : '';
        $contacto = isset($data['contacto']) ? $conn->real_escape_string($data['contacto']) : '';
        $email = isset($data['email']) ? $conn->real_escape_string($data['email']) : '';
        $direccion = isset($data['direccion']) ? $conn->real_escape_string($data['direccion']) : '';

        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'ID de cliente inválido']);
            exit;
        }

        if (empty($nombre)) {
            echo json_encode(['success' => false, 'error' => 'El nombre del cliente es requerido']);
            exit;
        }

        $sql = "UPDATE clientes SET 
                nombre = '$nombre', 
                rif = '$rif', 
                telefono = '$telefono', 
                contacto = '$contacto', 
                email = '$email', 
                direccion = '$direccion' 
                WHERE id = $id";
        
        if ($conn->query($sql)) {
            echo json_encode(['success' => true, 'message' => 'Cliente actualizado correctamente']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error al actualizar: ' . $conn->error]);
        }
        exit;
    }

    if ($action === 'eliminar') {
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'ID de cliente inválido']);
            exit;
        }
        
        // Verificar si la columna activo existe
        $checkColumn = $conn->query("SHOW COLUMNS FROM clientes LIKE 'activo'");
        if ($checkColumn && $checkColumn->num_rows > 0) {
            $sql = "UPDATE clientes SET activo = 0 WHERE id = $id";
        } else {
            // Si no existe activo, verificar si el cliente tiene ventas asociadas
            $checkVentas = $conn->query("SELECT COUNT(*) as total FROM ventas WHERE cliente_id = $id");
            $ventasCount = $checkVentas->fetch_assoc()['total'];
            
            if ($ventasCount > 0) {
                echo json_encode(['success' => false, 'error' => 'No se puede eliminar el cliente porque tiene ventas asociadas']);
                exit;
            }
            $sql = "DELETE FROM clientes WHERE id = $id";
        }
        
        if ($conn->query($sql)) {
            echo json_encode(['success' => true, 'message' => 'Cliente eliminado correctamente']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error al eliminar: ' . $conn->error]);
        }
        exit;
    }
    
    echo json_encode(['success' => false, 'error' => 'Acción POST no válida: ' . $action]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Método no soportado']);
$conn->close();
?>