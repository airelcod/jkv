<?php
require_once 'config.php';

$tipo = $_GET['tipo'] ?? '';
$nombre = $_GET['nombre'] ?? '';

if ($tipo === 'sucursal') {
    $filename = "export_sucursal_{$nombre}_" . date('Y-m-d') . ".csv";
    $query = "SELECT * FROM produccion_diaria WHERE sucursal = '$nombre' ORDER BY fecha";
} else {
    die('Tipo no soportado');
}

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="' . $filename . '"');

$output = fopen('php://output', 'w');
fputcsv($output, ['id', 'fecha', 'sucursal', 'tipo_producto', 'peso_kg', 'piezas', 'created_at']);

$result = $conn->query($query);
while ($row = $result->fetch_assoc()) {
    fputcsv($output, $row);
}

fclose($output);
?>