<?php
header('Content-Type: application/json');
require_once 'config.php';

$query = "SELECT id, nombre, es_leche FROM productos WHERE activo = 1 ORDER BY nombre";
$result = $conn->query($query);
$productos = [];

while ($row = $result->fetch_assoc()) {
    $productos[] = $row;
}

echo json_encode(['success' => true, 'productos' => $productos]);
?>