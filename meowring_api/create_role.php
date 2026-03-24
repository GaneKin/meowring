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
    
    $userId = $get['userId'] ?? '';
    $name = $get['name'] ?? '';
    $race = $get['race'] ?? '';
    $job = $get['job'] ?? '';
    $faceImage = $get['faceImage'] ?? '';
    $backImage = $get['backImage'] ?? '';
    $avatarImage = $get['avatarImage'] ?? '';
    
    // 属性
    $strength = intval($get['strength'] ?? 1);
    $constitution = intval($get['constitution'] ?? 1);
    $intelligence = intval($get['intelligence'] ?? 1);
    $dexterity = intval($get['dexterity'] ?? 1);
    $agility = intval($get['agility'] ?? 1);
    $charisma = intval($get['charisma'] ?? 1);
    $perception = intval($get['perception'] ?? 1);
    $wisdom = intval($get['wisdom'] ?? 1);
    
    // 提升次数
    $strength_upgrade = intval($get['strength_upgrade'] ?? 0);
    $constitution_upgrade = intval($get['constitution_upgrade'] ?? 0);
    $intelligence_upgrade = intval($get['intelligence_upgrade'] ?? 0);
    $dexterity_upgrade = intval($get['dexterity_upgrade'] ?? 0);
    $agility_upgrade = intval($get['agility_upgrade'] ?? 0);
    $charisma_upgrade = intval($get['charisma_upgrade'] ?? 0);
    $perception_upgrade = intval($get['perception_upgrade'] ?? 0);
    $wisdom_upgrade = intval($get['wisdom_upgrade'] ?? 0);
    
    // 经验系统
    // 公式: usedExp = 1000 * (level-1)^2
    // 等级1时 usedExp = 0, 等级2时 usedExp = 1000
    $remainingExp = intval($get['remainingExp'] ?? 1000);  // 剩余经验
    $totalExp = intval($get['totalExp'] ?? 1000);         // 总经验
    $usedExp = $totalExp - $remainingExp;                // 已消耗经验
    $level = calcLevel($usedExp);                         // 等级

    if (empty($userId) || empty($name)) {
        echo json_encode(['code' => -1, 'msg' => '参数不全']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT role_count, role_slots FROM users WHERE userId = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        echo json_encode(['code' => -2, 'msg' => '用户不存在']);
        exit;
    }
    
    if ($user['role_count'] >= $user['role_slots']) {
        echo json_encode(['code' => -3, 'msg' => '栏位已满']);
        exit;
    }

    $roleId = 'AA' . str_pad(mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);

    $sql = "INSERT INTO roles SET 
        roleId='$roleId', userId='$userId', name='$name', race='$race', job='$job',
        strength=$strength, constitution=$constitution, intelligence=$intelligence, 
        dexterity=$dexterity, agility=$agility, charisma=$charisma, perception=$perception, 
        wisdom=$wisdom,
        strength_upgrade=$strength_upgrade, constitution_upgrade=$constitution_upgrade,
        intelligence_upgrade=$intelligence_upgrade, dexterity_upgrade=$dexterity_upgrade,
        agility_upgrade=$agility_upgrade, charisma_upgrade=$charisma_upgrade, 
        perception_upgrade=$perception_upgrade, wisdom_upgrade=$wisdom_upgrade, 
        remainingExp=$remainingExp, totalExp=$totalExp, usedExp=$usedExp, level=$level,
        gold=1000, face_image='$faceImage', back_image='$backImage', avatar_image='$avatarImage'";
    
    $pdo->exec($sql);

    $pdo->prepare("UPDATE users SET role_count = role_count + 1 WHERE userId = ?")->execute([$userId]);

    echo json_encode([
        'code' => 0, 
        'msg' => '创建成功', 
        'roleId' => $roleId,
        'level' => $level,
        'remainingExp' => $remainingExp,
        'usedExp' => $usedExp,
        'totalExp' => $totalExp
    ]);
} catch (Exception $e) {
    echo json_encode(['code' => -99, 'msg' => $e->getMessage()]);
}
