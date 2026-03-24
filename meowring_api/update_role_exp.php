<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

// 计算等级公式: level = floor(sqrt(usedExp / 1000)) + 1
// usedExp = 1000 * (level-1)^2
function calcLevel($usedExp) {
    if ($usedExp < 0) return 1;
    return floor(sqrt($usedExp / 1000.0)) + 1;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $get = $method === 'GET' ? $_GET : $_POST;
    
    $roleId = $get['roleId'] ?? '';
    $deductExp = intval($get['deductExp'] ?? 0);  // 要消耗的经验
    
    if (empty($roleId)) {
        echo json_encode(['code' => -1, 'msg' => '参数不全']);
        exit;
    }
    
    // 获取当前角色信息
    $stmt = $pdo->prepare("SELECT remainingExp, totalExp, usedExp, level FROM roles WHERE roleId = ?");
    $stmt->execute([$roleId]);
    $role = $stmt->fetch();
    
    if (!$role) {
        echo json_encode(['code' => -2, 'msg' => '角色不存在']);
        exit;
    }
    
    // 检查剩余经验是否足够
    if ($role['remainingExp'] < $deductExp) {
        echo json_encode(['code' => -3, 'msg' => '经验不足']);
        exit;
    }
    
    // 计算新的经验值
    $newRemainingExp = $role['remainingExp'] - $deductExp;
    $newUsedExp = $role['totalExp'] - $newRemainingExp;
    $newLevel = calcLevel($newUsedExp);
    
    // 更新数据库
    $update = $pdo->prepare("UPDATE roles SET remainingExp = ?, usedExp = ?, level = ? WHERE roleId = ?");
    $update->execute([$newRemainingExp, $newUsedExp, $newLevel, $roleId]);
    
    echo json_encode([
        'code' => 0,
        'msg' => '升级成功',
        'level' => $newLevel,
        'remainingExp' => $newRemainingExp,
        'usedExp' => $newUsedExp,
        'totalExp' => $role['totalExp'],
        'leveledUp' => $newLevel > $role['level']
    ]);
    
} catch (Exception $e) {
    echo json_encode(['code' => -99, 'msg' => $e->getMessage()]);
}
