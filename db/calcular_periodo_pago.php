<?php
require_once 'config.php';

$trabajador_id = intval($_GET['trabajador_id']);

// Obtener día de corte y último pago
$sql = "SELECT dia_corte, ultimo_pago_fecha FROM trabajadores WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $trabajador_id);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$diaCorte = $row['dia_corte'] ?? 4; // 4 = Miércoles por defecto
$ultimoPago = $row['ultimo_pago_fecha'];

// Mapeo de números de día a nombre (ISO: 1=Lunes...7=Domingo)
$diaCorteMap = [
    1 => 'Monday',
    2 => 'Tuesday', 
    3 => 'Wednesday',
    4 => 'Thursday',
    5 => 'Friday',
    6 => 'Saturday',
    7 => 'Sunday'
];

// Si no hay último pago, usar el inicio del mes actual o fecha de contratación
if (empty($ultimoPago) || $ultimoPago === '0000-00-00') {
    // Buscar el primer día de corte anterior a hoy
    $hoy = new DateTime();
    $nombreDiaCorte = $diaCorteMap[$diaCorte];
    $primerCorte = clone $hoy;
    $primerCorte->modify("previous $nombreDiaCorte");
    
    // Si el corte es hoy, usar hoy como inicio del período
    if ($primerCorte->format('Y-m-d') === $hoy->format('Y-m-d')) {
        $inicio = clone $hoy;
    } else {
        $inicio = clone $primerCorte;
        $inicio->modify('+1 day');
    }
} else {
    // Calcular desde el último pago
    $inicio = new DateTime($ultimoPago);
    $inicio->modify('+1 day');
}

// Calcular fecha fin (día de corte después del inicio)
$nombreDiaCorte = $diaCorteMap[$diaCorte];
$fin = clone $inicio;
$fin->modify("next $nombreDiaCorte");

// Ajustar: Si el inicio ES el día de corte, el fin es el mismo día
$esDiaCorte = ($inicio->format('N') == $diaCorte);
if ($esDiaCorte) {
    $fin = clone $inicio;
}

// Validar que el período tenga al menos 1 día
if ($fin < $inicio) {
    $fin = clone $inicio;
    $fin->modify("+6 days"); // fallback a semana por defecto
}

echo json_encode([
    'success' => true,
    'inicio' => $inicio->format('Y-m-d'),
    'fin' => $fin->format('Y-m-d'),
    'dia_corte' => $diaCorte,
    'dia_corte_nombre' => $diaCorteMap[$diaCorte]
]);
?>