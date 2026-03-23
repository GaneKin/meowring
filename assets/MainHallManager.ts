import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame, Color, log, error, sys, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;
import { director, resources } from 'cc';
import { DatabaseManager, Role } from './DatabaseManager';

@ccclass('MainHallManager')
export class MainHallManager extends Component {
    static instance: MainHallManager;
    static pendingRoleId: string = '';  // 待加载的角色ID

    private _currentUserId: string = '';
    private _currentRoleId: string = '';
    private _currentRoleData: Role | null = null;  // 当前角色数据（用于按钮状态控制）
    private _countdownEndTime: number = 0;  // 倒计时结束时间戳（秒，来自服务器）
    private _preCountdownValues: { [key: string]: number } = {};  // 倒计时开始前各属性的数值
    private _upgradedAttrsInCountdown: Set<string> = new Set();  // 倒计时内升级过的属性集合
    private _countdownLabel: Label = null!;  // 倒计时显示Label
    private _tipLabel2: Label = null!;  // 调试信息Label
    public get currentUserId(): string { return this._currentUserId; }
    public set currentUserId(value: string) { this._currentUserId = value; }

    // 猫饼按钮
    @property(Button) maobingBtn: Button = null!;
    @property(Button) logoutBtn: Button = null!;
    @property(Label) maobingLabel: Label = null!;
    
    // 猫饼按钮2（商店面板关闭按钮上显示）
    @property(Label) maobingLabel2: Label = null!;

    // 猫饼商店面板
    @property(Node) maobingShopPanel: Node = null!;
    @property(Button) closeShopBtn: Button = null!;

    // 商店服务列表容器
    @property(Node) serviceListContent: Node = null!;

    // 提示Label
    @property(Label) tipLabel: Label = null!;
    @property(Label) tipLabel2: Label = null!;  // API返回信息;

    // 头像按钮（左侧上方）
    @property(Button) avatarBtn: Button = null!;
    @property(Sprite) avatarSprite: Sprite = null!;

    // 角色信息面板
    @property(Node) roleInfoPanel: Node = null!;
    @property(Button) closeRoleInfoBtn: Button = null!;
    
    // 角色信息Label
    @property(Label) roleNameLabel: Label = null!;
    @property(Label) roleLevelLabel: Label = null!;
    @property(Label) roleExpLabel: Label = null!;
    @property(Label) roleRaceLabel: Label = null!;
    @property(Label) countdownLabel: Label = null!;  // 倒计时显示
    
    // 8项属性（每个属性有 标签、升级按钮、降级按钮）
    @property(Label) attrStrength: Label = null!;      // 力量
    @property(Button) btnStrengthUp: Button = null!;
    @property(Button) btnStrengthDown: Button = null!;
    
    @property(Label) attrConstitution: Label = null!;  // 体质
    @property(Button) btnConstitutionUp: Button = null!;
    @property(Button) btnConstitutionDown: Button = null!;
    
    @property(Label) attrIntelligence: Label = null!;   // 智力
    @property(Button) btnIntelligenceUp: Button = null!;
    @property(Button) btnIntelligenceDown: Button = null!;
    
    @property(Label) attrDexterity: Label = null!;     // 灵巧
    @property(Button) btnDexterityUp: Button = null!;
    @property(Button) btnDexterityDown: Button = null!;
    
    @property(Label) attrAgility: Label = null!;      // 敏捷
    @property(Button) btnAgilityUp: Button = null!;
    @property(Button) btnAgilityDown: Button = null!;
    
    @property(Label) attrCharisma: Label = null!;     // 魅力
    @property(Button) btnCharismaUp: Button = null!;
    @property(Button) btnCharismaDown: Button = null!;
    
    @property(Label) attrPerception: Label = null!;   // 感知
    @property(Button) btnPerceptionUp: Button = null!;
    @property(Button) btnPerceptionDown: Button = null!;
    
    @property(Label) attrWisdom: Label = null!;       // 意志
    @property(Button) btnWisdomUp: Button = null!;
    @property(Button) btnWisdomDown: Button = null!;

    // 猫饼服务配置
    private shopServices = [
        { id: 'role_slot', name: '角色栏位扩展', desc: '解锁更多角色栏位', price: 100 },
        { id: 'multi_activate', name: '多角色同时激活', desc: '可同时激活多个角色', price: 200 },
        { id: 'skill_reset', name: '技能回退', desc: '重置角色技能点', price: 150 },
        { id: 'bag_expand', name: '背包扩容', desc: '增加背包物品上限', price: 80 },
    ];

