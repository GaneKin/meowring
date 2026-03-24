<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    // 获取客户端传的参数（userId/account/password 对应原有入参）
    $userId = $_POST['userId'] ?? '';
    $account = $_POST['account'] ?? '';
    $password = $_POST['password'] ?? '';

    // 参数校验（和客户端逻辑一致）
    if (empty($userId) || empty($account) || empty($password)) {
        echo json_encode(['code' => -2, 'msg' => '参数不全', 'success' => false]);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['code' => -3, 'msg' => '密码至少6位', 'success' => false]);
        exit;
    }

    // 插入数据（和原有SQLite逻辑一致）
    $stmt = $pdo->prepare("INSERT INTO users (userId, account, password) VALUES (:userId, :account, :password)");
    $stmt->bindParam(':userId', $userId);
    $stmt->bindParam(':account', $account);
    $stmt->bindParam(':password', $password);
    $stmt->execute();

    echo json_encode(['code' => 0, 'msg' => '注册成功', 'success' => true]);
} catch (PDOException $e) {
    // 捕获账号重复的异常
    if ($e->getCode() == 23000) {
        echo json_encode(['code' => -4, 'msg' => '账号已存在', 'success' => false]);
    } else {
        echo json_encode(['code' => -1, 'msg' => '注册失败：' . $e->getMessage(), 'success' => false]);
    }
}
?>
