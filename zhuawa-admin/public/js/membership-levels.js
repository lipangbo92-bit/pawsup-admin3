// 会员档位配置页面逻辑

let membershipLevels = [];

// 云函数 HTTP 触发器地址
const CLOUD_FUNCTION_URL = 'https://cloud1-4gy1jyan842d73ab.service.tcloudbase.com/membership-api';

// 页面加载
document.addEventListener('DOMContentLoaded', function() {
    loadLevels();
    bindEvents();
});

// 加载档位配置
async function loadLevels() {
    try {
        console.log('开始加载档位配置...');
        
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getMembershipLevels'
            })
        });
        
        const result = await response.json();
        console.log('加载结果:', result);

        if (result.success) {
            membershipLevels = result.data || [];
            console.log('获取到档位数据:', membershipLevels);

            // 如果没有数据，初始化默认数据
            if (membershipLevels.length === 0) {
                console.log('没有数据，开始初始化...');
                await initDefaultLevels();
                return;
            }

            // 填充表单
            fillFormData();
            updatePreview();
            console.log('数据加载完成');
        } else {
            console.error('加载失败:', result.error);
            showToast('加载失败: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('加载档位配置失败:', error);
        showToast('加载失败，请刷新重试', 'error');
    }
}

// 初始化默认档位
async function initDefaultLevels() {
    try {
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'initMembershipLevels'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('已初始化默认配置', 'success');
            loadLevels();
        } else {
            showToast('初始化失败: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('初始化默认配置失败:', error);
        showToast('初始化失败', 'error');
    }
}

// 填充表单数据
function fillFormData() {
    membershipLevels.forEach(level => {
        const levelNum = level.level;
        if (levelNum === 1) return; // 普通会员不编辑
        
        // 填充名称
        const nameInput = document.getElementById(`name-${levelNum}`);
        if (nameInput) nameInput.value = level.name;
        
        // 填充充值门槛
        const minRechargeInput = document.getElementById(`minRecharge-${levelNum}`);
        if (minRechargeInput) minRechargeInput.value = level.minRecharge / 100;
        
        // 填充折扣
        const discountSelect = document.getElementById(`discount-${levelNum}`);
        if (discountSelect) discountSelect.value = level.discount;
        
        // 填充赠送配置
        const giftEnabledCheck = document.getElementById(`giftEnabled-${levelNum}`);
        const giftValueInput = document.getElementById(`giftValue-${levelNum}`);
        
        if (giftEnabledCheck) {
            giftEnabledCheck.checked = level.giftConfig?.enabled || false;
        }
        if (giftValueInput) {
            giftValueInput.value = (level.giftConfig?.giftValue || 0) / 100;
        }
        
        // 填充权益
        const benefitsInput = document.getElementById(`benefits-${levelNum}`);
        if (benefitsInput && level.benefits) {
            benefitsInput.value = Array.isArray(level.benefits) ? level.benefits.join(',') : level.benefits;
        }
    });
}

// 绑定事件
function bindEvents() {
    // 监听所有输入变化，更新预览
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', updatePreview);
        input.addEventListener('input', updatePreview);
    });
}

// 更新预览表格
function updatePreview() {
    const tbody = document.getElementById('previewBody');
    if (!tbody) return;
    
    let html = '';
    
    // 普通会员
    html += `
        <tr>
            <td>⭐ 普通会员</td>
            <td>0元</td>
            <td>无折扣</td>
            <td>-</td>
            <td>-</td>
        </tr>
    `;
    
    // 2-4档
    for (let i = 2; i <= 4; i++) {
        const name = document.getElementById(`name-${i}`)?.value || '';
        const minRecharge = parseFloat(document.getElementById(`minRecharge-${i}`)?.value || 0);
        const discount = parseFloat(document.getElementById(`discount-${i}`)?.value || 1);
        const giftEnabled = document.getElementById(`giftEnabled-${i}`)?.checked || false;
        const giftValue = parseFloat(document.getElementById(`giftValue-${i}`)?.value || 0);
        
        const discountText = discount < 1 ? (discount * 10).toFixed(1) + '折' : '无折扣';
        const giftText = giftEnabled ? `¥${giftValue}` : '-';
        const totalText = giftEnabled ? `¥${minRecharge + giftValue}` : `¥${minRecharge}`;
        
        const icons = { 2: '🌟', 3: '👑', 4: '💎' };
        
        html += `
            <tr>
                <td>${icons[i]} ${name}</td>
                <td>¥${minRecharge}</td>
                <td>${discountText}</td>
                <td>${giftText}</td>
                <td>${totalText}</td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
}

// 保存配置
async function saveConfig() {
    const btn = document.querySelector('.btn-save');

    // 检查 membershipLevels 是否已加载
    if (!membershipLevels || membershipLevels.length === 0) {
        console.error('membershipLevels 为空:', membershipLevels);
        showToast('数据未加载，请刷新页面', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '保存中...';

    try {
        // 收集2-4档的配置
        const updates = [];

        for (let i = 2; i <= 4; i++) {
            const levelData = membershipLevels.find(l => l.level === i);
            if (!levelData) {
                console.error(`未找到档位 ${i} 的数据`);
                continue;
            }

            if (!levelData._id) {
                console.error(`档位 ${i} 没有 _id`);
                continue;
            }

            // 获取权益
            const benefitsStr = document.getElementById(`benefits-${i}`)?.value || '';
            const benefits = benefitsStr.split(',').map(b => b.trim()).filter(b => b);

            const updateData = {
                name: document.getElementById(`name-${i}`)?.value,
                minRecharge: parseFloat(document.getElementById(`minRecharge-${i}`)?.value || 0) * 100,
                discount: parseFloat(document.getElementById(`discount-${i}`)?.value || 1),
                giftConfig: {
                    enabled: document.getElementById(`giftEnabled-${i}`)?.checked || false,
                    giftType: 'balance',
                    giftValue: parseFloat(document.getElementById(`giftValue-${i}`)?.value || 0) * 100
                },
                benefits: benefits
            };

            updates.push({
                levelId: levelData._id,
                data: updateData
            });
        }

        if (updates.length === 0) {
            showToast('没有可更新的数据', 'error');
            return;
        }

        // 逐个更新
        for (const update of updates) {
            console.log('更新档位:', update.levelId, update.data);
            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateMembershipLevel',
                    levelId: update.levelId,
                    data: update.data
                })
            });
            
            const result = await response.json();
            console.log('更新结果:', result);
        }

        showToast('配置保存成功', 'success');

        // 刷新数据
        setTimeout(() => {
            loadLevels();
        }, 1000);

    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存失败: ' + (error.message || '请重试'), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '保存配置';
    }
}

// 显示Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
