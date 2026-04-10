// Banner管理
const API_BASE = '/api';
let banners = [];
let currentImageBase64 = '';
let editingId = null;
let deleteTargetId = null;

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
        console.log(`[renderBanners] Banner ${index}:`, { id: banner._id, image: banner.image, imageUrl: banner.imageUrl, title: banner.title });

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
    loadBanners();
});