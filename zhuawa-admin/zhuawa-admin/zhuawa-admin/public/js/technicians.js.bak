// Technicians Management Module
// 使用 API 连接云开发数据库

const API_BASE = '/api';

let currentTechnician = null;
let techniciansList = [];

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
            name: t.name || '未命名美容师',
            specialty: t.specialty || t.skills || t.tags?.join(', ') || '暂无',
            rating: t.rating || 5,
            orderCount: t.orderCount || t.orders || 0
        }));
        
        console.log('Parsed technicians:', techniciansList);

        // 如果没有数据，初始化默认数据
        if (techniciansList.length === 0) {
            const defaultTechnicians = [
                { name: '张美容', specialty: '洗护美容、美容造型', rating: 5, orders: 128 },
                { name: '李洗护', specialty: 'SPA护理、染毛', rating: 4, orders: 86 },
                { name: '王护理', specialty: '洗护美容', rating: 3, orders: 45 }
            ];
            
            for (const tech of defaultTechnicians) {
                await apiCall('technicians', { action: 'add', data: tech });
            }
            
            // 重新加载
            const reloadResult = await apiCall('technicians', { action: 'list' });
            techniciansList = (reloadResult.data || []).map(t => ({
                ...t,
                _id: t._id || t.id,
                name: t.name || '未命名美容师',
                specialty: t.specialty || t.skills || '暂无',
                rating: t.rating || 5,
                orderCount: t.orderCount || t.orders || 0
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
                <div class="tech-rating">${getStarsHtml(tech.rating)}</div>
                <p class="tech-specialty">专业：${tech.specialty || '暂无'}</p>
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
    document.getElementById('technicianModalTitle').textContent = '添加美容师';
    document.getElementById('technicianForm').reset();
    document.getElementById('technicianId').value = '';
    document.getElementById('avatarPreview').innerHTML = '<span>👤</span>';
    document.getElementById('technicianModal').style.display = 'flex';
}

// Close technician modal
function closeTechnicianModal() {
    document.getElementById('technicianModal').style.display = 'none';
    currentTechnician = null;
}

// Edit technician
function editTechnician(techId) {
    currentTechnician = techniciansList.find(t => t._id === techId);
    if (!currentTechnician) return;
    
    document.getElementById('technicianModalTitle').textContent = '编辑美容师';
    document.getElementById('technicianId').value = currentTechnician._id;
    document.getElementById('techName').value = currentTechnician.name || '';
    document.getElementById('techSpecialty').value = currentTechnician.specialty || '';
    document.getElementById('techRating').value = currentTechnician.rating || '';
    document.getElementById('techOrderCount').value = currentTechnician.orderCount || '';
    
    // Set avatar preview
    if (currentTechnician.avatarUrl) {
        document.getElementById('avatarPreview').innerHTML = `<img src="${currentTechnician.avatarUrl}" alt="头像">`;
    } else {
        document.getElementById('avatarPreview').innerHTML = '<span>👤</span>';
    }
    
    document.getElementById('technicianModal').style.display = 'flex';
}

// Save technician
async function saveTechnician() {
    const name = document.getElementById('techName').value.trim();
    const specialty = document.getElementById('techSpecialty').value.trim();
    const rating = parseInt(document.getElementById('techRating').value);
    const orderCount = parseInt(document.getElementById('techOrderCount').value) || 0;
    
    // Validation
    if (!name) {
        showMessage('请输入美容师姓名', 'error');
        return;
    }
    if (!specialty) {
        showMessage('请输入专业', 'error');
        return;
    }
    if (!rating || rating < 1 || rating > 5) {
        showMessage('请选择评级', 'error');
        return;
    }
    
    try {
        const techData = {
            name,
            specialty,
            rating,
            orders: orderCount
        };
        
        if (currentTechnician) {
            // Update existing
            await apiCall('technicians', { 
                action: 'update', 
                id: currentTechnician._id, 
                data: techData 
            });
            showMessage('美容师信息更新成功', 'success');
        } else {
            // Add new
            await apiCall('technicians', { action: 'add', data: techData });
            showMessage('美容师添加成功', 'success');
        }
        
        closeTechnicianModal();
        loadTechnicians();
    } catch (err) {
        console.error('Save technician error:', err);
        showMessage('保存失败：' + (err.message || '请重试'), 'error');
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
        alert('美容师已删除');
        loadTechnicians();
    } catch (err) {
        console.error('Delete technician error:', err);
        alert('删除失败：' + (err.message || '请重试'));
    }
}

// Delete technician
function deleteTechnician(techId, event) {
    // 阻止事件冒泡
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
