<?php
header('Content-Type: application/json');
require_once 'config.php';

$sql = "SELECT id, nombre, cargo FROM trabajadores WHERE activo = 1 ORDER BY nombre";
$result = $conn->query($sql);

$trabajadores = [];
while ($row = $result->fetch_assoc()) {
    $trabajadores[] = $row;
}

echo json_encode(['success' => true, 'trabajadores' => $trabajadores]);
?>