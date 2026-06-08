<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$nombre = $conn->real_escape_string($data['nombre']);
$ubicacion = $conn->real_escape_string($data['ubicacion'] ?? '');

$query = "INSERT INTO sucursales (nombre, ubicacion) VALUES ('$nombre', '$ubicacion')";

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Sucursal creada', 'id' => $conn->insert_id]);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>