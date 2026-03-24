<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php');

// 激活/冻结角色
try {
    $roleId = $_POST['roleId'] ?? '';
    $userId = $_POST['userId'] ?? '';
    $active = isset($_POST['active']) ? (int)$_POST['active'] : 1;

    if (empty($roleId) || empty($userId)) {
        echo json_encode(['code' => -2, 'msg' => '参数不全', 'success' => false]);
        exit;
    }

    // 检查角色是否属于该用户
    $checkStmt = $pdo->prepare("SELECT id FROM roles WHERE roleId = :roleId AND userId = :userId LIMIT 1");
    $checkStmt->bindParam(':roleId', $roleId);
    $checkStmt->bindParam(':userId', $userId);
    $checkStmt->execute();
    
    if (!$checkStmt->fetch()) {
        echo json_encode(['code' => -1, 'msg' => '角色不存在', 'success' => false]);
        exit;
    }

    // 如果是激活操作，先检查是否超过可激活数量
    if ($active === 1) {
        // TODO: 后续根据多角色激活功能开放限制
    }

    // 更新状态
    $updateStmt = $pdo->prepare("UPDATE roles SET is_active = :active WHERE roleId = :roleId AND userId = :userId");
    $updateStmt->bindParam(':active', $active);
    $updateStmt->bindParam(':roleId', $roleId);
    $updateStmt->bindParam(':userId', $userId);
    $updateStmt->execute();

    $msg = $active === 1 ? '激活成功' : '冻结成功';
    echo json_encode(['code' => 0, 'msg' => $msg, 'success' => true]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '操作失败：' . $e->getMessage(), 'success' => false]);
}
?>
