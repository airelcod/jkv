<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$nombre = $input['nombre'] ?? '';

if ($action === 'eliminar_sucursal') {
    $query = "DELETE FROM sucursales WHERE nombre = '$nombre'";
} elseif ($action === 'eliminar_producto') {
    $query = "DELETE FROM productos WHERE nombre = '$nombre'";
} else {
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    exit;
}

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Eliminado correctamente']);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>