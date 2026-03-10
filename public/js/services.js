// Services Management Module - 支持图片上传
const API_BASE = '/api';
let currentService = null;
let servicesList = [];
let serviceImageBase64 = ''; // 临时存储服务图片

document.addEventListener('DOMContentLoaded', function() {
    loadServices();
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

async function loadServices() {
    try {
        const result = await apiCall('services', { action: 'list' });
        if (!result.success) throw new Error(result.error || '加载失败');

        servicesList = (result.data || []).map(s => ({
            ...s,
            _id: s._id || s.id,
            name: s.name || s.title || '未命名服务',
            description: s.description || s.desc || '',
            category: s.category || '狗狗洗护',
            price: s.price || 0,
            duration: s.duration || 60,
            image: s.image || s.imageUrl || ''
        }));

        renderServicesGrid(servicesList);
    } catch (error) {
        console.error('Load services error:', error);
        document.getElementById('servicesGrid').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px;">
                <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
                <div>加载失败: ${error.message}</div>
            </div>`;
    }
}

function renderServicesGrid(services) {
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    if (services.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">暂无服务，请添加</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="service-card">
            <div class="service-image" style="width:100px;height:100px;border-radius:12px;overflow:hidden;background:#f0f0f0;margin-right:16px;">
                ${service.image ? `<img src="${service.image}" style="width:100%;height:100%;object-fit:cover;" alt="${service.name}">` : '<span style="font-size:48px;display:flex;align-items:center;justify-content:center;height:100%;">🛁</span>'}
            </div>
            <div class="service-info" style="flex:1;">
                <h4>${service.name}</h4>
                <span class="service-category" style="background:#f0f0f0;padding:4px 12px;border-radius:12px;font-size:12px;color:#666;">${service.category}</span>
                <p class="service-desc" style="color:#999;font-size:14px;margin:8px 0;">${service.description || '暂无描述'}</p>
                <div class="service-meta">
                    <span class="service-price" style="color:#F97316;font-weight:bold;font-size:18px;">¥${(service.price || 0).toFixed(2)}</span>
                    <span class="service-duration" style="color:#999;font-size:14px;margin-left:12px;">⏱ ${service.duration || 60}分钟</span>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn-icon" onclick="editService('${service._id}')" title="编辑">✏️</button>
                <button class="btn-icon danger" onclick="deleteService('${service._id}', event)" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

// 预览服务图片
function previewServiceImage(input) {
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小超过5MB限制');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        serviceImageBase64 = e.target.result;
        const preview = document.getElementById('serviceImagePreview');
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="预览">`;
    };
    reader.readAsDataURL(file);
}

function openServiceModal() {
    currentService = null;
    serviceImageBase64 = '';
    document.getElementById('serviceModalTitle').textContent = '添加服务';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceImagePreview').innerHTML = '<span>🖼️</span><span class="upload-hint">点击上传服务图片</span>';
    document.getElementById('serviceModal').style.display = 'flex';
}

function closeServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
    currentService = null;
    serviceImageBase64 = '';
}

function editService(serviceId) {
    currentService = servicesList.find(s => s._id === serviceId);
    if (!currentService) return;
    
    document.getElementById('serviceModalTitle').textContent = '编辑服务';
    document.getElementById('serviceId').value = currentService._id;
    document.getElementById('serviceName').value = currentService.name || '';
    document.getElementById('servicePrice').value = currentService.price || '';
    document.getElementById('serviceDuration').value = currentService.duration || 60;
    document.getElementById('serviceCategory').value = currentService.category || '';
    document.getElementById('serviceDesc').value = currentService.description || '';
    
    // 显示已有图片
    if (currentService.image) {
        serviceImageBase64 = currentService.image;
        document.getElementById('serviceImagePreview').innerHTML = `<img src="${currentService.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="预览">`;
    } else {
        serviceImageBase64 = '';
        document.getElementById('serviceImagePreview').innerHTML = '<span>🖼️</span><span class="upload-hint">点击上传服务图片</span>';
    }
    
    document.getElementById('serviceModal').style.display = 'flex';
}

async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);
    const category = document.getElementById('serviceCategory').value;
    const description = document.getElementById('serviceDesc').value.trim();
    
    if (!name) { alert('请输入服务名称'); return; }
    if (!price || price <= 0) { alert('请输入有效的价格'); return; }
    if (!duration || duration < 30) { alert('请输入有效的服务时长（至少30分钟）'); return; }
    if (!category) { alert('请选择服务分类'); return; }
    
    try {
        const serviceData = { name, price, duration, category, description };
        
        // 如果有新图片，添加到数据
        if (serviceImageBase64) {
            serviceData.image = serviceImageBase64;
        }
        
        if (currentService) {
            await apiCall('services', { action: 'update', id: currentService._id, data: serviceData });
            alert('服务更新成功');
        } else {
            await apiCall('services', { action: 'add', data: serviceData });
            alert('服务添加成功');
        }
        
        closeServiceModal();
        loadServices();
    } catch (err) {
        console.error('Save service error:', err);
        alert('保存失败：' + (err.message || '请重试'));
    }
}

