// Services Management Module
const API_BASE = '/api';
let currentService = null;
let servicesList = [];

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
            category: s.category || 'bath',
            price: s.price || 0,
            duration: s.duration || 60  // 默认60分钟
        }));

        if (servicesList.length === 0) {
            const defaultServices = [
                { name: '洗护套餐', category: 'bath', price: 99, duration: 60, description: '基础洗护服务' },
                { name: '美容造型', category: 'grooming', price: 168, duration: 90, description: '专业美容修剪' },
                { name: '驱虫保健', category: 'medical', price: 80, duration: 30, description: '体内外驱虫' }
            ];
            for (const service of defaultServices) {
                await apiCall('services', { action: 'add', data: service });
            }
            const reloadResult = await apiCall('services', { action: 'list' });
            servicesList = (reloadResult.data || []).map(s => ({
                ...s, _id: s._id || s.id, name: s.name || '未命名',
                description: s.description || '', category: s.category || 'bath',
                price: s.price || 0, duration: s.duration || 60
            }));
        }
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
    
    const categoryMap = {
        'bath': '洗护美容', 'grooming': '美容造型', 'spa': 'SPA护理',
        'medical': '医疗护理', 'boarding': '寄养服务', 'other': '其他服务'
    };
    
    container.innerHTML = services.map(service => `
        <div class="service-card">
            <div class="service-info">
                <h4>${service.name}</h4>
                <span class="service-category">${categoryMap[service.category] || service.category}</span>
                <p class="service-desc">${service.description || '暂无描述'}</p>
                <div class="service-meta">
                    <span class="service-price">¥${(service.price || 0).toFixed(2)}</span>
                    <span class="service-duration">⏱ ${service.duration || 60}分钟</span>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn-icon" onclick="editService('${service._id}')" title="编辑">✏️</button>
                <button class="btn-icon danger" onclick="deleteService('${service._id}', event)" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openServiceModal() {
    currentService = null;
    document.getElementById('serviceModalTitle').textContent = '添加服务';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
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
