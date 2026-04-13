// Banner管理
const API_BASE = '/api';
let banners = [];
let currentImageBase64 = '';
let editingId = null;
let deleteTargetId = null;
let isUploading = false; // 上传状态标记

// 加载Banner列表
async function loadBanners() {
    try {
        const res = await fetch(`${API_BASE}/banners`);
        const data = await res.json();
        if (data.success) {
            banners = data.data || [];
            console.log('[loadBanners] Loaded banners:', banners);
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

// HTML转义函数
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 渲染Banner列表
function renderBanners() {
    const tbody = document.getElementById('bannerList');
    if (!tbody) return;

    console.log('[renderBanners] banners data:', banners);

    if (banners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999;">暂无Banner，点击右上角新增</td></tr>';
        return;
    }

    tbody.innerHTML = banners.map((banner, index) => {
        // 优先使用 imageUrl，其次是 image
        const imageUrl = banner.imageUrl || banner.image;
        console.log(`[renderBanners] Banner ${index}:`, { 
            id: banner._id, 
            image: banner.image ? '【有图片】' : '【无】', 
            imageUrl: banner.imageUrl ? '【有图片】' : '【无】', 
            title: banner.title 
        });

        // 确保标题正确显示
        const title = banner.title || '未命名Banner';
        const subtitle = banner.subtitle || '-';

        return `
        <tr>
            <td>${banner.sort !== undefined ? banner.sort : index + 1}</td>
            <td>
                ${imageUrl ?
                    `<img src="${escapeHtml(imageUrl)}" style="height:60px;width:120px;object-fit:cover;border-radius:6px;" onerror="this.onerror=null;this.parentElement.innerHTML='<div style=\'height:60px;width:120px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;\'>加载失败</div>';">` :
                    '<div style="height:60px;width:120px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;">无图片</div>'
                }
            </td>
            <td style="font-weight:500;">${escapeHtml(title)}</td>
            <td style="color:#666;">${escapeHtml(subtitle)}</td>
            <td>
                <span class="status-badge ${banner.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${banner.status === 'active' ? '显示' : '隐藏'}
                </span>
            </td>
            <td>
                <button class="action-btn btn-edit" onclick="editBanner('${banner._id}')">编辑</button>
                <button class="action-btn btn-delete" onclick="showDeleteConfirm('${banner._id}')">删除</button>
            </td>
        </tr>
    `}).join('');
}

// 预览图片并上传到云存储
async function previewImage(event) {
    console.log('[previewImage] File selected:', event.target.files);
    const file = event.target.files[0];
    if (!file) {
        console.log('[previewImage] No file selected');
        return;
    }

    console.log('[previewImage] File:', file.name, 'Size:', file.size);

    if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过2MB');
        return;
    }

    // 设置上传中状态
    isUploading = true;
    updateUploadUI(true);

    // 先显示本地预览
    const reader = new FileReader();
    reader.onload = async (e) => {
        const localPreview = e.target.result;
        
        const img = document.getElementById('previewImg');
        const placeholder = document.getElementById('uploadPlaceholder');
        if (img) {
            img.src = localPreview;
            img.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // 上传到云存储
        try {
            console.log('[previewImage] Uploading to cloud storage...');
            const result = await uploadToCloudStorage(file);
            currentImageBase64 = result;
            console.log('[previewImage] Upload success, URL:', currentImageBase64.substring(0, 100) + '...');
        } catch (err) {
            console.error('[previewImage] Upload failed:', err);
            alert('图片上传失败，请重试');
            currentImageBase64 = '';
            // 重置预览
            if (img) {
                img.src = '';
                img.classList.add('hidden');
            }
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        } finally {
            // 重置上传状态
            isUploading = false;
            updateUploadUI(false);
        }
    };
    reader.onerror = (e) => {
        console.error('[previewImage] FileReader error:', e);
        alert('图片读取失败');
        isUploading = false;
        updateUploadUI(false);
    };
    reader.readAsDataURL(file);
}

// 更新上传状态UI
function updateUploadUI(uploading) {
    const saveBtn = document.querySelector('#modal .btn-primary');
    const uploadArea = document.querySelector('.image-upload');
    
    if (saveBtn) {
        saveBtn.disabled = uploading;
        saveBtn.textContent = uploading ? '图片上传中...' : '保存';
    }
    
    if (uploadArea) {
        uploadArea.style.pointerEvents = uploading ? 'none' : '';
        uploadArea.style.opacity = uploading ? '0.6' : '';
    }
}

// 上传文件到云存储（通过后端API）
async function uploadToCloudStorage(file) {
    try {
        // 使用 FormData 上传文件到后端 API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'banners');
        
        console.log('[uploadToCloudStorage] Uploading via API...');
        
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[uploadToCloudStorage] API response:', result);
        
        if (result.success && result.data && result.data.url) {
            return result.data.url;
        } else {
            throw new Error(result.error || 'Failed to get file URL');
        }
    } catch (err) {
        console.error('[uploadToCloudStorage] Error:', err);
        // 如果API上传失败，尝试使用 base64 作为备选方案
        return await uploadAsBase64(file);
    }
}

// 备选方案：使用 base64 编码上传
async function uploadAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = e.target.result;
                // 如果文件太大，拒绝上传
                if (base64.length > 500 * 1024) {
                    reject(new Error('图片太大，请选择小于 300KB 的图片'));
                    return;
                }
                resolve(base64);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (e) => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

// 打开弹窗
function openModal(bannerId = null) {
    console.log('[openModal] Opening modal, bannerId:', bannerId);
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
            const bannerImage = banner.imageUrl || banner.image;
            if (bannerImage) {
                currentImageBase64 = bannerImage;
                if (previewImg) {
                    previewImg.src = bannerImage;
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
    currentImageBase64 = '';
}

// 保存Banner
async function saveBanner() {
    console.log('[saveBanner] Starting save, editingId:', editingId);
    
    // 检查是否正在上传图片
    if (isUploading) {
        alert('图片正在上传中，请稍候...');
        return;
    }
    
    const titleInput = document.getElementById('bannerTitle');
    const subtitleInput = document.getElementById('bannerSubtitle');
    const sortInput = document.getElementById('bannerSort');
    const statusInput = document.getElementById('bannerStatus');

    const title = titleInput ? titleInput.value.trim() : '';
    const subtitle = subtitleInput ? subtitleInput.value.trim() : '';
    const sort = sortInput ? parseInt(sortInput.value) || 0 : 0;
    const status = statusInput ? statusInput.value : 'active';

    console.log('[saveBanner] Form data:', { title, subtitle, sort, status, hasImage: !!currentImageBase64 });

    if (!title) {
        alert('请输入标题');
        return;
    }

    // 检查是否有图片（新增时必须上传图片）
    if (!editingId && !currentImageBase64) {
        alert('请上传Banner图片');
        return;
    }

    // 编辑时如果没有新图片，保留原图片
    let imageUrl = currentImageBase64;
    if (editingId && !currentImageBase64) {
        const existingBanner = banners.find(b => b._id === editingId);
        if (existingBanner) {
            imageUrl = existingBanner.imageUrl || existingBanner.image;
            console.log('[saveBanner] Using existing image');
        }
    }

    if (!imageUrl) {
        alert('请上传Banner图片');
        return;
    }

    const bannerData = {
        title,
        subtitle,
        sort,
        status,
        image: imageUrl
    };

    console.log('[saveBanner] Sending banner data:', { ...bannerData, image: imageUrl.substring(0, 50) + '...' });

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
        console.log('[saveBanner] Server response:', result);

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

// 显示删除确认弹窗
function showDeleteConfirm(id) {
    deleteTargetId = id;
    const confirmModal = document.getElementById('deleteConfirmModal');
    if (confirmModal) {
        confirmModal.classList.add('active');
    } else {
        // 如果没有自定义弹窗，使用原生 confirm
        if (confirm('确定要删除这个Banner吗？')) {
            doDelete();
        }
    }
}

// 关闭删除确认弹窗
function closeDeleteConfirm() {
    deleteTargetId = null;
    const confirmModal = document.getElementById('deleteConfirmModal');
    if (confirmModal) {
        confirmModal.classList.remove('active');
    }
}

// 确认删除
async function confirmDelete() {
    await doDelete();
    closeDeleteConfirm();
}

// 执行删除
async function doDelete() {
    if (!deleteTargetId) return;

    try {
        const res = await fetch(`${API_BASE}/banners?id=${deleteTargetId}`, {
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
    console.log('[DOMContentLoaded] Banner page loaded');
    loadBanners();
});