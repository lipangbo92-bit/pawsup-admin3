// Technicians Management Module - 修复头像上传到云存储
const API_BASE = '/api';

let currentTechnician = null;
let techniciansList = [];
let worksImages = [];

// 云存储配置
const CLOUD_ENV = 'cloud1-4gy1jyan842d73ab';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTechnicians();
    initCloudStorage();
});

// 初始化云存储
function initCloudStorage() {
    // 使用云开发 Web SDK
    if (typeof cloudbase !== 'undefined') {
        cloudbase.init({
            env: CLOUD_ENV
        });
    }
}

// API 调用封装
async function apiCall(endpoint, data) {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return await response.json();
}

// 压缩图片
function compressImage(base64, maxWidth = 400, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // 按比例缩放
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转为 base64，压缩质量
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// 上传图片到云存储
async function uploadToCloudStorage(base64Data, fileName) {
    try {
        // 方法1: 尝试使用云开发 Web SDK
        if (typeof cloudbase !== 'undefined' && cloudbase.uploadFile) {
            // 将 base64 转为 Blob
            const response = await fetch(base64Data);
            const blob = await response.blob();
            
            const result = await cloudbase.uploadFile({
                cloudPath: `avatars/${Date.now()}_${fileName}`,
                filePath: blob
            });
            
            return result.fileID;
        }
        
        // 方法2: 使用 API 上传到云存储
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'uploadImage',
                data: base64Data,
                path: `avatars/${Date.now()}_${fileName}`
            })
        });
        
        const result = await res.json();
        if (result.success) {
            return result.fileID;
        }
        throw new Error(result.error || '上传失败');
    } catch (err) {
        console.error('上传失败:', err);
        // 如果上传失败，返回压缩后的 base64（降级方案）
        return base64Data;
    }
}

