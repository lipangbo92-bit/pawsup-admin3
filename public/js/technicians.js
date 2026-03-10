// Technicians Management Module
// 使用 API 连接云开发数据库

const API_BASE = '/api';

let currentTechnician = null;
let techniciansList = [];
let worksImages = []; // 当前编辑的作品图片列表

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTechnicians();
});

// API 调用封装
async function apiCall(endpoint, data) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
}

// Load technicians from API
async function loadTechnicians() {
    try {
        const result = await apiCall('technicians', { action: 'list' });
        
        console.log('API Response:', result);
        
        if (!result.success) {
            throw new Error(result.error || '加载失败');
        }

        techniciansList = (result.data || []).map(t => ({
            ...t,
            _id: t._id || t.id,
            // 字段兼容处理
            name: t.name || '未命名',
            specialty: t.specialty || t.skills || t.tags?.join(', ') || '暂无',
            position: t.position || '美容师',
            level: t.level || '中级',
            rating: t.rating || 5,
            orderCount: t.orderCount || t.orders || 0,
            works: t.works || [] // 作品图片数组
        }));
        
        console.log('Parsed technicians:', techniciansList);

        // 如果没有数据，初始化默认数据
        if (techniciansList.length === 0) {
            const defaultTechnicians = [
                { name: '张美容', specialty: '洗护美容、美容造型', position: '美容师', level: '高级', rating: 5, orders: 128, works: [] },
                { name: '李洗护', specialty: 'SPA护理、染毛', position: '洗护师', level: '中级', rating: 4, orders: 86, works: [] },
                { name: '王助理', specialty: '洗护美容', position: '助理', level: '初级', rating: 3, orders: 45, works: [] }
            ];
            
            for (const tech of defaultTechnicians) {
                await apiCall('technicians', { action: 'add', data: tech });
            }
            
            // 重新加载
            const reloadResult = await apiCall('technicians', { action: 'list' });
            techniciansList = (reloadResult.data || []).map(t => ({
                ...t,
                _id: t._id || t.id,
                name: t.name || '未命名',
                specialty: t.specialty || t.skills || '暂无',
                position: t.position || '美容师',
                level: t.level || '中级',
                rating: t.rating || 5,
                orderCount: t.orderCount || t.orders || 0,
                works: t.works || []
            }));
        }

        renderTechniciansGrid(techniciansList);
    } catch (error) {
        console.error('Load technicians error:', error);
        document.getElementById('techniciansGrid').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px;">
                <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
                <div>加载失败: ${error.message}</div>
                <button onclick="location.reload()" style="margin-top:16px; padding:8px 16px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">刷新重试</button>
            </div>
        `;
    }
}

// 获取等级徽章HTML
function getLevelBadge(level) {
    const levelMap = {
        '初级': { text: '初级', class: 'badge-junior' },
        '中级': { text: '中级', class: 'badge-intermediate' },
        '高级': { text: '高级', class: 'badge-senior' },
        '资深': { text: '资深', class: 'badge-expert' },
        '首席': { text: '首席', class: 'badge-master' }
    };
    const config = levelMap[level] || levelMap['中级'];
    return `<span class="level-badge ${config.class}">${config.text}</span>`;
}

// 渲染作品图片预览
function renderWorksPreview(works) {
    if (!works || works.length === 0) return '';
    return `
        <div class="works-preview">
            ${works.slice(0, 3).map((img, idx) => `
                <div class="work-thumb">
                    <img src="${img}" alt="作品${idx + 1}">
                </div>
            `).join('')}
            ${works.length > 3 ? `<div class="work-more">+${works.length - 3}</div>` : ''}
        </div>
    `;
}

// Render technicians grid
function renderTechniciansGrid(technicians) {
    const container = document.getElementById('techniciansGrid');
    
    if (!container) {
        console.error('techniciansGrid not found');
        return;
    }
    
    if (technicians.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">暂无美容师，请添加</div>';
        return;
    }
    
    // Generate star rating HTML
    function getStarsHtml(rating) {
        const stars = '⭐'.repeat(rating || 0);
        return `<span class="star-rating">${stars}</span>`;
    }
    
    container.innerHTML = technicians.map(tech => `
        <div class="technician-card">
            <div class="tech-avatar">
                ${tech.avatarUrl ? `<img src="${tech.avatarUrl}" alt="${tech.name}">` : '<span class="avatar-placeholder">👤</span>'}
            </div>
            <div class="tech-info">
                <h4>${tech.name}</h4>
                <div class="tech-meta-row">
                    <span class="tech-position">${tech.position || '美容师'}</span>
                    ${getLevelBadge(tech.level)}
                </div>
                <div class="tech-rating">${getStarsHtml(tech.rating)}</div>
                <p class="tech-specialty">专业：${tech.specialty || '暂无'}</p>
                ${renderWorksPreview(tech.works)}
                <div class="tech-meta">
                    <span class="tech-orders">订单数：${tech.orderCount || 0}</span>
                </div>
            </div>
            <div class="tech-actions">
                <button class="btn-icon" onclick="editTechnician('${tech._id}')" title="编辑">✏️</button>
                <button class="btn-icon danger" onclick="deleteTechnician('${tech._id}', event)" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Open technician modal for add
function openTechnicianModal() {
    currentTechnician = null;
    worksImages = [];
    document.getElementById('technicianModalTitle').textContent = '添加美容师';
    document.getElementById('technicianForm').reset();
    document.getElementById('technicianId').value = '';
    document.getElementById('avatarPreview').innerHTML = '<span>👤</span>';
    document.getElementById('techPosition').value = '美容师';
    document.getElementById('techLevel').value = '中级';
    renderWorksGrid();
    document.getElementById('technicianModal').style.display = 'flex';
}

// Close technician modal
function closeTechnicianModal() {
    document.getElementById('technicianModal').style.display = 'none';
    currentTechnician = null;
    worksImages = [];
}

// Edit technician
function editTechnician(techId) {
    currentTechnician = techniciansList.find(t => t._id === techId);
    if (!currentTechnician) return;
    
    document.getElementById('technicianModalTitle').textContent = '编辑美容师';
    document.getElementById('technicianId').value = currentTechnician._id;
    document.getElementById('techName').value = currentTechnician.name || '';
    document.getElementById('techSpecialty').value = currentTechnician.specialty || '';
    document.getElementById('techPosition').value = currentTechnician.position || '美容师';
    document.getElementById('techLevel').value = currentTechnician.level || '中级';
    document.getElementById('techRating').value = currentTechnician.rating || '';
    document.getElementById('techOrderCount').value = currentTechnician.orderCount || '';
    
    // 加载作品图片
    worksImages = currentTechnician.works || [];
    renderWorksGrid();
    
    // Set avatar preview
    if (currentTechnician.avatarUrl) {
        document.getElementById('avatarPreview').innerHTML = `<img src="${currentTechnician.avatarUrl}" alt="头像">`;
    } else {
        document.getElementById('avatarPreview').innerHTML = '<span>👤</span>';
    }
    
    document.getElementById('technicianModal').style.display = 'flex';
}

// 渲染作品图片网格
function renderWorksGrid() {
    const grid = document.getElementById('worksGrid');
    const addBtn = document.getElementById('worksAddBtn');
    
    if (!grid) return;
    
    // 清空现有内容
    grid.innerHTML = '';
    
    // 渲染已上传的图片
    worksImages.forEach((img, index) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'work-item';
        imgDiv.innerHTML = `
            <img src="${img}" alt="作品${index + 1}">
            <button type="button" class="work-delete" onclick="deleteWork(${index})" title="删除">×</button>
        `;
        grid.appendChild(imgDiv);
    });
    
    // 控制添加按钮显示（最多6张）
    if (addBtn) {
        addBtn.style.display = worksImages.length >= 6 ? 'none' : 'flex';
    }
}

// 处理作品图片上传
function handleWorksUpload(input) {
    if (!input.files || input.files.length === 0) return;
    
    const remainingSlots = 6 - worksImages.length;
    if (remainingSlots <= 0) {
        alert('最多只能上传6张作品图片');
        return;
    }
    
    const files = Array.from(input.files).slice(0, remainingSlots);
    
    files.forEach(file => {
        // 检查文件大小（5MB限制）
        if (file.size > 5 * 1024 * 1024) {
            alert(`图片 ${file.name} 超过5MB限制，已跳过`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            worksImages.push(e.target.result);
            renderWorksGrid();
        };
        reader.readAsDataURL(file);
    });
    
    // 清空input以便重复选择相同文件
    input.value = '';
}

// 删除作品图片
function deleteWork(index) {
    if (confirm('确定删除这张作品图片吗？')) {
        worksImages.splice(index, 1);
        renderWorksGrid();
    }
}

// Save technician
async function saveTechnician() {
    const name = document.getElementById('techName').value.trim();
    const specialty = document.getElementById('techSpecialty').value.trim();
    const position = document.getElementById('techPosition').value;
    const level = document.getElementById('techLevel').value;
    const rating = parseInt(document.getElementById('techRating').value);
    const orderCount = parseInt(document.getElementById('techOrderCount').value) || 0;
    
    // Validation
    if (!name) {
        alert('请输入姓名');
        return;
    }
    if (!specialty) {
        alert('请输入专业');
        return;
    }
    if (!rating || rating < 1 || rating > 5) {
        alert('请选择评分');
        return;
    }
    
    try {
        const techData = {
            name,
            specialty,
            position,
            level,
            rating,
            orders: orderCount,
            works: worksImages // 作品图片数组
        };
        
        if (currentTechnician) {
            // Update existing
            await apiCall('technicians', { 
                action: 'update', 
                id: currentTechnician._id, 
                data: techData 
            });
            alert('信息更新成功');
        } else {
            // Add new
            await apiCall('technicians', { action: 'add', data: techData });
            alert('添加成功');
        }
        
        closeTechnicianModal();
        loadTechnicians();
    } catch (err) {
        console.error('Save technician error:', err);
        alert('保存失败：' + (err.message || '请重试'));
    }
}

// 全局变量存储待删除的ID
let pendingDeleteTechId = null;

// 显示自定义确认对话框
function showDeleteTechConfirm(techId) {
    pendingDeleteTechId = techId;
    const confirmHtml = `
        <div id="deleteConfirmModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;">
            <div style="background:white; padding:24px; border-radius:8px; max-width:360px; width:90%; text-align:center;">
                <div style="font-size:48px; margin-bottom:16px;">🗑️</div>
                <h3 style="margin:0 0 12px 0; font-size:18px;">确认删除</h3>
                <p style="margin:0 0 24px 0; color:#666;">确定要删除该美容师吗？此操作不可恢复。</p>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button onclick="closeDeleteTechConfirm()" style="padding:10px 24px; border:1px solid #ddd; background:white; border-radius:4px; cursor:pointer;">取消</button>
                    <button onclick="confirmTechDelete()" style="padding:10px 24px; border:none; background:#f44336; color:white; border-radius:4px; cursor:pointer;">删除</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmHtml);
}

// 关闭确认对话框
function closeDeleteTechConfirm() {
    pendingDeleteTechId = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.remove();
}

// 确认删除
async function confirmTechDelete() {
    if (!pendingDeleteTechId) return;
    
    const techId = pendingDeleteTechId;
    closeDeleteTechConfirm();
    
    try {
        await apiCall('technicians', { action: 'delete', id: techId });
        alert('已删除');
        loadTechnicians();
    } catch (err) {
        console.error('Delete technician error:', err);
        alert('删除失败：' + (err.message || '请重试'));
    }
}

// Delete technician
function deleteTechnician(techId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    showDeleteTechConfirm(techId);
}

// Preview avatar
function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatarPreview').innerHTML = `<img src="${e.target.result}" alt="头像预览">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('technicianModal');
    if (event.target === modal) {
        closeTechnicianModal();
    }
};
