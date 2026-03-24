<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $get = $method === 'GET' ? $_GET : $_POST;
    
    $roleId = $get['roleId'] ?? '';
    $userId = $get['userId'] ?? '';
    
    if (empty($roleId) || empty($userId)) {
        echo json_encode(['code' => -1, 'msg' => '参数不全']);
        exit;
    }
    
    // 检查角色是否存在且属于该用户
    $stmt = $pdo->prepare("SELECT roleId, name FROM roles WHERE roleId = ? AND userId = ?");
    $stmt->execute([$roleId, $userId]);
    $role = $stmt->fetch();
    
    if (!$role) {
        echo json_encode(['code' => -2, 'msg' => '角色不存在或无权删除']);
        exit;
    }
    
    $roleName = $role['name'];
    
    // 删除角色
    $delete = $pdo->prepare("DELETE FROM roles WHERE roleId = ? AND userId = ?");
    $delete->execute([$roleId, $userId]);
    
    // 更新用户角色数量
    $update = $pdo->prepare("UPDATE users SET role_count = role_count - 1 WHERE userId = ? AND role_count > 0");
    $update->execute([$userId]);
    
    echo json_encode([
        'code' => 0,
        'msg' => '删除成功',
        'roleName' => $roleName
    ]);
    
} catch (Exception $e) {
    echo json_encode(['code' => -99, 'msg' => $e->getMessage()]);
}
