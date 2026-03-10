// Banner管理
const API_BASE = '/api';
let banners = [];
let currentImageBase64 = '';

// 加载Banner列表
async function loadBanners() {
    try {
        const res = await fetch(`${API_BASE}/banners`);
        const data = await res.json();
        banners = data.data || [];
        renderBanners();
    } catch (err) {
        console.error('加载失败:', err);
        // 使用本地数据演示
        banners = [
            { _id: '1', title: '专业宠物美容', subtitle: '让您的爱宠焕然一新', image: '', sort: 1, status: 'active' }
        ];
        renderBanners();
    }
}

// 渲染Banner列表
function renderBanners() {
    const tbody = document.getElementById('bannerList');
    if (banners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">暂无Banner</td></tr>';
        return;
    }
    
    tbody.innerHTML = banners.map((banner, index) => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 text-slate-800">${banner.sort || index + 1}</td>
            <td class="px-6 py-4">
                ${banner.image ? 
                    `<img src="${banner.image}" class="h-16 w-32 object-cover rounded">` : 
                    '<div class="h-16 w-32 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">无图片</div>'
                }
            </td>
            <td class="px-6 py-4 text-slate-800 font-medium">${banner.title || '-'}</td>
            <td class="px-6 py-4 text-slate-600">${banner.subtitle || '-'}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${banner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">
                    ${banner.status === 'active' ? '显示' : '隐藏'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editBanner('${banner._id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">编辑</button>
                    <button onclick="deleteBanner('${banner._id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">删除</button>
                </div>
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
        document.getElementById('previewImg').src = currentImageBase64;
        document.getElementById('previewImg').classList.remove('hidden');
        document.querySelector('#imagePreview > div').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// 打开弹窗
function openModal(bannerId = null) {
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').classList.add('flex');
    
    // 重置表单
    document.getElementById('bannerId').value = '';
    document.getElementById('bannerTitle').value = '';
    document.getElementById('bannerSubtitle').value = '';
    document.getElementById('bannerSort').value = '0';
    document.getElementById('bannerStatus').value = 'active';
    document.getElementById('bannerImage').value = '';
    document.getElementById('previewImg').classList.add('hidden');
    document.querySelector('#imagePreview > div').classList.remove('hidden');
    currentImageBase64 = '';
    
    if (bannerId) {
        const banner = banners.find(b => b._id === bannerId);
        if (banner) {
            document.getElementById('modalTitle').textContent = '编辑Banner';
            document.getElementById('bannerId').value = banner._id;
            document.getElementById('bannerTitle').value = banner.title || '';
            document.getElementById('bannerSubtitle').value = banner.subtitle || '';
            document.getElementById('bannerSort').value = banner.sort || 0;
            document.getElementById('bannerStatus').value = banner.status || 'active';
            if (banner.image) {
                document.getElementById('previewImg').src = banner.image;
                document.getElementById('previewImg').classList.remove('hidden');
                document.querySelector('#imagePreview > div').classList.add('hidden');
                currentImageBase64 = banner.image;
            }
        }
    } else {
        document.getElementById('modalTitle').textContent = '新增Banner';
    }
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('flex');
}

// 保存Banner
async function saveBanner() {
    const id = document.getElementById('bannerId').value;
    const title = document.getElementById('bannerTitle').value.trim();
    const subtitle = document.getElementById('bannerSubtitle').value.trim();
    const sort = parseInt(document.getElementById('bannerSort').value) || 0;
    const status = document.getElementById('bannerStatus').value;
    
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
        const url = id ? `${API_BASE}/banners/${id}` : `${API_BASE}/banners`;
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bannerData)
        });
        
        if (res.ok) {
            closeModal();
            loadBanners();
        } else {
            alert('保存失败');
        }
    } catch (err) {
        console.error('保存失败:', err);
        // 模拟保存成功
        if (id) {
            const index = banners.findIndex(b => b._id === id);
            if (index > -1) {
                banners[index] = { ...banners[index], ...bannerData };
            }
        } else {
            banners.push({ _id: Date.now().toString(), ...bannerData });
        }
        closeModal();
        renderBanners();
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
        const res = await fetch(`${API_BASE}/banners/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadBanners();
        } else {
            alert('删除失败');
        }
    } catch (err) {
        console.error('删除失败:', err);
        banners = banners.filter(b => b._id !== id);
        renderBanners();
    }
}

// 页面加载
loadBanners();
