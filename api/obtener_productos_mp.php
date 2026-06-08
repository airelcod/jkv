<?php
header('Content-Type: application/json');
require_once 'config.php';

$query = "SELECT id, nombre, es_leche, activo FROM productos ORDER BY nombre";
$result = $conn->query($query);
$productos = [];

while ($row = $result->fetch_assoc()) {
    // Si no existe el campo activo, asumir que está activo (1)
    if (!isset($row['activo'])) {
        $row['activo'] = 1;
    }
    $productos[] = $row;
}

echo json_encode(['success' => true, 'productos' => $productos]);
?>