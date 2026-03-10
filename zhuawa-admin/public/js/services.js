// Services Management Module - 支持图片上传
const API_BASE = '/api';
let currentService = null;
let servicesList = [];
let serviceImageBase64 = '';

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
            ...s, _id: s._id || s.id,
            name: s.name || '未命名',
            description: s.description || '',
            category: s.category || '狗狗洗护',
            price: s.price || 0,
            duration: s.duration || 60,
            image: s.image || ''
        }));
        renderServicesGrid(servicesList);
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('servicesGrid').innerHTML = '<div style="text-align:center;padding:40px;">加载失败</div>';
    }
}

function renderServicesGrid(services) {
    const container = document.getElementById('servicesGrid');
    if (!container) return;
    if (services.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;">暂无服务</div>';
        return;
    }
    container.innerHTML = services.map(s => `
        <div class="service-card" style="display:flex;padding:16px;background:#fff;border-radius:8px;margin-bottom:12px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            <div style="width:80px;height:80px;border-radius:8px;overflow:hidden;background:#f5f5f5;margin-right:16px;">
                ${s.image ? `<img src="${s.image}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:40px;display:flex;align-items:center;justify-content:center;height:100%;">🛁</span>'}
            </div>
            <div style="flex:1;">
                <h4 style="margin:0 0 4px;">${s.name}</h4>
                <span style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:12px;">${s.category}</span>
                <p style="color:#999;font-size:13px;margin:8px 0;">${s.description || '暂无描述'}</p>
                <span style="color:#F97316;font-weight:bold;">¥${s.price}</span>
                <span style="color:#999;font-size:13px;margin-left:8px;">⏱ ${s.duration}分钟</span>
            </div>
            <div>
                <button onclick="editService('${s._id}')" style="margin-right:8px;">✏️</button>
                <button onclick="deleteService('${s._id}', event)">🗑️</button>
            </div>
        </div>
    `).join('');
}

function previewServiceImage(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) { alert('图片超过5MB'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        serviceImageBase64 = e.target.result;
        document.getElementById('serviceImagePreview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
}

function openServiceModal() {
    currentService = null;
    serviceImageBase64 = '';
    document.getElementById('serviceModalTitle').textContent = '添加服务';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceImagePreview').innerHTML = '<span style="font-size:48px;">🖼️</span><span>点击上传</span>';
    document.getElementById('serviceModal').style.display = 'flex';
}

function closeServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
    currentService = null;
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
    if (currentService.image) {
        serviceImageBase64 = currentService.image;
        document.getElementById('serviceImagePreview').innerHTML = `<img src="${currentService.image}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        serviceImageBase64 = '';
        document.getElementById('serviceImagePreview').innerHTML = '<span style="font-size:48px;">🖼️</span><span>点击上传</span>';
    }
    document.getElementById('serviceModal').style.display = 'flex';
}

async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const duration = parseInt(document.getElementById('serviceDuration').value);
    const category = document.getElementById('serviceCategory').value;
    const description = document.getElementById('serviceDesc').value.trim();
    if (!name) { alert('请输入名称'); return; }
    if (!price || price <= 0) { alert('请输入价格'); return; }
    if (!category) { alert('请选择分类'); return; }
    try {
        const data = { name, price, duration, category, description };
        if (serviceImageBase64) data.image = serviceImageBase64;
        if (currentService) {
            await apiCall('services', { action: 'update', id: currentService._id, data });
            alert('更新成功');
        } else {
            await apiCall('services', { action: 'add', data });
            alert('添加成功');
        }
        closeServiceModal();
        loadServices();
    } catch (err) {
        alert('保存失败：' + err.message);
    }
}

async function deleteService(serviceId, event) {
    if (event) { event.preventDefault(); }
    if (!confirm('确定删除？')) return;
    try {
        await apiCall('services', { action: 'delete', id: serviceId });
        alert('已删除');
        loadServices();
    } catch (err) {
        alert('删除失败');
    }
}

window.onclick = function(event) {
    if (event.target.id === 'serviceModal') closeServiceModal();
};

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}
