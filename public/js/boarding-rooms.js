// 房型管理页面 JavaScript - 使用 API 方式

const API_BASE = '/api';
let rooms = [];
let currentFilter = 'all';
let deleteTargetId = null;
let facilities = [];

// API 调用封装
async function apiCall(endpoint, data) {
    try {
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
    } catch (err) {
        console.error('API call error:', err);
        throw err;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('房型管理页面加载完成');
    loadRooms();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    // 分类筛选
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.type;
            renderRooms();
        });
    });
}

// 加载房型列表
async function loadRooms() {
    showLoading(true);
    try {
        const result = await apiCall('boarding-rooms', {
            action: 'list'
        });
        
        if (result.success) {
            rooms = result.data || [];
            updateStats();
            renderRooms();
        } else {
            showError(result.error || '加载房型数据失败');
        }
    } catch (error) {
        console.error('加载房型失败:', error);
        showError('加载房型数据失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 更新统计数据
function updateStats() {
    const totalRooms = rooms.length;
    const dogRooms = rooms.filter(r => r.petType === 'dog').length;
    const catRooms = rooms.filter(r => r.petType === 'cat').length;
    const totalRoomCount = rooms.reduce((sum, r) => sum + (r.roomCount || 0), 0);
    
    document.getElementById('totalRooms').textContent = totalRooms;
    document.getElementById('dogRooms').textContent = dogRooms;
    document.getElementById('catRooms').textContent = catRooms;
    document.getElementById('totalRoomCount').textContent = totalRoomCount;
}

// 渲染房型列表
function renderRooms() {
    const tbody = document.getElementById('roomsTableBody');
    
    const filtered = currentFilter === 'all' 
        ? rooms 
        : rooms.filter(r => r.petType === currentFilter);
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #9CA3AF;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
                    <div>暂无房型数据</div>
                    <div style="font-size: 14px; margin-top: 8px;">点击"添加房型"创建第一个房型</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(room => `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    ${room.images && room.images[0] ? 
                        `<img src="${room.images[0]}" class="room-image-preview">` : 
                        `<div style="width: 80px; height: 60px; background: #F3F4F6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 24px;">🏠</div>`
                    }
                    <div>
                        <div style="font-weight: 600;">${room.name}</div>
                        <div class="facilities-tags">
                            ${(room.facilities || []).slice(0, 3).map(f => `<span class="facility-tag">${f}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span class="room-type-badge ${room.petType}">
                    ${room.petType === 'dog' ? '🐕 狗狗' : '🐈 猫咪'}
                </span>
            </td>
            <td style="font-weight: 600; color: #F97316;">¥${room.price}</td>
            <td>${room.roomCount} 间</td>
            <td>${room.area || '-'}</td>
            <td>
                <span class="status-badge ${room.status}">
                    ${room.status === 'active' ? '✅ 可预订' : '🔧 维护中'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-edit" onclick="editRoom('${room.id}')">编辑</button>
                    <button class="btn-delete" onclick="deleteRoom('${room.id}')">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 打开模态框
function openModal() {
    document.getElementById('roomId').value = '';
    document.getElementById('modalTitle').textContent = '添加房型';
    document.getElementById('roomName').value = '';
    document.getElementById('petType').value = 'dog';
    document.getElementById('roomPrice').value = '';
    document.getElementById('roomCount').value = '';
    document.getElementById('roomArea').value = '';
    document.getElementById('roomDescription').value = '';
    document.getElementById('roomStatus').value = 'active';
    document.getElementById('roomImageUrl').value = '';
    document.getElementById('imagePreviewArea').innerHTML = `
        <div style="font-size: 40px; margin-bottom: 8px;">📷</div>
        <div>点击上传房型图片</div>
    `;
    
    facilities = [];
    renderFacilities();
    
    document.getElementById('roomModal').classList.add('show');
}

// 关闭模态框
function closeModal() {
    document.getElementById('roomModal').classList.remove('show');
}

// 添加设施输入
function addFacilityInput(value = '') {
    facilities.push(value);
    renderFacilities();
}

// 删除设施输入
function removeFacility(index) {
    facilities.splice(index, 1);
    renderFacilities();
}

// 更新设施值
function updateFacility(index, value) {
    facilities[index] = value;
}

// 渲染设施输入
function renderFacilities() {
    const container = document.getElementById('facilitiesContainer');
    
    if (facilities.length === 0) {
        container.innerHTML = '<div style="color: #9CA3AF; font-size: 14px;">暂无设施，点击添加</div>';
        return;
    }
    
    container.innerHTML = facilities.map((f, i) => `
        <div class="facility-input-row">
            <input type="text" value="${f}" placeholder="例如：独立空调" onchange="updateFacility(${i}, this.value)">
            <button type="button" onclick="removeFacility(${i})">删除</button>
        </div>
    `).join('');
}

// 处理图片上传
async function handleImageUpload(event) {
    console.log('handleImageUpload 被调用', event);
    
    // 检查 event 和 files 是否存在
    if (!event || !event.target || !event.target.files || event.target.files.length === 0) {
        console.log('没有文件被选择');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) {
        console.log('文件对象为空');
        return;
    }
    
    // 验证文件类型
    if (!file.type || !file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    // 转换为 base64
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        document.getElementById('roomImageUrl').value = base64;
        document.getElementById('imagePreviewArea').innerHTML = `
            <img src="${base64}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">
        `;
    };
    reader.onerror = (e) => {
        console.error('FileReader 错误:', e);
        alert('图片读取失败');
    };
    reader.readAsDataURL(file);
}

// 保存房型
async function saveRoom() {
    console.log('saveRoom 函数被调用');
    
    const id = document.getElementById('roomId').value;
    const name = document.getElementById('roomName').value.trim();
    const petType = document.getElementById('petType').value;
    const price = parseFloat(document.getElementById('roomPrice').value);
    const roomCount = parseInt(document.getElementById('roomCount').value);
    const area = document.getElementById('roomArea').value.trim();
    const description = document.getElementById('roomDescription').value.trim();
    const status = document.getElementById('roomStatus').value;
    const imageUrl = document.getElementById('roomImageUrl').value;
    
    // 验证
    if (!name) {
        alert('请输入房型名称');
        return;
    }
    if (!price || price <= 0) {
        alert('请输入有效的价格');
        return;
    }
    if (!roomCount || roomCount <= 0) {
        alert('请输入有效的房间数量');
        return;
    }
    
    const roomData = {
        name,
        petType,
        price,
        roomCount,
        area,
        description,
        status,
        facilities: facilities.filter(f => f.trim()),
        images: imageUrl ? [imageUrl] : []
    };
    
    try {
        console.log('保存房型数据:', roomData);
        
        let result;
        if (id) {
            // 更新
            result = await apiCall('boarding-rooms', {
                action: 'update',
                id: id,
                data: roomData
            });
        } else {
            // 新增
            result = await apiCall('boarding-rooms', {
                action: 'add',
                data: roomData
            });
        }
        
        console.log('保存结果:', result);
        
        if (result.success) {
            closeModal();
            await loadRooms();
            showSuccess(id ? '房型更新成功' : '房型添加成功');
        } else {
            alert('保存失败: ' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('保存房型失败:', error);
        alert('保存失败: ' + error.message);
    }
}

// 编辑房型
async function editRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    
    document.getElementById('roomId').value = id;
    document.getElementById('modalTitle').textContent = '编辑房型';
    document.getElementById('roomName').value = room.name;
    document.getElementById('petType').value = room.petType;
    document.getElementById('roomPrice').value = room.price;
    document.getElementById('roomCount').value = room.roomCount;
    document.getElementById('roomArea').value = room.area || '';
    document.getElementById('roomDescription').value = room.description || '';
    document.getElementById('roomStatus').value = room.status;
    
    // 图片
    if (room.images && room.images[0]) {
        document.getElementById('roomImageUrl').value = room.images[0];
        document.getElementById('imagePreviewArea').innerHTML = `
            <img src="${room.images[0]}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">
        `;
    } else {
        document.getElementById('roomImageUrl').value = '';
        document.getElementById('imagePreviewArea').innerHTML = `
            <div style="font-size: 40px; margin-bottom: 8px;">📷</div>
            <div>点击上传房型图片</div>
        `;
    }
    
    // 设施
    facilities = room.facilities || [];
    renderFacilities();
    
    document.getElementById('roomModal').classList.add('show');
}

// 删除房型
function deleteRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    
    deleteTargetId = id;
    document.getElementById('deleteRoomName').textContent = room.name;
    document.getElementById('deleteModal').classList.add('show');
}

// 关闭删除模态框
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteTargetId = null;
}

// 确认删除
async function confirmDelete() {
    if (!deleteTargetId) return;
    
    try {
        const result = await apiCall('boarding-rooms', {
            action: 'delete',
            id: deleteTargetId
        });
        
        if (result.success) {
            closeDeleteModal();
            await loadRooms();
            showSuccess('房型删除成功');
        } else {
            alert('删除失败: ' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('删除房型失败:', error);
        alert('删除失败: ' + error.message);
    }
}

// 显示/隐藏加载
function showLoading(show) {
    // 可以添加全局 loading 效果
}

// 显示错误
function showError(message) {
    const tbody = document.getElementById('roomsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #EF4444;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <div>加载失败</div>
                    <div style="font-size: 14px; margin-top: 8px; color: #666;">${message}</div>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #F97316; color: white; border: none; border-radius: 8px; cursor: pointer;">刷新重试</button>
                </td>
            </tr>
        `;
    }
}

// 显示成功
function showSuccess(message) {
    alert(message);
}

// 退出登录
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'index.html';
}
