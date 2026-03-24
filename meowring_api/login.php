<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

try {
    // 获取客户端传的账号密码
    $account = $_POST['account'] ?? '';
    $password = $_POST['password'] ?? '';
    if (empty($account) || empty($password)) {
        echo json_encode(['code' => -2, 'msg' => '账号密码不能为空', 'user' => null]);
        exit;
    }

    // 查询用户信息（匹配账号+密码）
    $stmt = $pdo->prepare("SELECT userId, account FROM users WHERE account = :account AND password = :password LIMIT 1");
    $stmt->bindParam(':account', $account);
    $stmt->bindParam(':password', $password);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['code' => 0, 'msg' => '查询成功', 'user' => $user]);
} catch (Exception $e) {
    echo json_encode(['code' => -1, 'msg' => '登录校验失败：' . $e->getMessage(), 'user' => null]);
}
?>
