// Services Management Module
// 使用本地存储 + 云函数混合模式
const CLOUD_ENV = 'cloud1-4gy1jyan842d73ab';
const STORAGE_KEY = 'pawsup_services';

let currentService = null;
let servicesList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadServices();
});

// 从本地存储加载
function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

// 保存到本地存储
function saveToStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Load services
async function loadServices() {
    // 先尝试从本地存储加载
    const localData = loadFromStorage();
    
    if (localData && localData.length > 0) {
        servicesList = localData;
        renderServicesGrid(servicesList);
        console.log('Loaded from local storage');
        return;
    }
    
    // 没有本地数据，加载初始数据
    loadInitialServices();
}

// 初始数据
function loadInitialServices() {
    const initialServices = [
        {
            _id: '1',
            name: '基础洗护',
            price: 99.00,
            category: 'bath',
            description: '包含洗澡、吹干、梳毛、剪指甲、清洁耳朵'
        },
        {
            _id: '2',
            name: '美容造型',
            price: 168.00,
            category: 'grooming',
            description: '包含基础洗护+专业造型修剪'
        },
        {
            _id: '3',
            name: 'SPA护理',
            price: 238.00,
            category: 'spa',
            description: '包含精油SPA、按摩、护毛护理'
        },
        {
            _id: '4',
            name: '宠物寄养',
            price: 150.00,
            category: 'boarding',
            description: '提供舒适寄养环境，包含每日喂食、遛狗'
        },
        {
            _id: '5',
            name: '上门服务',
            price: 200.00,
            category: 'visiting',
            description: '专业技师上门服务'
        }
    ];
    
    servicesList = initialServices;
    saveToStorage(servicesList);
    renderServicesGrid(servicesList);
}

// Render services grid
function renderServicesGrid(services) {
    const container = document.getElementById('servicesGrid');
    
    if (!container) {
        console.error('servicesGrid not found');
        return;
    }
    
    if (services.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无服务，请添加</div>';
        return;
    }
    
    const categoryMap = {
        'bath': '洗护美容',
        'grooming': '美容造型',
        'spa': 'SPA护理',
        'medical': '医疗护理',
        'boarding': '寄养服务',
        'visiting': '上门服务',
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
        if (currentService) {
            // Update existing
            const index = servicesList.findIndex(s => s._id === currentService._id);
            if (index !== -1) {
                servicesList[index] = {
                    ...servicesList[index],
                    name,
                    price,
                    category,
                    description,
                    updatedAt: new Date().toISOString()
                };
            }
            showMessage('服务更新成功', 'success');
        } else {
            // Add new
            const newService = {
                _id: Date.now().toString(),
                name,
                price,
                category,
                description,
                createdAt: new Date().toISOString()
            };
            servicesList.push(newService);
            showMessage('服务添加成功', 'success');
        }
        
        // Save to local storage
        saveToStorage(servicesList);
        
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
        servicesList = servicesList.filter(s => s._id !== serviceId);
        saveToStorage(servicesList);
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