    onLoad() {
        // 如果已存在实例，先清除
        if (MainHallManager.instance) {
            MainHallManager.instance = null;
        }
        MainHallManager.instance = this;
        
        // 初始化所有状态
        this._currentUserId = '';
        this._currentRoleId = '';
        this._currentRoleData = null;
        this._countdownEndTime = 0;
        this._preCountdownValues = {};
        this._upgradedAttrsInCountdown.clear();

        this.initMaobingBtn();
        this.initShopPanel();
        this.initAvatarBtn();
        this.initRoleInfoPanel();
        this.hideShop();
        this.hideRoleInfoPanel();
        
        this._currentUserId = '10000001';
        
        // 检查是否有待加载的角色ID
        if (MainHallManager.pendingRoleId) {
            this._currentRoleId = MainHallManager.pendingRoleId;
            MainHallManager.pendingRoleId = '';
            this.loadRoleInfo();
        }
        
        this.refreshMaobingDisplay();
    }

    private initAvatarBtn() {
        if (this.avatarBtn) {
            this.avatarBtn.node.on(Button.EventType.CLICK, this.onAvatarClick, this);
        }
        // 加载头像
        this.loadAvatarSprite();
    }

    private initRoleInfoPanel() {
        if (this.closeRoleInfoBtn) {
            this.closeRoleInfoBtn.node.on(Button.EventType.CLICK, this.hideRoleInfoPanel, this);
        }
        
        // 绑定8项属性的升级/降级按钮
        this.bindAttrButton(this.btnStrengthUp, 'strength', 'upgrade');
        this.bindAttrButton(this.btnStrengthDown, 'strength', 'downgrade');
        this.bindAttrButton(this.btnConstitutionUp, 'constitution', 'upgrade');
        this.bindAttrButton(this.btnConstitutionDown, 'constitution', 'downgrade');
        this.bindAttrButton(this.btnIntelligenceUp, 'intelligence', 'upgrade');
        this.bindAttrButton(this.btnIntelligenceDown, 'intelligence', 'downgrade');
        this.bindAttrButton(this.btnDexterityUp, 'dexterity', 'upgrade');
        this.bindAttrButton(this.btnDexterityDown, 'dexterity', 'downgrade');
        this.bindAttrButton(this.btnAgilityUp, 'agility', 'upgrade');
        this.bindAttrButton(this.btnAgilityDown, 'agility', 'downgrade');
        this.bindAttrButton(this.btnCharismaUp, 'charisma', 'upgrade');
        this.bindAttrButton(this.btnCharismaDown, 'charisma', 'downgrade');
        this.bindAttrButton(this.btnPerceptionUp, 'perception', 'upgrade');
        this.bindAttrButton(this.btnPerceptionDown, 'perception', 'downgrade');
        this.bindAttrButton(this.btnWisdomUp, 'wisdom', 'upgrade');
        this.bindAttrButton(this.btnWisdomDown, 'wisdom', 'downgrade');
    }

    private bindAttrButton(btn: Button | null, attrName: string, action: 'upgrade' | 'downgrade') {
        if (!btn) {
            log(`按钮未绑定: ${attrName} ${action}`);
            return;
        }
        btn.node.on(Button.EventType.CLICK, () => {
            this.onAttrButtonClick(attrName, action);
        }, this);
    }

    private onAttrButtonClick(attrName: string, action: 'upgrade' | 'downgrade') {
        if (!this._currentRoleId) {
            this.showTip("请先选择角色");
            return;
        }
        
        if (sys.isNative && DatabaseManager.instance) {
            DatabaseManager.instance.upgradeAttribute(this._currentRoleId, attrName, action, (success, result) => {
                // 显示完整API返回
                this.showApiResult(JSON.stringify(result));
                
                if (success) {
                    if (action === 'upgrade') {
                        this.showTip(`${attrName} 升级成功！消耗 ${result.cost} 经验`);
                        if (result.countdownEndTime) { this.startCountdownFromServer(result.countdownEndTime, attrName, result.upgradedAttrs, result.preUpgradeValues); }
                        
                        if (result.leveledUp) {
                            this.showTip(`🎉 升级了！等级 ${result.level}！`);
                            this.endCountdown();
                        }
                    } else {
                        this.showTip(`${attrName} 回退成功！返还 ${result.refund} 经验`);
                    }
                    this.loadRoleInfo();
                } else {
                    this.showTip(result.msg || '操作失败');
                }
            });
        } else {
            if (action === 'upgrade') {
                this.showTip(`模拟：${attrName} 升级`);
                if (result.countdownEndTime) { this.startCountdownFromServer(result.countdownEndTime, attrName, result.upgradedAttrs, result.preUpgradeValues); }
            } else {
                this.showTip(`模拟：${attrName} 回退`);
            }
        }
    }

