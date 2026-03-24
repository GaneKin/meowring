<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db_config.php';

// 验证属性名
$validAttrs = ['strength', 'constitution', 'intelligence', 'dexterity', 'agility', 'charisma', 'perception', 'wisdom'];

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $get = $method === 'GET' ? $_GET : $_POST;
    
    $roleId = $get['roleId'] ?? '';
    $attrName = $get['attrName'] ?? '';
    $action = $get['action'] ?? '';
    
    if (empty($roleId) || empty($attrName) || empty($action)) {
        echo json_encode(['code' => -1, 'msg' => '参数不全']);
        exit;
    }
    
    // 验证属性名
    if (!in_array($attrName, $validAttrs)) {
        echo json_encode(['code' => -4, 'msg' => '无效的属性名']);
        exit;
    }
    
    // 获取当前角色信息
    $stmt = $pdo->prepare("SELECT * FROM roles WHERE roleId = ?");
    $stmt->execute([$roleId]);
    $role = $stmt->fetch();
    
    if (!$role) {
        echo json_encode(['code' => -2, 'msg' => '角色不存在']);
        exit;
    }
    
    // 保存原始等级
    $originalLv = intval($role['level']);
    
    $upgradeCount = intval($role[$attrName . '_upgrade']);
    $attrValue = intval($role[$attrName]);
    
    // 读取现有的倒计时属性记录
    $upgradedAttrs = json_decode($role['upgraded_attrs'] ?? '[]', true);
    $preUpgradeValues = json_decode($role['pre_upgrade_values'] ?? '{}', true);
    if (!is_array($upgradedAttrs)) $upgradedAttrs = [];
    if (!is_array($preUpgradeValues)) $preUpgradeValues = [];
    
    if ($action === 'upgrade') {
        // 升级：消耗经验，增加属性
        $cost = 100 * pow($upgradeCount + 1, 2);
        
        if ($role['remainingExp'] < $cost) {
            echo json_encode(['code' => -3, 'msg' => '经验不足']);
            exit;
        }
        
        $newRemainingExp = $role['remainingExp'] - $cost;
        $newUsedExp = $role['totalExp'] - $newRemainingExp;
        $newUpgradeCount = $upgradeCount + 1;
        $newAttrValue = $attrValue + 1;
        
        // 计算倒计时结束时间（2小时=7200秒）
        $currentTime = time();
        $existingCountdown = intval($role['countdown_end_time']);
        
        if ($existingCountdown <= $currentTime) {
            // 启动新的2小时倒计时，初始化属性记录
            $countdownEndTime = $currentTime + 7200;
            $upgradedAttrs = [$attrName];
            $preUpgradeValues = [$attrName => $attrValue];
        } else {
            // 延续现有倒计时，追加属性
            $countdownEndTime = $existingCountdown;
            if (!in_array($attrName, $upgradedAttrs)) {
                $upgradedAttrs[] = $attrName;
            }
            // 如果该属性还没有记录过倒计时前的数值，记录它
            if (!isset($preUpgradeValues[$attrName])) {
                $preUpgradeValues[$attrName] = $attrValue;
            }
        }
        
        // 更新数据库
        $update = $pdo->prepare("UPDATE roles SET 
            remainingExp = ?, usedExp = ?, countdown_end_time = ?,
            upgraded_attrs = ?, pre_upgrade_values = ?,
            {$attrName} = ?, {$attrName}_upgrade = ? 
            WHERE roleId = ?");
        $update->execute([
            $newRemainingExp, $newUsedExp, $countdownEndTime,
            json_encode($upgradedAttrs), json_encode($preUpgradeValues),
            $newAttrValue, $newUpgradeCount, $roleId
        ]);
        
        // 读取新的等级值（MySQL自动计算的）
        $stmt2 = $pdo->prepare("SELECT level FROM roles WHERE roleId = ?");
        $stmt2->execute([$roleId]);
        $newRole = $stmt2->fetch();
        $newLevel = intval($newRole['level']);
        
        $leveledUp = $newLevel > $originalLv;
        
        // 如果升级了，清除倒计时
        if ($leveledUp) {
            $countdownEndTime = $currentTime;
            $upgradedAttrs = [];
            $preUpgradeValues = [];
            $update2 = $pdo->prepare("UPDATE roles SET countdown_end_time = ?, upgraded_attrs = ?, pre_upgrade_values = ? WHERE roleId = ?");
            $update2->execute([$countdownEndTime, json_encode($upgradedAttrs), json_encode($preUpgradeValues), $roleId]);
        }
        
        echo json_encode([
            'code' => 0,
            'msg' => $leveledUp ? '升级成功，等级提升！' : '升级成功',
            'action' => 'upgrade',
            'attrName' => $attrName,
            'attrValue' => $newAttrValue,
            'upgradeCount' => $newUpgradeCount,
            'level' => $newLevel,
            'leveledUp' => $leveledUp,
            'cost' => $cost,
            'remainingExp' => $newRemainingExp,
            'totalExp' => $role['totalExp'],
            'countdownEndTime' => $countdownEndTime,
            'upgradedAttrs' => $upgradedAttrs,
            'preUpgradeValues' => $preUpgradeValues
        ]);
        
    } else if ($action === 'downgrade') {
        // 回退：返还经验，减少属性
        if ($upgradeCount <= 0) {
            echo json_encode(['code' => -5, 'msg' => '无法继续回退']);
            exit;
        }
        
        $refund = 100 * pow($upgradeCount, 2);
        $newRemainingExp = $role['remainingExp'] + $refund;
        $newUsedExp = $role['totalExp'] - $newRemainingExp;
        $newUpgradeCount = $upgradeCount - 1;
        $newAttrValue = $attrValue - 1;
        
        // 更新数据库
        $update = $pdo->prepare("UPDATE roles SET 
            remainingExp = ?, usedExp = ?,
            {$attrName} = ?, {$attrName}_upgrade = ? 
            WHERE roleId = ?");
        $update->execute([$newRemainingExp, $newUsedExp, $newAttrValue, $newUpgradeCount, $roleId]);
        
        // 读取新的等级值（MySQL自动计算的）
        $stmt2 = $pdo->prepare("SELECT level FROM roles WHERE roleId = ?");
        $stmt2->execute([$roleId]);
        $newRole = $stmt2->fetch();
        $newLevel = intval($newRole['level']);
        
        // 回退后，如果回到了倒计时开始前的状态，清除该属性的记录
        $currentTime = time();
        $countdownEndTime = intval($role['countdown_end_time']);
        
        echo json_encode([
            'code' => 0,
            'msg' => '回退成功',
            'action' => 'downgrade',
            'attrName' => $attrName,
            'attrValue' => $newAttrValue,
            'upgradeCount' => $newUpgradeCount,
            'level' => $newLevel,
            'refund' => $refund,
            'remainingExp' => $newRemainingExp,
            'totalExp' => $role['totalExp'],
            'countdownEndTime' => $countdownEndTime,
            'upgradedAttrs' => $upgradedAttrs,
            'preUpgradeValues' => $preUpgradeValues
        ]);
        
    } else {
        echo json_encode(['code' => -6, 'msg' => '无效的操作']);
    }
    
} catch (Exception $e) {
    echo json_encode(['code' => -99, 'msg' => $e->getMessage()]);
}
