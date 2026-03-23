// Technicians Management Module - 修复头像上传
const API_BASE = '/api';

let currentTechnician = null;
let techniciansList = [];
let worksImages = [];

document.addEventListener('DOMContentLoaded', function() {
    loadTechnicians();
});

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
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            console.log('压缩后大小:', Math.round(compressedBase64.length / 1024), 'KB');
            resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// 上传图片到云存储 - 增强版
async function uploadToCloudStorage(base64Data, fileName) {
    console.log('开始上传到云存储...');
    
    try {
        // 使用 API 上传到云存储
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
        console.log('上传结果:', result);
        
        if (result.success && result.url) {
            console.log('上传成功, URL:', result.url);
            return result.url;
        }
        
        throw new Error(result.error || '上传返回数据异常');
    } catch (err) {
        console.error('上传到云存储失败:', err);
        // 降级方案：返回压缩后的 base64
        console.log('使用 base64 降级方案');
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

function renderWorksPreview(works) {
    if (!works || works.length === 0) return '';
    return `
        <div class="works-preview">
            ${works.slice(0, 3).map((img, idx) => `
                <div class="work-thumb"><img src="${img}" alt="作品${idx + 1}"></div>
            `).join('')}
            ${works.length > 3 ? `<div class="work-more">+${works.length - 3}</div>` : ''}
        </div>
    `;
}

function renderTechniciansGrid(technicians) {
    const container = document.getElementById('techniciansGrid');
    if (!container) return;
    
    if (technicians.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">暂无美容师，请添加</div>';
        return;
    }
    
    container.innerHTML = technicians.map(tech => `
        <div class="technician-card">
            <div class="tech-avatar">
                ${tech.avatar ? `<img src="${tech.avatar}" alt="${tech.name}">` : '<span class="avatar-placeholder">👤</span>'}
            </div>
            <div class="tech-info">
                <h4>${tech.name}</h4>
                <div class="tech-meta-row">
                    <span class="tech-position">${tech.position || '美容师'}</span>
                    ${getLevelBadge(tech.level)}
                </div>
                <div class="tech-rating">${'⭐'.repeat(tech.rating || 0)}</div>
                <p class="tech-specialty">专业：${tech.specialty || '暂无'}</p>
                ${renderWorksPreview(tech.works)}
                <div class="tech-meta">
                    <span class="tech-orders">订单数：${tech.orders || 0}</span>
                </div>
            </div>
            <div class="tech-actions">
                <button class="btn-icon" onclick="editTechnician('${tech._id}')" title="编辑">✏️</button>
                <button class="btn-icon danger" onclick="deleteTechnician('${tech._id}', event)" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

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
    document.getElementById('techOrderCount').value = currentTechnician.orders || '';
    
    worksImages = currentTechnician.works || [];
    renderWorksGrid();
    
    document.getElementById('avatarInput').value = '';
    
    if (currentTechnician.avatar) {
        document.getElementById('avatarPreview').innerHTML = `<img src="${currentTechnician.avatar}" alt="头像">`;
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

async function handleWorksUpload(input) {
    if (!input.files || input.files.length === 0) return;
    
    const remainingSlots = 6 - worksImages.length;
    if (remainingSlots <= 0) {
        alert('最多只能上传6张作品图片');
        input.value = '';
        return;
    }
    
    const files = Array.from(input.files).slice(0, remainingSlots);
    
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            alert(`图片 ${file.name} 超过5MB限制，已跳过`);
            continue;
        }
        
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            // 压缩作品图片：最大 800px，质量 0.7，目标 < 150KB
            let compressed = await compressImage(base64, 800, 0.7);
            console.log(`作品图片压缩后大小: ${Math.round(compressed.length / 1024)} KB`);
            
            // 如果仍然太大，进一步压缩
            if (compressed.length > 200000) { // 约 150KB base64
                compressed = await compressImage(compressed, 600, 0.6);
                console.log(`二次压缩后大小: ${Math.round(compressed.length / 1024)} KB`);
            }
            
            worksImages.push(compressed);
            renderWorksGrid();
        } catch (err) {
            console.error('处理图片失败:', err);
            alert(`图片 ${file.name} 处理失败`);
        }
    }
    
    input.value = '';
}

function deleteWork(index) {
    if (confirm('确定删除这张作品图片吗？')) {
        worksImages.splice(index, 1);
        renderWorksGrid();
    }
}

// 预览头像 - 关键修改：压缩后保存
async function previewAvatar(input) {
    console.log('选择文件:', input.files);
    
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    console.log('文件信息:', file.name, file.size, file.type);
    
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
        console.log('文件读取完成，开始压缩...');
        
        try {
            // 压缩图片：头像最大 400px，质量 0.7，目标大小 < 50KB
            let compressedBase64 = await compressImage(e.target.result, 400, 0.7);
            console.log('压缩完成，大小:', Math.round(compressedBase64.length / 1024), 'KB');
            
            // 如果仍然太大，进一步压缩
            if (compressedBase64.length > 70000) { // 约 50KB base64
                console.log('图片仍然太大，进一步压缩...');
                compressedBase64 = await compressImage(compressedBase64, 300, 0.6);
                console.log('二次压缩后大小:', Math.round(compressedBase64.length / 1024), 'KB');
            }
            
            const preview = document.getElementById('avatarPreview');
            if (preview) {
                preview.innerHTML = `<img src="${compressedBase64}" alt="头像预览">`;
            }
            
            // 保存压缩后的图片到临时变量
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
        console.error('读取失败:', e);
        alert('读取图片失败');
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// 保存技师 - 关键修改：确保头像正确上传
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
    
    // 获取保存按钮并显示加载状态
    const saveBtn = document.querySelector('.btn-primary[onclick="saveTechnician()"]');
    const originalText = saveBtn ? saveBtn.textContent : '保存';
    if (saveBtn) saveBtn.textContent = '上传中...';
    
    try {
        let avatar = '';
        
        // 如果有旧头像，先保留
        if (currentTechnician && (currentTechnician.avatar || currentTechnician.avatarUrl)) {
            avatar = currentTechnician.avatar || currentTechnician.avatarUrl;
        }
        
        // 如果有新头像，上传到云存储
        if (currentTechnician && currentTechnician._tempAvatar) {
            console.log('检测到新头像，开始上传...');
            avatar = await uploadToCloudStorage(currentTechnician._tempAvatar, 'avatar.jpg');
            console.log('头像上传完成:', avatar);
        }
        
        const techData = {
            name,
            specialty,
            position,
            level,
            rating,
            orders: orderCount,
            works: worksImages,
            avatar: avatar
        };
        
        console.log('保存数据:', techData);
        
        if (currentTechnician && currentTechnician._id) {
            // 更新现有
            await apiCall('technicians', { 
                action: 'update', 
                id: currentTechnician._id, 
                data: techData 
            });
            alert('信息更新成功');
        } else {
            // 添加新
            await apiCall('technicians', { action: 'add', data: techData });
            alert('添加成功');
        }
        
        closeTechnicianModal();
        loadTechnicians();
    } catch (err) {
        console.error('保存失败:', err);
        alert('保存失败：' + (err.message || '请重试'));
    } finally {
        if (saveBtn) saveBtn.textContent = originalText;
    }
}

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
