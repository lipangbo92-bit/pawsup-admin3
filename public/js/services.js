// Services Management Module
// 使用 API 连接云开发数据库

const API_BASE = '/api';
const STORAGE_KEY = 'pawsup_services';

let currentService = null;
let servicesList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadServices();
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

// Load services from API
async function loadServices() {
    try {
        const result = await apiCall('services', { action: 'list' });
        
        console.log('API Response:', result);
        
        if (!result.success) {
            throw new Error(result.error || '加载失败');
        }

        servicesList = (result.data || []).map(s => ({
            ...s,
            _id: s._id || s.id,
            // 字段兼容处理
            name: s.name || s.title || '未命名服务',
            description: s.description || s.desc || s.intro || '',
            category: s.category || 'bath',
            price: s.price || 0
        }));
        
        console.log('Parsed services:', servicesList);

        // 如果没有数据，初始化默认数据
        if (servicesList.length === 0) {
            const defaultServices = [
                { name: '洗护套餐', category: 'bath', price: 99, description: '基础洗护服务' },
                { name: '美容造型', category: 'grooming', price: 168, description: '专业美容修剪' },
                { name: '驱虫保健', category: 'medical', price: 80, description: '体内外驱虫' }
            ];
            
            for (const service of defaultServices) {
                await apiCall('services', { action: 'add', data: service });
            }
            
            // 重新加载
            const reloadResult = await apiCall('services', { action: 'list' });
            servicesList = (reloadResult.data || []).map(s => ({
                ...s,
                _id: s._id || s.id,
                name: s.name || s.title || '未命名服务',
                description: s.description || s.desc || '',
                category: s.category || 'bath',
                price: s.price || 0
            }));
        }

        renderServicesGrid(servicesList);
    } catch (error) {
        console.error('Load services error:', error);
        // 失败时显示空状态
        document.getElementById('servicesGrid').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px;">
                <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
                <div>加载失败: ${error.message}</div>
                <button onclick="location.reload()" style="margin-top:16px; padding:8px 16px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">刷新重试</button>
            </div>
        `;
    }
}

// Render services grid
function renderServicesGrid(services) {
    const container = document.getElementById('servicesGrid');
    
    if (!container) {
        console.error('servicesGrid not found');
        return;
    }
    
    if (services.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">暂无服务，请添加</div>';
        return;
    }
    
    const categoryMap = {
        'bath': '洗护美容',
        'grooming': '美容造型',
        'spa': 'SPA护理',
        'medical': '医疗护理',
        'boarding': '寄养服务',
        'visiting': '上门服务',
        'wash': '洗护美容',
        'groom': '美容造型',
        'other': '其他服务'
    };
    
    container.innerHTML = services.map(service => `
        <div class="service-card">
            <div class="service-info">
                <h4>${service.name}</h4>
                <span class="service-category">${categoryMap[service.category] || service.category}</span>
                <p class="service-desc">${service.description || '暂无描述'}</p>
                <div class="service-meta">
                    <span class="service-price">¥${(service.price || 0).toFixed(2)}</span>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn-icon" onclick="editService('${service._id}')" title="编辑">✏️</button>
                <button class="btn-icon danger" onclick="deleteService('${service._id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Open service modal for add
function openServiceModal() {
    currentService = null;
    document.getElementById('serviceModalTitle').textContent = '添加服务';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceModal').style.display = 'flex';
}

// Close service modal
function closeServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
    currentService = null;
}

// Edit service
function editService(serviceId) {
    currentService = servicesList.find(s => s._id === serviceId);
    if (!currentService) return;
    
    document.getElementById('serviceModalTitle').textContent = '编辑服务';
    document.getElementById('serviceId').value = currentService._id;
    document.getElementById('serviceName').value = currentService.name || '';
    document.getElementById('servicePrice').value = currentService.price || '';
    document.getElementById('serviceCategory').value = currentService.category || '';
    document.getElementById('serviceDesc').value = currentService.description || '';
    
    document.getElementById('serviceModal').style.display = 'flex';
}

// Save service
async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);
    const category = document.getElementById('serviceCategory').value;
    const description = document.getElementById('serviceDesc').value.trim();
    
    // Validation
    if (!name) {
        showMessage('请输入服务名称', 'error');
        return;
    }
    if (!price || price <= 0) {
        showMessage('请输入有效的价格', 'error');
        return;
    }
    if (!category) {
        showMessage('请选择服务分类', 'error');
        return;
    }
    
    try {
        const serviceData = {
            name,
            price,
            category,
            description
        };
        
        if (currentService) {
            // Update existing
            await apiCall('services', { 
                action: 'update', 
                id: currentService._id, 
                data: serviceData 
            });
            showMessage('服务更新成功', 'success');
        } else {
            // Add new
            await apiCall('services', { action: 'add', data: serviceData });
            showMessage('服务添加成功', 'success');
        }
        
        closeServiceModal();
        loadServices();
    } catch (err) {
        console.error('Save service error:', err);
        showMessage('保存失败：' + (err.message || '请重试'), 'error');
    }
}

// Delete service
async function deleteService(serviceId) {
    if (!confirm('确定要删除该服务吗？此操作不可恢复。')) return;
    
    try {
        await apiCall('services', { action: 'delete', id: serviceId });
        showMessage('服务已删除', 'success');
        loadServices();
    } catch (err) {
        console.error('Delete service error:', err);
        showMessage('删除失败：' + (err.message || '请重试'), 'error');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('serviceModal');
    if (event.target === modal) {
        closeServiceModal();
    }
};

// Show message helper (兼容 app.js 中的函数)
function showMessage(message, type = 'info') {
    if (typeof window.showMessage === 'function' && window.showMessage !== showMessage) {
        window.showMessage(message, type);
    } else {
        alert(message);
    }
}
