// Technicians Management Module
// 使用本地存储
const STORAGE_KEY = 'pawsup_technicians';

let currentTechnician = null;
let techniciansList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTechnicians();
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

// Load technicians
async function loadTechnicians() {
    const localData = loadFromStorage();
    
    if (localData && localData.length > 0) {
        techniciansList = localData;
        renderTechniciansGrid(techniciansList);
        console.log('Loaded from local storage');
        return;
    }
    
    loadInitialTechnicians();
}

// 初始数据
function loadInitialTechnicians() {
    const initialTechnicians = [
        {
            _id: '1',
            name: '张美容',
            specialty: '洗护美容、美容造型',
            rating: 5,
            orderCount: 128,
            avatarUrl: ''
        },
        {
            _id: '2',
            name: '李洗护',
            specialty: 'SPA护理、染毛',
            rating: 4,
            orderCount: 86,
            avatarUrl: ''
        },
        {
            _id: '3',
            name: '王护理',
            specialty: '洗护美容',
            rating: 3,
            orderCount: 45,
            avatarUrl: ''
        },
        {
            _id: '4',
            name: '赵美容',
            specialty: '美容造型、猫咪护理',
            rating: 5,
            orderCount: 156,
            avatarUrl: ''
        }
    ];
    
    techniciansList = initialTechnicians;
    saveToStorage(techniciansList);
    renderTechniciansGrid(techniciansList);
}

// Render technicians grid
function renderTechniciansGrid(technicians) {
    const container = document.getElementById('techniciansGrid');
    
    if (!container) {
        console.error('techniciansGrid not found');
        return;
    }
    
    if (technicians.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无技师，请添加</div>';
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
                <button class="btn-icon danger" onclick="deleteTechnician('${tech._id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Open technician modal for add
function openTechnicianModal() {
    currentTechnician = null;
    document.getElementById('technicianModalTitle').textContent = '添加技师';
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
    
    document.getElementById('technicianModalTitle').textContent = '编辑技师';
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
        showMessage('请输入技师姓名', 'error');
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
        if (currentTechnician) {
            // Update existing
            const index = techniciansList.findIndex(t => t._id === currentTechnician._id);
            if (index !== -1) {
                techniciansList[index] = {
                    ...techniciansList[index],
                    name,
                    specialty,
                    rating,
                    orderCount,
                    updatedAt: new Date().toISOString()
                };
            }
            showMessage('技师信息更新成功', 'success');
        } else {
            // Add new
            const newTech = {
                _id: Date.now().toString(),
                name,
                specialty,
                rating,
                orderCount,
                avatarUrl: '',
                createdAt: new Date().toISOString()
            };
            techniciansList.push(newTech);
            showMessage('技师添加成功', 'success');
        }
        
        saveToStorage(techniciansList);
        
        closeTechnicianModal();
        loadTechnicians();
    } catch (err) {
        console.error('Save technician error:', err);
        showMessage('保存失败：' + (err.message || '请重试'), 'error');
    }
}

// Delete technician
async function deleteTechnician(techId) {
    if (!confirm('确定要删除该技师吗？此操作不可恢复。')) return;
    
    try {
        techniciansList = techniciansList.filter(t => t._id !== techId);
        saveToStorage(techniciansList);
        showMessage('技师已删除', 'success');
        loadTechnicians();
    } catch (err) {
        console.error('Delete technician error:', err);
        showMessage('删除失败：' + (err.message || '请重试'), 'error');
    }
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