    // 启动倒计时（保存当前属性值）
    private startCountdown(seconds: number, attrName: string) {
        if (!this._currentRoleData) return;
        
        // 第一次启动倒计时时，保存倒计时开始前的属性值
        if (this._countdownEndTime <= 0) {
            const role = this._currentRoleData;
            this._preCountdownValues = {
                strength: role.strength || 1,
                constitution: role.constitution || 1,
                intelligence: role.intelligence || 1,
                dexterity: role.dexterity || 1,
                agility: role.agility || 1,
                charisma: role.charisma || 1,
                perception: role.perception || 1,
                wisdom: role.wisdom || 1
            };
            this._upgradedAttrsInCountdown.clear();
            this.unschedule(this.onCountdownTick);
            this.schedule(this.onCountdownTick, 1);
        }
        
        // 记录升级过的属性
        this._upgradedAttrsInCountdown.add(attrName);
        this.updateCountdownDisplay();
    }

    // 启动倒计时（从服务器倒计时结束时间和属性记录）
    private startCountdownFromServer(endTime: number, attrName: string, 
                                    upgradedAttrs?: string[], preValues?: { [key: string]: number }) {
        if (!this._currentRoleData) return;
        
        // 第一次启动倒计时时，初始化属性记录
        if (this._countdownEndTime <= 0) {
            this._upgradedAttrsInCountdown.clear();
            this._preCountdownValues = {};
        }
        
        this._countdownEndTime = endTime;
        
        // 使用服务器返回的属性记录
        if (upgradedAttrs) {
            this._upgradedAttrsInCountdown = new Set(upgradedAttrs);
        }
        if (preValues) {
            this._preCountdownValues = preValues;
        }
        
        // 记录升级过的属性
        this._upgradedAttrsInCountdown.add(attrName);
        
        this.unschedule(this.onCountdownTick);
        this.schedule(this.onCountdownTick, 1);
        this.updateCountdownDisplay();
    }

    // 立即结束倒计时
    private endCountdown() {
        this._countdownEndTime = 0;
        this._preCountdownValues = {};
        this._upgradedAttrsInCountdown.clear();
        this.unschedule(this.onCountdownTick);
        this.updateCountdownDisplay();
        this.updateAttrButtonsState();
    }

    // 倒计时每秒回调
    private onCountdownTick() {
        const remaining = this.getRemainingSeconds();
        if (remaining <= 0) {
            this._countdownEndTime = 0;
            this._preCountdownValues = {};
            this._upgradedAttrsInCountdown.clear();
            this.unschedule(this.onCountdownTick);
        }
        this.updateCountdownDisplay();
        this.updateAttrButtonsState();
    }

    // 获取当前倒计时剩余秒数（从服务器时间计算）
    private getRemainingSeconds(): number {
        if (this._countdownEndTime <= 0) return 0;
        const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
        const remaining = this._countdownEndTime - now;
        return remaining > 0 ? remaining : 0;
    }

    // 更新倒计时显示
    private updateCountdownDisplay() {
        const remaining = this.getRemainingSeconds();
        if (this.countdownLabel) {
            if (remaining > 0) {
                // 转换为小时:分钟:秒格式
                const hours = Math.floor(remaining / 3600);
                const mins = Math.floor((remaining % 3600) / 60);
                const secs = remaining % 60;
                if (hours > 0) {
                    this.countdownLabel.string = `可回退: ${hours}小时${mins}分${secs}秒`;
                } else if (mins > 0) {
                    this.countdownLabel.string = `可回退: ${mins}分${secs}秒`;
                } else {
                    this.countdownLabel.string = `可回退: ${secs}秒`;
                }
                this.countdownLabel.node.active = true;
            } else {
                this.countdownLabel.string = '';
                this.countdownLabel.node.active = false;
            }
        }
    }