// Load technicians
async function loadTechnicians() {
    try {
        const result = await apiCall('technicians', { action: 'list' });
        if (!result.success) throw new Error(result.error || '加载失败');

        techniciansList = (result.data || []).map(t => ({
            ...t,
            _id: t._id || t.id,
            name: t.name || '未命名',
            specialty: t.specialty || t.skills || t.tags?.join(', ') || '暂无',
            position: t.position || '美容师',
            level: t.level || '中级',
            rating: t.rating || 5,
            orderCount: t.orderCount || t.orders || 0,
            works: t.works || [],
            avatarUrl: t.avatarUrl || t.avatar || ''
        }));
        
        renderTechniciansGrid(techniciansList);
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('techniciansGrid').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;text-align:center;padding:40px;">
                <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
                <div>加载失败: ${error.message}</div>
            </div>`;
    }
}

// Render grid
function renderTechniciansGrid(technicians) {
    const container = document.getElementById('techniciansGrid');
    if (!container) return;
    
    if (technicians.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无美容师，请添加</div>';
        return;
    }
    
    container.innerHTML = technicians.map(tech => `
        <div class="technician-card">
            <div class="tech-avatar">
                ${tech.avatarUrl ? `<img src="${tech.avatarUrl}" alt="${tech.name}">` : '<span>👤</span>'}
            </div>
            <div class="tech-info">
                <h4>${tech.name}</h4>
                <div class="tech-meta-row">
                    <span class="tech-position">${tech.position}</span>
                    <span class="level-badge badge-${getLevelClass(tech.level)}">${tech.level}</span>
                </div>
                <div class="tech-rating">${'⭐'.repeat(tech.rating || 0)}</div>
                <p class="tech-specialty">专业：${tech.specialty}</p>
                <div class="tech-meta">
                    <span class="tech-orders">订单数：${tech.orderCount || 0}</span>
                </div>
            </div>
            <div class="tech-actions">
                <button class="btn-icon" onclick="editTechnician('${tech._id}')">✏️</button>
                <button class="btn-icon danger" onclick="deleteTechnician('${tech._id}', event)">🗑️</button>
            </div>
        </div>
    `).join('');
}

function getLevelClass(level) {
    const map = { '初级': 'junior', '中级': 'intermediate', '高级': 'senior', '资深': 'expert', '首席': 'master' };
    return map[level] || 'intermediate';
}

// Open modal
function openTechnicianModal() {
    currentTechnician = null;
    worksImages = [];
    document.getElementById('technicianModalTitle').textContent = '添加美容师';
    document.getElementById('technicianForm').reset();
    document.getElementById('technicianId').value = '';
    document.getElementById('avatarPreview').innerHTML = '<span>👤</span>';
    document.getElementById('techPosition').value = '美容师';
    document.getElementById('techLevel').value = '中级';
    document.getElementById('avatarInput').value = '';
    renderWorksGrid();
    document.getElementById('technicianModal').style.display = 'flex';
}

function closeTechnicianModal() {
    document.getElementById('technicianModal').style.display = 'none';
    currentTechnician = null;
    worksImages = [];
}

// Edit
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
    
    worksImages = currentTechnician.works || [];
    renderWorksGrid();
    
    document.getElementById('avatarInput').value = '';
    
    if (currentTechnician.avatarUrl) {
        document.getElementById('avatarPreview').innerHTML = `<img src="${currentTechnician.avatarUrl}" alt="头像">`;
    } else {
        document.getElementById('avatarPreview').innerHTML = '<span>👤</span>';
    }
    
    document.getElementById('technicianModal').style.display = 'flex';
}

function renderWorksGrid() {
    const grid = document.getElementById('worksGrid');
    const addBtn = document.getElementById('worksAddBtn');
    if (!grid) return;
    
    grid.innerHTML = '';
    worksImages.forEach((img, index) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'work-item';
        imgDiv.innerHTML = `
            <img src="${img}" alt="作品${index + 1}">
            <button type="button" class="work-delete" onclick="deleteWork(${index})">×</button>
        `;
        grid.appendChild(imgDiv);
    });
    
    if (addBtn) addBtn.style.display = worksImages.length >= 6 ? 'none' : 'flex';
}

// Handle works upload
function handleWorksUpload(input) {
    if (!input.files || input.files.length === 0) return;
    
    const remainingSlots = 6 - worksImages.length;
    if (remainingSlots <= 0) {
        alert('最多只能上传6张作品图片');
        input.value = '';
        return;
    }
    
    const files = Array.from(input.files).slice(0, remainingSlots);
    
    files.forEach(file => {
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
    
    input.value = '';
}

function deleteWork(index) {
    if (confirm('确定删除这张作品图片吗？')) {
        worksImages.splice(index, 1);
        renderWorksGrid();
    }
}

// Preview avatar - 关键修改：先压缩再保存
function previewAvatar(input) {
    console.log('previewAvatar called, files:', input.files);
    
    if (!input.files || input.files.length === 0) {
        console.log('No files selected');
        return;
    }
    
    const file = input.files[0];
    console.log('Selected file:', file.name, file.size, file.type);
    
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小超过5MB限制');
        input.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件（JPG/PNG）');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        console.log('File loaded, compressing...');
        const preview = document.getElementById('avatarPreview');
        
        try {
            // 压缩图片
            const compressedBase64 = await compressImage(e.target.result, 400, 0.8);
            console.log('Compressed size:', compressedBase64.length);
            
            if (preview) {
                preview.innerHTML = `<img src="${compressedBase64}" alt="头像预览">`;
            }
            
            if (!currentTechnician) {
                currentTechnician = {};
            }
            currentTechnician._tempAvatar = compressedBase64;
            
            alert('头像已选择，点击保存后上传');
        } catch (err) {
            console.error('压缩失败:', err);
            alert('图片处理失败，请重试');
        }
    };
    
    reader.onerror = function(e) {
        console.error('FileReader error:', e);
        alert('读取图片失败');
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// Save technician - 关键修改：上传头像到云存储
async function saveTechnician() {
    const name = document.getElementById('techName').value.trim();
    const specialty = document.getElementById('techSpecialty').value.trim();
    const position = document.getElementById('techPosition').value;
    const level = document.getElementById('techLevel').value;
    const rating = parseInt(document.getElementById('techRating').value);
    const orderCount = parseInt(document.getElementById('techOrderCount').value) || 0;
    
    if (!name) { alert('请输入姓名'); return; }
    if (!specialty) { alert('请输入专业'); return; }
    if (!rating || rating < 1 || rating > 5) { alert('请选择评分'); return; }
    
    try {
        // 显示上传中
        const saveBtn = document.querySelector('.btn-primary[onclick="saveTechnician()"]');
        if (saveBtn) saveBtn.textContent = '上传中...';
        
        let avatarUrl = currentTechnician && currentTechnician.avatarUrl ? currentTechnician.avatarUrl : '';
        
        // 如果有新头像，上传到云存储
        if (currentTechnician && currentTechnician._tempAvatar) {
            console.log('Uploading avatar to cloud storage...');
            avatarUrl = await uploadToCloudStorage(currentTechnician._tempAvatar, 'avatar.jpg');
            console.log('Avatar uploaded:', avatarUrl);
        }
        
        const techData = {
            name,
            specialty,
            position,
            level,
            rating,
            orders: orderCount,
            works: worksImages,
            avatarUrl: avatarUrl
        };
        
        if (currentTechnician && currentTechnician._id) {
            await apiCall('technicians', { 
                action: 'update', 
                id: currentTechnician._id, 
                data: techData 
            });
            alert('信息更新成功');
        } else {
            await apiCall('technicians', { action: 'add', data: techData });
            alert('添加成功');
        }
        
        closeTechnicianModal();
        loadTechnicians();
    } catch (err) {
        console.error('Save error:', err);
        alert('保存失败：' + (err.message || '请重试'));
    } finally {
        const saveBtn = document.querySelector('.btn-primary[onclick="saveTechnician()"]');
        if (saveBtn) saveBtn.textContent = '保存';
    }
}

// Delete
let pendingDeleteTechId = null;

function showDeleteTechConfirm(techId) {
    pendingDeleteTechId = techId;
    const confirmHtml = `
        <div id="deleteConfirmModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div style="background:white;padding:24px;border-radius:8px;max-width:360px;width:90%;text-align:center;">
                <div style="font-size:48px;margin-bottom:16px;">🗑️</div>
                <h3 style="margin:0 0 12px 0;font-size:18px;">确认删除</h3>
                <p style="margin:0 0 24px 0;color:#666;">确定要删除该美容师吗？此操作不可恢复。</p>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button onclick="closeDeleteTechConfirm()" style="padding:10px 24px;border:1px solid #ddd;background:white;border-radius:4px;cursor:pointer;">取消</button>
                    <button onclick="confirmTechDelete()" style="padding:10px 24px;border:none;background:#f44336;color:white;border-radius:4px;cursor:pointer;">删除</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', confirmHtml);
}

function closeDeleteTechConfirm() {
    pendingDeleteTechId = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.remove();
}

async function confirmTechDelete() {
    if (!pendingDeleteTechId) return;
    const techId = pendingDeleteTechId;
    closeDeleteTechConfirm();
    
    try {
        await apiCall('technicians', { action: 'delete', id: techId });
        alert('已删除');
        loadTechnicians();
    } catch (err) {
        alert('删除失败：' + (err.message || '请重试'));
    }
}

function deleteTechnician(techId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    showDeleteTechConfirm(techId);
}

window.onclick = function(event) {
    const modal = document.getElementById('technicianModal');
    if (event.target === modal) closeTechnicianModal();
};
