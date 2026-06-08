<?php
header('Content-Type: application/json');
require_once 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$email = $conn->real_escape_string($data['email']);
$password = $data['password'];

$query = "SELECT * FROM usuarios WHERE email = '$email'";
$result = $conn->query($query);

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    if (password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_nombre'] = $user['nombre'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_rol'] = $user['rol'];
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'nombre' => $user['nombre'],
                'email' => $user['email'],
                'rol' => $user['rol']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Contraseña incorrecta']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Usuario no encontrado']);
}
?>