    // 更新属性按钮状态
    private updateAttrButtonsState() {
        if (!this._currentRoleData) return;
        
        const role = this._currentRoleData;
        const remainingExp = role.remainingExp || 0;
        const countdownRemaining = this.getRemainingSeconds();
        
        const updateSingleAttr = (upBtn: Button | null, downBtn: Button | null, 
                                 value: number, upgradeCount: number, attrName: string) => {
            if (!upBtn || !downBtn) return;
            
            const nextCost = 100 * Math.pow(upgradeCount + 1, 2);
            
            // 升级按钮：经验足够时可升级
            const canUpgrade = remainingExp >= nextCost;
            upBtn.interactable = canUpgrade;
            const upSp = upBtn.getComponent(Sprite);
            if (upSp) upSp.color = canUpgrade ? new Color(255, 255, 255) : new Color(100, 100, 100);
            
            // 回退按钮：倒计时内 + 该属性在倒计时内被升级过 + 当前值大于倒计时前的值
            const preValue = this._preCountdownValues[attrName] || value;
            const canDowngrade = countdownRemaining > 0 && this._upgradedAttrsInCountdown.has(attrName) && value > preValue;
            downBtn.interactable = canDowngrade;
            const downSp = downBtn.getComponent(Sprite);
            if (downSp) downSp.color = canDowngrade ? new Color(255, 255, 255) : new Color(100, 100, 100);
        };
        
        updateSingleAttr(this.btnStrengthUp, this.btnStrengthDown, role.strength || 1, role.strength_upgrade || 0, 'strength');
        updateSingleAttr(this.btnConstitutionUp, this.btnConstitutionDown, role.constitution || 1, role.constitution_upgrade || 0, 'constitution');
        updateSingleAttr(this.btnIntelligenceUp, this.btnIntelligenceDown, role.intelligence || 1, role.intelligence_upgrade || 0, 'intelligence');
        updateSingleAttr(this.btnDexterityUp, this.btnDexterityDown, role.dexterity || 1, role.dexterity_upgrade || 0, 'dexterity');
        updateSingleAttr(this.btnAgilityUp, this.btnAgilityDown, role.agility || 1, role.agility_upgrade || 0, 'agility');
        updateSingleAttr(this.btnCharismaUp, this.btnCharismaDown, role.charisma || 1, role.charisma_upgrade || 0, 'charisma');
        updateSingleAttr(this.btnPerceptionUp, this.btnPerceptionDown, role.perception || 1, role.perception_upgrade || 0, 'perception');
        updateSingleAttr(this.btnWisdomUp, this.btnWisdomDown, role.wisdom || 1, role.wisdom_upgrade || 0, 'wisdom');
    }

    // 计算升级消耗: 100 * (count + 1)^2
    private calcUpgradeCost(attrName: string, count: number): number {
        return 100 * Math.pow(count + 1, 2);
    }

    // 计算回退返还: 100 * count^2
    private calcDowngradeRefund(attrName: string, count: number): number {
        return 100 * Math.pow(count, 2);
    }

    private onAvatarClick() {
        log("点击头像，打开角色信息面板");
        this.showRoleInfoPanel();
    }

    private showRoleInfoPanel() {
        if (this.roleInfoPanel) {
            this.roleInfoPanel.active = true;
        }
        // 加载角色信息
        this.loadRoleInfo();
    }

    private hideRoleInfoPanel() {
        if (this.roleInfoPanel) {
            this.roleInfoPanel.active = false;
        }
        // 清除倒计时
        this._countdownEndTime = 0;
        this._preCountdownValues = {};
        this._upgradedAttrsInCountdown.clear();
        this.unschedule(this.onCountdownTick);
        this.updateCountdownDisplay();
    }

    private loadRoleInfo() {
        // 如果没有选择角色，显示后备数据
        if (!this._currentRoleId) {
            log("当前没有选择角色，显示后备数据");
            this.displayMockRoleInfo();
            return;
        }

        if (sys.isNative && DatabaseManager.instance) {
            DatabaseManager.instance.getRoleById(this._currentRoleId, (role) => {
                if (role) {
                    this.displayRoleInfo(role);
                } else {
                    log("未找到角色信息，显示后备数据");
                    this.displayMockRoleInfo();
                }
            });
        } else {
            // 网页模式模拟
            this.displayMockRoleInfo();
        }
    }

