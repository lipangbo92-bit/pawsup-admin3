// Banner管理 - 简化版，前端直传COS
const API_BASE = '/api';
let banners = [];
let currentImageUrl = '';
let editingId = null;

// 腾讯云COS配置
const COS_CONFIG = {
    Bucket: 'zhuawa-xxx',  // 需要替换为实际的bucket名称
    Region: 'ap-guangzhou', // 需要替换为实际的region
};

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
                    `<img src="${banner.image}" style="height:60px;width:120px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                    <div style="display:none;height:60px;width:120px;background:#f3f4f6;border-radius:6px;align-items:center;justify-content:center;color:#999;font-size:12px;">加载失败</div>` : 
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

// 预览图片（简化版，只支持URL输入）
function previewImageInput() {
    const urlInput = document.getElementById('bannerImageUrl');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) return;
    
    currentImageUrl = url;
    const img = document.getElementById('previewImg');
    const placeholder = document.getElementById('uploadPlaceholder');
    
    if (img) {
        img.src = url;
        img.classList.remove('hidden');
        img.onerror = () => {
            img.classList.add('hidden');
            if (placeholder) {
                placeholder.style.display = 'block';
                placeholder.innerHTML = '<p>图片加载失败</p><p style="font-size:12px;color:#9ca3af">请检查URL是否正确</p>';
            }
        };
    }
    if (placeholder) {
        placeholder.style.display = 'none';
    }
}

// 打开弹窗
function openModal(bannerId = null) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    // 重置表单
    editingId = null;
    currentImageUrl = '';
    
    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const sortInput = document.getElementById('bannerSort');
    const statusInput = document.getElementById('bannerStatus');
    const urlInput = document.getElementById('bannerImageUrl');
    const previewImg = document.getElementById('previewImg');
    const placeholder = document.getElementById('uploadPlaceholder');
    const modalTitle = document.getElementById('modalTitle');
    
    if (titleInput) titleInput.value = '';
    if (subtitleInput) subtitleInput.value = '';
    if (sortInput) sortInput.value = '0';
    if (statusInput) statusInput.value = 'active';
    if (urlInput) urlInput.value = '';
    if (previewImg) {
        previewImg.src = '';
        previewImg.classList.add('hidden');
    }
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.innerHTML = `
            <div style="padding:20px;">
                <p style="margin-bottom:10px;">输入图片URL</p>
                <input type="text" id="bannerImageUrl" placeholder="https://example.com/image.jpg" 
                    style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;margin-bottom:10px;">
                <button onclick="previewImageInput()" style="padding:6px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">预览</button>
            </div>
        `;
    }
    
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
                currentImageUrl = banner.image;
                if (urlInput) urlInput.value = banner.image;
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

// 保存Banner（简化版，直接使用URL）
async function saveBanner() {
    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const sortInput = document.getElementById('bannerSort');
    const statusInput = document.getElementById('bannerStatus');
    const urlInput = document.getElementById('bannerImageUrl');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const subtitle = subtitleInput ? subtitleInput.value.trim() : '';
    const sort = sortInput ? parseInt(sortInput.value) || 0 : 0;
    const status = statusInput ? statusInput.value : 'active';
    const imageUrl = urlInput ? urlInput.value.trim() : currentImageUrl;
    
    if (!title) {
        alert('请输入标题');
        return;
    }
    
    if (!imageUrl) {
        alert('请输入图片URL');
        return;
    }
    
    const bannerData = {
        title,
        subtitle,
        sort,
        status,
        image: imageUrl
    };
    
    const saveBtn = document.querySelector('.modal-footer .btn-primary');
    if (saveBtn) {
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;
    }
    
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
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
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
    } finally {
        if (saveBtn) {
            saveBtn.textContent = '保存';
            saveBtn.disabled = false;
        }
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
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
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
