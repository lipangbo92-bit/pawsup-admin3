// Banner管理
const API_BASE = '/api';
let banners = [];
let currentImageBase64 = '';
let editingId = null;

// 加载Banner列表
async function loadBanners() {
    try {
        const res = await fetch(`${API_BASE}/banners`);
        const data = await res.json();
        if (data.success) {
            banners = data.data || [];
        } else {
            banners = [];
        }
        renderBanners();
    } catch (err) {
        console.error('加载失败:', err);
        banners = [];
        renderBanners();
    }
}

// 渲染Banner列表
function renderBanners() {
    const tbody = document.getElementById('bannerList');
    if (!tbody) return;
    
    if (banners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">暂无Banner，点击右上角新增</td></tr>';
        return;
    }
    
    tbody.innerHTML = banners.map((banner, index) => `
        <tr>
            <td>${banner.sort || index + 1}</td>
            <td>
                ${banner.image ? 
                    `<img src="${banner.image}" style="height:60px;width:120px;object-fit:cover;border-radius:6px;">` : 
                    '<div style="height:60px;width:120px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">无图片</div>'
                }
            </td>
            <td style="font-weight:500;">${banner.title || '-'}</td>
            <td style="color:#666;">${banner.subtitle || '-'}</td>
            <td>
                <span class="status-badge ${banner.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${banner.status === 'active' ? '显示' : '隐藏'}
                </span>
            </td>
            <td>
                <button class="action-btn btn-edit" onclick="editBanner('${banner._id}')">编辑</button>
                <button class="action-btn btn-delete" onclick="deleteBanner('${banner._id}')">删除</button>
            </td>
        </tr>
    `).join('');
}

// 预览图片
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        const img = document.getElementById('previewImg');
        const placeholder = document.getElementById('uploadPlaceholder');
        if (img) {
            img.src = currentImageBase64;
            img.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// 打开弹窗
function openModal(bannerId = null) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // 重置表单
    editingId = null;
    currentImageBase64 = '';
    
    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const sortInput = document.getElementById('bannerSort');
    const statusInput = document.getElementById('bannerStatus');
    const fileInput = document.getElementById('bannerImage');
    const previewImg = document.getElementById('previewImg');
    const placeholder = document.getElementById('uploadPlaceholder');
    const modalTitle = document.getElementById('modalTitle');
    
    if (titleInput) titleInput.value = '';
    if (subtitleInput) subtitleInput.value = '';
    if (sortInput) sortInput.value = '0';
    if (statusInput) statusInput.value = 'active';
    if (fileInput) fileInput.value = '';
    if (previewImg) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
    }
    if (placeholder) placeholder.style.display = 'block';
    
    if (bannerId) {
        const banner = banners.find(b => b._id === bannerId);
        if (banner) {
            editingId = bannerId;
            if (modalTitle) modalTitle.textContent = '编辑Banner';
            if (titleInput) titleInput.value = banner.title || '';
            if (subtitleInput) subtitleInput.value = banner.subtitle || '';
            if (sortInput) sortInput.value = banner.sort || 0;
            if (statusInput) statusInput.value = banner.status || 'active';
            if (banner.image) {
                currentImageBase64 = banner.image;
                if (previewImg) {
                    previewImg.src = banner.image;
                    previewImg.classList.remove('hidden');
                }
                if (placeholder) placeholder.style.display = 'none';
            }
        }
    } else {
        if (modalTitle) modalTitle.textContent = '新增Banner';
    }
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
    }
    editingId = null;
}

// 保存Banner
async function saveBanner() {
    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const sortInput = document.getElementById('bannerSort');
    const statusInput = document.getElementById('bannerStatus');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const subtitle = subtitleInput ? subtitleInput.value.trim() : '';
    const sort = sortInput ? parseInt(sortInput.value) || 0 : 0;
    const status = statusInput ? statusInput.value : 'active';
    
    if (!title) {
        alert('请输入标题');
        return;
    }
    
    const bannerData = {
        title,
        subtitle,
        sort,
        status,
        image: currentImageBase64
    };
    
    try {
        let res;
        if (editingId) {
            res = await fetch(`${API_BASE}/banners`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, ...bannerData })
            });
        } else {
            res = await fetch(`${API_BASE}/banners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bannerData)
            });
        }
        
        const result = await res.json();
        
        if (result.success) {
            closeModal();
            await loadBanners();
            alert(editingId ? '更新成功' : '新增成功');
        } else {
            alert('保存失败: ' + (result.error || '未知错误'));
        }
    } catch (err) {
        console.error('保存失败:', err);
        alert('保存失败: ' + err.message);
    }
}

// 编辑Banner
function editBanner(id) {
    openModal(id);
}

// 删除Banner
async function deleteBanner(id) {
    if (!confirm('确定要删除这个Banner吗？')) return;
    
    try {
        const res = await fetch(`${API_BASE}/banners?id=${id}`, { 
            method: 'DELETE'
        });
        const result = await res.json();
        
        if (result.success) {
            await loadBanners();
            alert('删除成功');
        } else {
            alert('删除失败: ' + (result.error || '未知错误'));
        }
    } catch (err) {
        console.error('删除失败:', err);
        alert('删除失败: ' + err.message);
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadBanners();
});