    private displayRoleInfo(role: Role) {
        // 保存当前角色数据
        this._currentRoleData = role;
        
        // 调试：检查头像字段
        log('角色头像字段 avatar_image: ' + role.avatar_image);
        
        // 加载角色头像
        if (role.avatar_image) {
            this.loadAvatarSprite(role.avatar_image);
        } else {
            this.loadAvatarSprite();
        }
        
        // 从数据库加载倒计时结束时间和属性记录
        const countdownEndTime = role.countdown_end_time || 0;
        if (countdownEndTime > 0) {
            this._countdownEndTime = countdownEndTime;
            
            // 从数据库加载升级过的属性列表和倒计时前数值
            try {
                const upgradedAttrs = JSON.parse(role.upgraded_attrs || '[]');
                const preValues = JSON.parse(role.pre_upgrade_values || '{}');
                
                this._upgradedAttrsInCountdown = new Set(upgradedAttrs);
                this._preCountdownValues = preValues;
            } catch (e) {
                this._upgradedAttrsInCountdown.clear();
                this._preCountdownValues = {};
            }
            
            // 如果还有倒计时，启动定时器
            const remaining = this.getRemainingSeconds();
            if (remaining > 0) {
                this.unschedule(this.onCountdownTick);
                this.schedule(this.onCountdownTick, 1);
            }
        } else {
            this._countdownEndTime = 0;
            this._preCountdownValues = {};
            this._upgradedAttrsInCountdown.clear();
        }
        
        // 角色名称和等级
        if (this.roleNameLabel) {
            this.roleNameLabel.string = role.name || '未知';
        }
        if (this.roleLevelLabel) {
            this.roleLevelLabel.string = `等级: ${role.level || 1}`;
        }
        if (this.roleExpLabel) {
            this.roleExpLabel.string = `经验: ${role.remainingExp || 0}/${role.totalExp || 1000}`;
        }
        if (this.roleRaceLabel) {
            this.roleRaceLabel.string = `种族: ${role.race || '未知'}`;
        }

        // 8项属性显示（包含基础值、当前值、升级次数、消耗）
        const showAttr = (label: Label | null, 
                         attrName: string, value: number, upgradeCount: number) => {
            if (!label) return;
            
            // 计算基础值 = 当前值 - 升级次数（因为每次升级+1）
            const baseValue = value - upgradeCount;
            const nextCost = 100 * Math.pow(upgradeCount + 1, 2);
            const currentRefund = 100 * Math.pow(upgradeCount, 2);
            
            // 显示格式：属性名: 当前值 (基础X,已升Y级) 升级+消耗 ↓返还
            label.string = `${attrName}: ${value} (基础${baseValue},已升${upgradeCount}级) 升级+${nextCost} ↓${currentRefund}`;
        };

        showAttr(this.attrStrength, '力量', role.strength || 1, role.strength_upgrade || 0);
        showAttr(this.attrConstitution, '体质', role.constitution || 1, role.constitution_upgrade || 0);
        showAttr(this.attrIntelligence, '智力', role.intelligence || 1, role.intelligence_upgrade || 0);
        showAttr(this.attrDexterity, '灵巧', role.dexterity || 1, role.dexterity_upgrade || 0);
        showAttr(this.attrAgility, '敏捷', role.agility || 1, role.agility_upgrade || 0);
        showAttr(this.attrCharisma, '魅力', role.charisma || 1, role.charisma_upgrade || 0);
        showAttr(this.attrPerception, '感知', role.perception || 1, role.perception_upgrade || 0);
        showAttr(this.attrWisdom, '意志', role.wisdom || 1, role.wisdom_upgrade || 0);
        
        // 更新按钮状态（包括倒计时检查）
        this.updateAttrButtonsState();
        this.updateCountdownDisplay();
    }

