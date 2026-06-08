<?php
header('Content-Type: application/json');
require_once 'config.php';

// Obtener parámetros
$fecha = $_GET['fecha'] ?? date('Y-m-d');
$diaCorte = intval($_GET['dia_corte'] ?? 2);

// Validar día de corte (1=Domingo, 2=Lunes, 3=Martes, 4=Miércoles, 5=Jueves, 6=Viernes, 7=Sábado)
if ($diaCorte < 1 || $diaCorte > 7) {
    $diaCorte = 2; // Default: Lunes
}

try {
    $fechaObj = new DateTime($fecha);
    $fechaObj->setTime(12, 0, 0);
    
    // Convertir día de corte al formato de PHP (1=Lunes, 7=Domingo)
    // Mapeo: 1(Domingo)->7, 2(Lunes)->1, 3(Martes)->2, 4(Miércoles)->3, 5(Jueves)->4, 6(Viernes)->5, 7(Sábado)->6
    $mapaDias = [1 => 7, 2 => 1, 3 => 2, 4 => 3, 5 => 4, 6 => 5, 7 => 6];
    $diaCortePHP = $mapaDias[$diaCorte];
    
    // Buscar el día de corte más reciente (hacia atrás)
    $finPeriodo = clone $fechaObj;
    $diaSemanaActual = (int)$finPeriodo->format('N'); // 1=Lunes, 7=Domingo
    
    // Si hoy es después del día de corte, avanzar hasta encontrarlo
    while ($diaSemanaActual != $diaCortePHP) {
        $finPeriodo->modify('-1 day');
        $diaSemanaActual = (int)$finPeriodo->format('N');
    }
    
    // El inicio es 6 días antes
    $inicioPeriodo = clone $finPeriodo;
    $inicioPeriodo->modify('-6 days');
    
    echo json_encode([
        'success' => true,
        'inicio' => $inicioPeriodo->format('Y-m-d'),
        'fin' => $finPeriodo->format('Y-m-d'),
        'dia_corte' => $diaCorte,
        'fecha_actual' => $fecha
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Error al calcular período: ' . $e->getMessage()
    ]);
}
?>