let pendingDeleteId = null;

function showDeleteConfirm(serviceId) {
    pendingDeleteId = serviceId;
    if (!confirm('确定要删除该服务吗？')) return;
    confirmDelete();
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    const serviceId = pendingDeleteId;
    pendingDeleteId = null;
    
    try {
        await apiCall('services', { action: 'delete', id: serviceId });
        alert('服务已删除');
        loadServices();
    } catch (err) {
        console.error('Delete service error:', err);
        alert('删除失败：' + (err.message || '请重试'));
    }
}

function deleteService(serviceId, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    showDeleteConfirm(serviceId);
}

window.onclick = function(event) {
    const modal = document.getElementById('serviceModal');
    if (event.target === modal) closeServiceModal();
};

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// 服务图片预览
let serviceImageBase64 = '';

function previewServiceImage(input) {
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小超过5MB限制');
        input.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        serviceImageBase64 = e.target.result;
        const preview = document.getElementById('serviceImagePreview');
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="预览">`;
    };
    reader.readAsDataURL(file);
}

// 修改 saveService 函数支持图片
const originalSaveService = saveService;
saveService = async function() {
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);
    const category = document.getElementById('serviceCategory').value;
    const description = document.getElementById('serviceDesc').value.trim();
    
    if (!name) { alert('请输入服务名称'); return; }
    if (!price || price <= 0) { alert('请输入有效的价格'); return; }
    if (!duration || duration < 30) { alert('请输入有效的服务时长（至少30分钟）'); return; }
    if (!category) { alert('请选择服务分类'); return; }
    
    try {
        const serviceData = { name, price, duration, category, description };
        
        // 如果有图片，添加到数据
        if (serviceImageBase64) {
            serviceData.image = serviceImageBase64;
        }
        
        if (currentService) {
            await apiCall('services', { action: 'update', id: currentService._id, data: serviceData });
            alert('服务更新成功');
        } else {
            await apiCall('services', { action: 'add', data: serviceData });
            alert('服务添加成功');
        }
        
        closeServiceModal();
        serviceImageBase64 = '';
        loadServices();
    } catch (err) {
        console.error('Save service error:', err);
        alert('保存失败：' + (err.message || '请重试'));
    }
};

// 修改 editService 函数显示已有图片
const originalEditService = editService;
editService = function(serviceId) {
    currentService = servicesList.find(s => s._id === serviceId);
    if (!currentService) return;
    
    document.getElementById('serviceModalTitle').textContent = '编辑服务';
    document.getElementById('serviceId').value = currentService._id;
    document.getElementById('serviceName').value = currentService.name || '';
    document.getElementById('servicePrice').value = currentService.price || '';
    document.getElementById('serviceDuration').value = currentService.duration || 60;
    document.getElementById('serviceCategory').value = currentService.category || '';
    document.getElementById('serviceDesc').value = currentService.description || '';
    
    // 显示已有图片
    if (currentService.image) {
        serviceImageBase64 = currentService.image;
        document.getElementById('serviceImagePreview').innerHTML = `<img src="${currentService.image}" style="width:100%;height:100%;object-fit:cover;" alt="预览">`;
    } else {
        serviceImageBase64 = '';
        document.getElementById('serviceImagePreview').innerHTML = '<span style="font-size:48px;margin-bottom:8px;">🖼️</span><span style="font-size:14px;">点击上传服务图片</span>';
    }
    
    document.getElementById('serviceModal').style.display = 'flex';
};