    private displayMockRoleInfo() {
        // 清除当前角色数据
        this._currentRoleData = null;
        // 清除倒计时
        this._countdownEndTime = 0;
        this._preCountdownValues = {};
        this._upgradedAttrsInCountdown.clear();
        this.updateCountdownDisplay();
        
        if (this.roleNameLabel) this.roleNameLabel.string = "未选择角色";
        if (this.roleLevelLabel) this.roleLevelLabel.string = "等级: --";
        if (this.roleExpLabel) this.roleExpLabel.string = "经验: --/--";
        if (this.roleRaceLabel) this.roleRaceLabel.string = "种族: --";
        
        // 显示默认值并禁用所有按钮
        const showMockAttr = (label: Label | null, attrName: string, upBtn: Button | null, downBtn: Button | null) => {
            if (label) label.string = `${attrName}: --`;
            this.disableButton(upBtn);
            this.disableButton(downBtn);
        };
        
        showMockAttr(this.attrStrength, "力量", this.btnStrengthUp, this.btnStrengthDown);
        showMockAttr(this.attrConstitution, "体质", this.btnConstitutionUp, this.btnConstitutionDown);
        showMockAttr(this.attrIntelligence, "智力", this.btnIntelligenceUp, this.btnIntelligenceDown);
        showMockAttr(this.attrDexterity, "灵巧", this.btnDexterityUp, this.btnDexterityDown);
        showMockAttr(this.attrAgility, "敏捷", this.btnAgilityUp, this.btnAgilityDown);
        showMockAttr(this.attrCharisma, "魅力", this.btnCharismaUp, this.btnCharismaDown);
        showMockAttr(this.attrPerception, "感知", this.btnPerceptionUp, this.btnPerceptionDown);
        showMockAttr(this.attrWisdom, "意志", this.btnWisdomUp, this.btnWisdomDown);
    }

    // 禁用按钮（变灰）
    private disableButton(btn: Button | null) {
        if (!btn) return;
        btn.interactable = false;
        const sp = btn.getComponent(Sprite);
        if (sp) {
            sp.color = new Color(100, 100, 100);
        }
    }

