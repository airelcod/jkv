<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$nombre = $conn->real_escape_string($data['nombre']);
// ✅ CAMBIO: Verificar el valor, no solo si existe
$es_leche = isset($data['es_leche']) && ($data['es_leche'] === true || $data['es_leche'] === 1 || $data['es_leche'] === 'true') ? 1 : 0;

$query = "INSERT INTO productos (nombre, es_leche) VALUES ('$nombre', $es_leche)";

if ($conn->query($query)) {
    echo json_encode(['success' => true, 'message' => 'Producto creado', 'id' => $conn->insert_id]);
} else {
    echo json_encode(['success' => false, 'error' => $conn->error]);
}
?>