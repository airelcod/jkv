<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$nombre = $input['nombre'] ?? '';

// En lugar de eliminar, solo desactivar el producto
$query = "UPDATE productos SET activo = 0 WHERE nombre = '$nombre'";

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Producto desactivado']);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>