    private loadAvatarSprite(imageCode?: string) {
        if (!this.avatarSprite) return;
        
        const spritePath = imageCode ? 'images/avatar/' + imageCode + '/spriteFrame' : 'images/avatar/avatar_default/spriteFrame';
        log('尝试加载头像: ' + spritePath);
        
        resources.load(spritePath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                log('加载头像失败: ' + err.message + ', 使用默认头像');
                resources.load('images/avatar/avatar_default/spriteFrame', SpriteFrame, (err2, sf) => {
                    if (!err2) this.avatarSprite.spriteFrame = sf;
                });
                return;
            }
            this.avatarSprite.spriteFrame = spriteFrame;
        });
    }

    public setCurrentRoleId(roleId: string) {
        this._currentRoleId = roleId;
        this.loadRoleInfo();
    }

    private initMaobingBtn() {
        if (this.maobingBtn) {
            this.maobingBtn.node.on(Button.EventType.CLICK, this.onMaobingBtnClick, this);
            
            if (this.logoutBtn) {
                this.logoutBtn.node.on(Button.EventType.CLICK, this.onLogout, this);
            }
        }
    }

    private initShopPanel() {
        if (this.closeShopBtn) {
            this.closeShopBtn.node.on(Button.EventType.CLICK, this.hideShop, this);
        }
        this.generateServiceList();
    }

    private generateServiceList() {
        if (!this.serviceListContent) return;
        this.serviceListContent.destroyAllChildren();

        for (const service of this.shopServices) {
            this.createServiceItem(service);
        }
    }

    private createServiceItem(service: { id: string; name: string; desc: string; price: number }) {
        const item = new Node('ServiceItem_' + service.id);
        item.parent = this.serviceListContent;

        const bg = new Node('Bg');
        bg.parent = item;
        const sprite = bg.addComponent(Sprite);
        sprite.color = new Color(60, 60, 60, 200);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bg.setContentSize(400, 80);
        bg.setPosition(-200, 0);

        const nameNode = new Node('NameLabel');
        nameNode.parent = item;
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = service.name;
        nameLabel.fontSize = 22;
        nameLabel.color = new Color(255, 255, 255, 255);
        nameNode.setPosition(-160, 15);

        const descNode = new Node('DescLabel');
        descNode.parent = item;
        const descLabel = descNode.addComponent(Label);
        descLabel.string = service.desc;
        descLabel.fontSize = 16;
        descLabel.color = new Color(180, 180, 180, 255);
        descNode.setPosition(-160, -15);

        const priceNode = new Node('PriceLabel');
        priceNode.parent = item;
        const priceLabel = priceNode.addComponent(Label);
        priceLabel.string = `${service.price}🐱`;
        priceLabel.fontSize = 20;
        priceLabel.color = new Color(255, 200, 100, 255);
        priceNode.setPosition(80, 0);

        const btnNode = new Node('BuyBtn');
        btnNode.parent = item;
        const btnSprite = btnNode.addComponent(Sprite);
        btnSprite.color = new Color(100, 150, 255, 255);
        btnSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        btnNode.setContentSize(80, 40);
        btnNode.setPosition(170, 0);

        const btnLabelNode = new Node('Label');
        btnLabelNode.parent = btnNode;
        const btnLabel = btnLabelNode.addComponent(Label);
        btnLabel.string = '购买';
        btnLabel.fontSize = 18;
        btnLabel.color = new Color(255, 255, 255, 255);
        btnLabelNode.setPosition(0, 0);

        const btnComp = btnNode.addComponent(Button);
        btnComp.target = btnNode;
        btnComp.node.on(Button.EventType.CLICK, () => {
            this.onBuyService(service.id, service.name, service.price);
        }, this);
    }

    private onMaobingBtnClick() {
        log("🐱 点击猫饼按钮，打开商店");
        this.showShop();
    }

    // 退出登录
    private onLogout() {
        // 清除静态实例和状态
        MainHallManager.instance = null;
        MainHallManager.pendingRoleId = '';
        this._currentUserId = '';
        this._currentRoleId = '';
        this._currentRoleData = null;
        this._countdownEndTime = 0;
        this._preCountdownValues = {};
        this._upgradedAttrsInCountdown.clear();
        this.unscheduleAllCallbacks();
        
        director.loadScene('Login');
    }

    private showShop() {
        if (this.maobingShopPanel) {
            this.maobingShopPanel.active = true;
        }
        this.refreshMaobingDisplay();
    }

    private hideShop() {
        if (this.maobingShopPanel) {
            this.maobingShopPanel.active = false;
        }
    }

    private refreshMaobingDisplay() {
        if (!sys.isNative) {
            const mockMaobing = 100;
            this.updateMaobingDisplay(mockMaobing);
            return;
        }

        if (!this._currentUserId) {
            this.updateMaobingDisplay(0);
            return;
        }

        DatabaseManager.instance.getMaobing(this._currentUserId, (maobing) => {
            this.updateMaobingDisplay(maobing);
        });
    }

    private updateMaobingDisplay(maobing: number) {
        const displayText = `🐱 ${maobing}`;
        if (this.maobingLabel) {
            this.maobingLabel.string = displayText;
        }
        if (this.maobingLabel2) {
            this.maobingLabel2.string = displayText;
        }
        if (this.maobingBtn?.node) {
            this.maobingBtn.node.emit('maobing-updated', maobing);
        }
    }

    private onBuyService(serviceId: string, serviceName: string, price: number) {
        if (!this._currentUserId) {
            this.showTip("❌ 请先登录！");
            return;
        }

        if (!sys.isNative) {
            const mockBalance = 100;
            if (mockBalance < price) {
                this.showTip("❌ 猫饼不足！");
                return;
            }
            this.showTip(`✅ 购买成功！${serviceName}`);
            return;
        }

        DatabaseManager.instance.deductMaobing(this._currentUserId, price, serviceName, (success, current) => {
            if (success) {
                this.showTip(`✅ 购买成功！${serviceName}`);
                this.updateMaobingDisplay(current || 0);
            } else {
                this.showTip("❌ 猫饼不足！");
            }
        });
    }

    private showTip(text: string) {
        if (this.tipLabel) {
            this.tipLabel.string = text;
            this.tipLabel.node.active = true;
            this.scheduleOnce(() => {
                if (this.tipLabel) {
                    this.tipLabel.node.active = false;
                    this.tipLabel.string = '';
                }
            }, 2);
        }
    }

    // 显示API返回信息到tipLabel2
    private showApiResult(text: string) {
        if (this.tipLabel2) {
            this.tipLabel2.string = text;
            this.tipLabel2.node.active = true;
        }
        log(`API返回: ${text}`);
    }

    public setUserId(userId: string) {
        this._currentUserId = userId;
        this.refreshMaobingDisplay();
    }
}
