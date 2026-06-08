<?php
// config.php
$host = 'sql3.freesqldatabase.com';
$user = 'sql3829733';
$password = '7lYY4HAu23';
$database = 'sql3829733';

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
