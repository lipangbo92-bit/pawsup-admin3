// Banner管理 - 带详细状态提示
const API_BASE = '/api';
let banners = [];
let currentImageBase64 = '';
let editingId = null;

// 显示状态消息
function showStatus(message, type = 'info') {
    console.log(`[Banner] ${type}: ${message}`);
    
    // 创建或更新状态提示元素
    let statusEl = document.getElementById('bannerStatusMsg');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'bannerStatusMsg';
        statusEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-break: break-all;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(statusEl);
    }
    
    const colors = {
        info: { bg: '#3b82f6', text: 'white' },
        success: { bg: '#10b981', text: 'white' },
        error: { bg: '#ef4444', text: 'white' },
        warning: { bg: '#f59e0b', text: 'white' }
    };
    
    const color = colors[type] || colors.info;
    statusEl.style.background = color.bg;
    statusEl.style.color = color.text;
    statusEl.textContent = message;
    statusEl.style.opacity = '1';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        statusEl.style.opacity = '0';
    }, 5000);
}

// 加载Banner列表
async function loadBanners() {
    showStatus('正在加载Banner列表...', 'info');
    try {
        const res = await fetch(`${API_BASE}/banners`);
        const data = await res.json();
        if (data.success) {
            banners = data.data || [];
            showStatus(`加载成功，共 ${banners.length} 条记录`, 'success');
        } else {
            banners = [];
            showStatus('加载失败: ' + (data.error || '未知错误'), 'error');
        }
        renderBanners();
    } catch (err) {
        console.error('加载失败:', err);
        showStatus('加载失败: ' + err.message, 'error');
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

// 压缩图片
function compressImage(base64, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// 预览图片
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) {
        showStatus('未选择文件', 'warning');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showStatus('图片大小不能超过5MB', 'error');
        return;
    }

    showStatus(`正在读取图片: ${file.name} (${(file.size/1024).toFixed(1)}KB)...`, 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
        let imageData = e.target.result;
        currentImageBase64 = imageData;

        const img = document.getElementById('previewImg');
        const placeholder = document.getElementById('uploadPlaceholder');
        if (img) {
            img.src = currentImageBase64;
            img.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        showStatus('图片已加载', 'success');

        // 异步压缩图片（如果大于 500KB）
        if (file.size > 500 * 1024) {
            showStatus('图片较大，正在压缩...', 'info');
            compressImage(imageData, 1200, 800, 0.8)
                .then(compressed => {
                    currentImageBase64 = compressed;
                    if (img) img.src = compressed;
                    const originalSize = (file.size / 1024).toFixed(1);
                    const compressedSize = (compressed.length / 1024 * 0.75).toFixed(1);
                    showStatus(`压缩完成: ${originalSize}KB → ${compressedSize}KB`, 'success');
                })
                .catch(err => {
                    showStatus('压缩失败: ' + err.message, 'error');
                });
        }
    };
    reader.onerror = () => {
        showStatus('读取图片失败', 'error');
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
    if (placeholder) {
        placeholder.style.display = 'block';
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

// 上传图片到云存储
async function uploadImageToCloud(base64Image) {
    showStatus('开始上传图片到云存储...', 'info');

    if (!base64Image) {
        showStatus('没有图片需要上传', 'warning');
        return '';
    }

    if (base64Image.startsWith('http') || base64Image.startsWith('cloud://')) {
        showStatus('图片已经是URL，跳过上传', 'info');
        return base64Image;
    }

    if (!base64Image.startsWith('data:')) {
        showStatus('图片格式不正确', 'error');
        return base64Image;
    }

    try {
        const timestamp = Date.now();
        const imageSize = (base64Image.length / 1024 * 0.75).toFixed(1);
        showStatus(`正在上传图片 (${imageSize}KB)...`, 'info');

        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'uploadImage',
                data: base64Image,
                path: `banners/banner_${timestamp}.jpg`
            })
        });

        showStatus(`上传响应状态: ${res.status}`, 'info');

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const result = await res.json();
        showStatus('上传响应已接收', 'info');

        if (result.success) {
            showStatus('图片上传成功!', 'success');
            return result.url || result.fileID;
        } else {
            throw new Error(result.error || '上传失败');
        }
    } catch (err) {
        showStatus('上传失败: ' + err.message, 'error');
        throw err;
    }
}

// 保存Banner
async function saveBanner() {
    showStatus('开始保存...', 'info');

    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const sortInput = document.getElementById('bannerSort');
    const statusInput = document.getElementById('bannerStatus');

    const title = titleInput ? titleInput.value.trim() : '';
    const subtitle = subtitleInput ? subtitleInput.value.trim() : '';
    const sort = sortInput ? parseInt(sortInput.value) || 0 : 0;
    const status = statusInput ? statusInput.value : 'active';

    if (!title) {
        showStatus('请输入标题', 'warning');
        return;
    }

    // 如果有新图片，先上传到云存储
    let imageUrl = currentImageBase64;
    showStatus(`检查图片: ${currentImageBase64 ? currentImageBase64.substring(0, 30) + '...' : '无图片'}`, 'info');

    if (currentImageBase64 && currentImageBase64.startsWith('data:')) {
        try {
            const uploadBtn = document.querySelector('.modal-footer .btn-primary');
            if (uploadBtn) {
                uploadBtn.textContent = '上传图片中...';
                uploadBtn.disabled = true;
            }

            imageUrl = await uploadImageToCloud(currentImageBase64);

            if (uploadBtn) {
                uploadBtn.textContent = '保存';
                uploadBtn.disabled = false;
            }
        } catch (err) {
            showStatus('图片上传失败: ' + err.message, 'error');
            const uploadBtn = document.querySelector('.modal-footer .btn-primary');
            if (uploadBtn) {
                uploadBtn.textContent = '保存';
                uploadBtn.disabled = false;
            }
            return;
        }
    } else {
        showStatus('没有新图片需要上传', 'info');
    }

    const bannerData = {
        title,
        subtitle,
        sort,
        status,
        image: imageUrl
    };

    showStatus('正在保存到数据库...', 'info');

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

        showStatus(`保存响应状态: ${res.status}`, 'info');

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const result = await res.json();

        if (result.success) {
            closeModal();
            await loadBanners();
            showStatus(editingId ? '更新成功!' : '新增成功!', 'success');
        } else {
            showStatus('保存失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (err) {
        showStatus('保存失败: ' + err.message, 'error');
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

    showStatus('正在删除...', 'info');

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
            showStatus('删除成功!', 'success');
        } else {
            showStatus('删除失败: ' + (result.error || '未知错误'), 'error');
        }
    } catch (err) {
        showStatus('删除失败: ' + err.message, 'error');
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    showStatus('页面加载完成，初始化...', 'info');
    loadBanners();
});
