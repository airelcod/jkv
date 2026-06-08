<?php
// config.php
$host = 'sql100.infinityfree.com';
$user = 'if0_41672003';
$password = '0tFI5TSKBFq2LoB';
$database = 'if0_41672003_jkv';

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

$conn->set_charset("utf8");

// Iniciar sesión aquí también
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>