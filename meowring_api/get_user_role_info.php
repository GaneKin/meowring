<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

$userId = $_POST['userId'] ?? '';

if (!$userId) {
    echo json_encode(['code' => -1, 'msg' => '缺少用户ID']);
    exit;
}

try {
    // 查询用户角色数和栏位数
    $sql = "SELECT role_count, role_slots FROM users WHERE userId = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        // 如果role_count为空，查询实际角色数
        $roleCount = $user['role_count'];
        if ($roleCount === null || $roleCount === '') {
            $countSql = "SELECT COUNT(*) as cnt FROM roles WHERE userId = ?";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute([$userId]);
            $roleCount = $countStmt->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0;
        }
        
        echo json_encode([
            'code' => 0,
            'msg' => '查询成功',
            'roleCount' => intval($roleCount),
            'slotCount' => intval($user['role_slots']) ?: 3
        ]);
    } else {
        echo json_encode(['code' => -2, 'msg' => '用户不存在', 'roleCount' => 0, 'slotCount' => 3]);
    }
} catch (Exception $e) {
    echo json_encode(['code' => -3, 'msg' => $e->getMessage(), 'roleCount' => 0, 'slotCount' => 3]);
}
