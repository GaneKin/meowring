<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    $userId = $_POST['userId'] ?? '';
    $amount = isset($_POST['amount']) ? (int)$_POST['amount'] : 0;
    $reason = $_POST['reason'] ?? '消费';

    if (empty($userId) || $amount <= 0) {
        echo json_encode(['code' => -2, 'msg' => '参数不全或金额无效', 'success' => false]);
        exit;
    }

    // 查询当前余额
    $stmt = $pdo->prepare("SELECT maobing FROM users WHERE userId = :userId LIMIT 1");
    $stmt->bindParam(':userId', $userId);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        echo json_encode(['code' => -1, 'msg' => '用户不存在', 'success' => false]);
        exit;
    }

    $currentMaobing = (int)$result['maobing'];

    // 检查余额是否足够
    if ($currentMaobing < $amount) {
        echo json_encode([
            'code' => -3, 
            'msg' => '猫饼不足', 
            'success' => false,
            'current' => $currentMaobing,
            'required' => $amount
        ]);
        exit;
    }

    // 扣除猫饼
    $newMaobing = $currentMaobing - $amount;
    $updateStmt = $pdo->prepare("UPDATE users SET maobing = :maobing WHERE userId = :userId");
    $updateStmt->bindParam(':maobing', $newMaobing);
    $updateStmt->bindParam(':userId', $userId);
    $updateStmt->execute();

    // 记录消费日志
    $logStmt = $pdo->prepare("INSERT INTO maobing_consume_log (userId, amount, reason, remaining, consumed_at) VALUES (:userId, :amount, :reason, :remaining, NOW())");
    $logStmt->bindParam(':userId', $userId);
    $logStmt->bindParam(':amount', $amount);
    $logStmt->bindParam(':reason', $reason);
    $logStmt->bindParam(':remaining', $newMaobing);
    $logStmt->execute();

    echo json_encode([
        'code' => 0, 
        'msg' => '消费成功', 
        'success' => true,
        'current' => $newMaobing
    ]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '消费失败：' . $e->getMessage(), 'success' => false]);
}
?>
