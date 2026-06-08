<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function obtenerTasaDolar() {
    // Intentar obtener de la API
    $url = 'https://ve.dolarapi.com/v1/dolares';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if ($data && isset($data[0]['promedio'])) {
            return [
                'success' => true,
                'tasa' => floatval($data[0]['promedio']),
                'fuente' => 'dolarapi.com',
                'fecha' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    // Fallback: si la API falla, usar una tasa por defecto o la última guardada
    return [
        'success' => true,
        'tasa' => 400.00, // tasa por defecto
        'fuente' => 'manual (fallback)',
        'fecha' => date('Y-m-d H:i:s')
    ];
}

$resultado = obtenerTasaDolar();
echo json_encode($resultado);
?>