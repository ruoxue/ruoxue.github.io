// 族谱数据管理
class FamilyTree {
    constructor() {
        this.members = [];
        this.loadFromStorage();
        this.init();
    }

    init() {
        this.renderTree();
        this.renderMemberList();
        this.updateDropdowns();
        this.setupEventListeners();
    }

    // 从localStorage加载数据
    loadFromStorage() {
        const stored = localStorage.getItem('familyTreeData');
        if (stored) {
            this.members = JSON.parse(stored);
        } else {
            // 初始化示例数据
            this.initSampleData();
        }
    }

    // 保存到localStorage
    saveToStorage() {
        localStorage.setItem('familyTreeData', JSON.stringify(this.members));
    }

    // 初始化示例数据
    initSampleData() {
        const sampleMembers = [
            {
                id: '1',
                name: '李上凡',
                gender: 'male',
                birthDate: '1989-03-01',
                deathDate: '',
                generation: 1,
                fatherId: null,
                motherId: null,
                spouseId: '2',
                description: '家族创始人'
            },
            {
                id: '2',
                name: '侯清丽',
                gender: 'female',
                birthDate: '1993-10-16',
                deathDate: '',
                generation: 1,
                fatherId: null,
                motherId: null,
                spouseId: '1',
                description: '创始人配偶'
            },           
        ];
        this.members = sampleMembers;
        this.saveToStorage();
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    // 添加成员
    addMember(memberData) {
        const member = {
            id: this.generateId(),
            ...memberData,
            generation: parseInt(memberData.generation) || 1
        };
        this.members.push(member);
        this.saveToStorage();
        this.renderTree();
        this.renderMemberList();
        this.updateDropdowns();
        return member;
    }

    // 更新成员
    updateMember(id, memberData) {
        const index = this.members.findIndex(m => m.id === id);
        if (index !== -1) {
            this.members[index] = {
                ...this.members[index],
                ...memberData,
                generation: parseInt(memberData.generation) || this.members[index].generation
            };
            this.saveToStorage();
            this.renderTree();
            this.renderMemberList();
            this.updateDropdowns();
            return this.members[index];
        }
        return null;
    }

    // 删除成员
    deleteMember(id) {
        // 检查是否有子代
        const hasChildren = this.members.some(m => 
            m.fatherId === id || m.motherId === id
        );
        
        if (hasChildren) {
            return { success: false, message: '该成员有子代，无法删除。请先删除或修改子代关系。' };
        }

        const member = this.members.find(m => m.id === id);
        if (member && member.spouseId) {
            // 清除配偶关系
            const spouseIndex = this.members.findIndex(m => m.id === member.spouseId);
            if (spouseIndex !== -1) {
                this.members[spouseIndex].spouseId = null;
            }
        }

        this.members = this.members.filter(m => m.id !== id);
        this.saveToStorage();
        this.renderTree();
        this.renderMemberList();
        this.updateDropdowns();
        return { success: true };
    }

    // 根据ID获取成员
    getMember(id) {
        return this.members.find(m => m.id === id);
    }

    // 获取所有成员（可选筛选）
    getMembers(filters = {}) {
        let filtered = [...this.members];

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(search)
            );
        }

        if (filters.generation) {
            filtered = filtered.filter(m => 
                m.generation === parseInt(filters.generation)
            );
        }

        if (filters.gender) {
            filtered = filtered.filter(m => m.gender === filters.gender);
        }

        return filtered;
    }

    // 获取根节点（第一代成员）
    getRootMembers() {
        return this.members.filter(m => 
            m.generation === 1 || (!m.fatherId && !m.motherId)
        );
    }

    // 获取子代
    getChildren(id) {
        return this.members.filter(m => 
            m.fatherId === id || m.motherId === id
        );
    }

    // 更新下拉列表
    updateDropdowns() {
        const fatherSelect = document.getElementById('memberFather');
        const motherSelect = document.getElementById('memberMother');
        const spouseSelect = document.getElementById('memberSpouse');
        const currentId = document.getElementById('memberId').value;

        const updateSelect = (select, genderFilter = null) => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">无</option>';
            
            this.members.forEach(member => {
                if (member.id !== currentId) {
                    if (!genderFilter || member.gender === genderFilter) {
                        const option = document.createElement('option');
                        option.value = member.id;
                        option.textContent = member.name;
                        select.appendChild(option);
                    }
                }
            });

            if (currentValue) {
                select.value = currentValue;
            }
        };

        updateSelect(fatherSelect, 'male');
        updateSelect(motherSelect, 'female');
        updateSelect(spouseSelect);

        // 更新世代筛选
        const generationSelect = document.getElementById('filterGeneration');
        const generations = [...new Set(this.members.map(m => m.generation))].sort((a, b) => a - b);
        const currentGen = generationSelect.value;
        generationSelect.innerHTML = '<option value="">所有世代</option>';
        generations.forEach(gen => {
            const option = document.createElement('option');
            option.value = gen;
            option.textContent = `第${gen}代`;
            generationSelect.appendChild(option);
        });
        if (currentGen) generationSelect.value = currentGen;
    }

    // 渲染家族树
    renderTree() {
        const container = document.getElementById('treeCanvas');
        container.innerHTML = '';

        const filtered = this.getMembers(this.getFilters());
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🌳</div>
                    <div class="empty-state-text">暂无成员数据</div>
                </div>
            `;
            return;
        }

        // 按世代分组
        const byGeneration = {};
        filtered.forEach(member => {
            const gen = member.generation || 1;
            if (!byGeneration[gen]) {
                byGeneration[gen] = [];
            }
            byGeneration[gen].push(member);
        });

        const generations = Object.keys(byGeneration).map(Number).sort((a, b) => a - b);
        const nodeWidth = 180;
        const nodeHeight = 100;
        const generationSpacing = 250;
        const nodeSpacing = 200;
        const startY = 50;

        const nodes = {};
        const lines = [];

        // 绘制每个世代
        generations.forEach((gen, genIndex) => {
            const members = byGeneration[gen];
            const startX = (container.offsetWidth - (members.length - 1) * nodeSpacing) / 2;
            const y = startY + genIndex * generationSpacing;

            members.forEach((member, index) => {
                const x = startX + index * nodeSpacing;
                nodes[member.id] = { member, x, y };
            });
        });

        // 绘制连接线
        Object.values(nodes).forEach(node => {
            const { member, x, y } = node;
            
            // 连接父母
            if (member.fatherId && nodes[member.fatherId]) {
                const father = nodes[member.fatherId];
                lines.push({
                    type: 'parent',
                    from: { x: father.x + nodeWidth / 2, y: father.y + nodeHeight },
                    to: { x: x + nodeWidth / 2, y: y }
                });
            }

            // 连接配偶
            if (member.spouseId && nodes[member.spouseId]) {
                const spouse = nodes[member.spouseId];
                if (member.id < member.spouseId) { // 只绘制一次
                    lines.push({
                        type: 'spouse',
                        from: { x: x + nodeWidth, y: y + nodeHeight / 2 },
                        to: { x: spouse.x, y: spouse.y + nodeHeight / 2 }
                    });
                }
            }
        });

        // 绘制连接线
        lines.forEach(line => {
            if (line.type === 'parent') {
                // 垂直线
                const vLine = document.createElement('div');
                vLine.className = 'tree-line vertical';
                vLine.style.left = line.from.x + 'px';
                vLine.style.top = line.from.y + 'px';
                vLine.style.height = (line.to.y - line.from.y) + 'px';
                container.appendChild(vLine);

                // 水平线
                const hLine = document.createElement('div');
                hLine.className = 'tree-line horizontal';
                hLine.style.left = Math.min(line.from.x, line.to.x) + 'px';
                hLine.style.top = line.to.y + 'px';
                hLine.style.width = Math.abs(line.to.x - line.from.x) + 'px';
                container.appendChild(hLine);
            } else if (line.type === 'spouse') {
                // 配偶连接线
                const sLine = document.createElement('div');
                sLine.className = 'tree-line horizontal';
                sLine.style.left = line.from.x + 'px';
                sLine.style.top = line.from.y + 'px';
                sLine.style.width = (line.to.x - line.from.x) + 'px';
                container.appendChild(sLine);
            }
        });

        // 绘制节点
        Object.values(nodes).forEach(node => {
            const { member, x, y } = node;
            const nodeElement = this.createTreeNode(member, x, y);
            container.appendChild(nodeElement);
        });

        // 更新容器高度
        if (generations.length > 0) {
            const maxY = Math.max(...Object.values(nodes).map(n => n.y));
            container.style.minHeight = (maxY + nodeHeight + 50) + 'px';
        }
    }

    // 创建树节点元素
    createTreeNode(member, x, y) {
        const node = document.createElement('div');
        node.className = `tree-node ${member.gender}`;
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.dataset.id = member.id;

        const name = document.createElement('div');
        name.className = 'tree-node-name';
        name.textContent = member.name;

        const info = document.createElement('div');
        info.className = 'tree-node-info';
        const infoText = [];
        if (member.birthDate) {
            const birthYear = new Date(member.birthDate).getFullYear();
            infoText.push(`${birthYear}年`);
        }
        if (member.deathDate) {
            const deathYear = new Date(member.deathDate).getFullYear();
            infoText.push(`- ${deathYear}年`);
        }
        info.textContent = infoText.join(' ');

        const genBadge = document.createElement('div');
        genBadge.className = 'tree-node-generation';
        genBadge.textContent = member.generation || 1;

        node.appendChild(name);
        node.appendChild(info);
        node.appendChild(genBadge);

        node.addEventListener('click', () => {
            this.showMemberDetail(member.id);
        });

        return node;
    }

    // 渲染成员列表
    renderMemberList() {
        const container = document.getElementById('memberList');
        container.innerHTML = '';

        const filtered = this.getMembers(this.getFilters());
        const sorted = filtered.sort((a, b) => {
            if (a.generation !== b.generation) {
                return a.generation - b.generation;
            }
            return a.name.localeCompare(b.name);
        });

        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state-text">暂无成员</div>';
            return;
        }

        sorted.forEach(member => {
            const item = document.createElement('div');
            item.className = 'member-item';
            item.dataset.id = member.id;

            const info = document.createElement('div');
            const name = document.createElement('div');
            name.className = 'member-item-name';
            name.textContent = member.name;
            const details = document.createElement('div');
            details.className = 'member-item-info';
            details.textContent = `第${member.generation}代 · ${member.gender === 'male' ? '男' : '女'}`;

            info.appendChild(name);
            info.appendChild(details);

            const actions = document.createElement('div');
            actions.className = 'member-item-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-action';
            editBtn.innerHTML = '✏️';
            editBtn.title = '编辑';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditModal(member.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-action';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = '删除';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除 ${member.name} 吗？`)) {
                    const result = this.deleteMember(member.id);
                    if (!result.success) {
                        alert(result.message);
                    }
                }
            });

            // actions.appendChild(editBtn);
            // actions.appendChild(deleteBtn);

            item.appendChild(info);
            item.appendChild(actions);

            item.addEventListener('click', () => {
                this.showMemberDetail(member.id);
                document.querySelectorAll('.member-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
            });

            container.appendChild(item);
        });
    }

    // 获取筛选条件
    getFilters() {
        return {
            search: document.getElementById('searchInput').value,
            generation: document.getElementById('filterGeneration').value,
            gender: document.getElementById('filterGender').value
        };
    }

    // 显示添加/编辑弹窗
    showEditModal(memberId = null) {
        const modal = document.getElementById('memberModal');
        const form = document.getElementById('memberForm');
        const title = document.getElementById('modalTitle');
        const idInput = document.getElementById('memberId');

        if (memberId) {
            const member = this.getMember(memberId);
            if (!member) return;

            title.textContent = '编辑家族成员';
            idInput.value = member.id;
            document.getElementById('memberName').value = member.name || '';
            document.getElementById('memberGender').value = member.gender || '';
            document.getElementById('memberBirthDate').value = member.birthDate || '';
            document.getElementById('memberDeathDate').value = member.deathDate || '';
            document.getElementById('memberGeneration').value = member.generation || 1;
            document.getElementById('memberDescription').value = member.description || '';
        } else {
            title.textContent = '添加家族成员';
            form.reset();
            idInput.value = '';
        }

        this.updateDropdowns();
        modal.classList.remove('hidden');
    }

    // 显示成员详情
    showMemberDetail(memberId) {
        const member = this.getMember(memberId);
        if (!member) return;

        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        const title = document.getElementById('detailTitle');

        title.textContent = member.name + ' 的详情';

        const father = member.fatherId ? this.getMember(member.fatherId) : null;
        const mother = member.motherId ? this.getMember(member.motherId) : null;
        const spouse = member.spouseId ? this.getMember(member.spouseId) : null;
        const children = this.getChildren(member.id);

        content.innerHTML = `
            <div class="detail-section">
                <h3>基本信息</h3>
                <div class="detail-info">
                    <div class="detail-label">姓名：</div>
                    <div class="detail-value">${member.name}</div>
                </div>
                <div class="detail-info">
                    <div class="detail-label">性别：</div>
                    <div class="detail-value">${member.gender === 'male' ? '男' : '女'}</div>
                </div>
                <div class="detail-info">
                    <div class="detail-label">世代：</div>
                    <div class="detail-value">第${member.generation}代</div>
                </div>
                ${member.birthDate ? `
                <div class="detail-info">
                    <div class="detail-label">出生日期：</div>
                    <div class="detail-value">${member.birthDate}</div>
                </div>
                ` : ''}
                ${member.deathDate ? `
                <div class="detail-info">
                    <div class="detail-label">去世日期：</div>
                    <div class="detail-value">${member.deathDate}</div>
                </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h3>家族关系</h3>
                ${father ? `
                <div class="detail-info">
                    <div class="detail-label">父亲：</div>
                    <div class="detail-value">${father.name}</div>
                </div>
                ` : ''}
                ${mother ? `
                <div class="detail-info">
                    <div class="detail-label">母亲：</div>
                    <div class="detail-value">${mother.name}</div>
                </div>
                ` : ''}
                ${spouse ? `
                <div class="detail-info">
                    <div class="detail-label">配偶：</div>
                    <div class="detail-value">${spouse.name}</div>
                </div>
                ` : ''}
                ${children.length > 0 ? `
                <div class="detail-info">
                    <div class="detail-label">子代：</div>
                    <div class="detail-value">${children.map(c => c.name).join('、')}</div>
                </div>
                ` : ''}
            </div>

            ${member.description ? `
            <div class="detail-section">
                <h3>备注</h3>
                <div class="detail-value">${member.description}</div>
            </div>
            ` : ''}

            <div class="detail-actions">
                <button class="btn btn-primary" style="display: none;" onclick="familyTree.showEditModal('${member.id}'); document.getElementById('detailModal').classList.add('hidden');">
                    编辑
                </button>
                <button class="btn btn-danger" style="display: none;" onclick="if(confirm('确定要删除 ${member.name} 吗？')) { const result = familyTree.deleteMember('${member.id}'); if(!result.success) alert(result.message); document.getElementById('detailModal').classList.add('hidden'); }">
                    删除
                </button>
                <button class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.add('hidden');">
                    关闭
                </button>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    // 导出数据
    exportData() {
        const dataStr = JSON.stringify(this.members, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `family-tree-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // 导入数据
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    if (confirm('导入数据将覆盖现有数据，确定继续吗？')) {
                        this.members = data;
                        this.saveToStorage();
                        this.renderTree();
                        this.renderMemberList();
                        this.updateDropdowns();
                        alert('数据导入成功！');
                    }
                } else {
                    alert('数据格式不正确！');
                }
            } catch (error) {
                alert('导入失败：' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // 设置事件监听
    setupEventListeners() {
        // 添加成员按钮
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.showEditModal();
        });

        // 关闭弹窗
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('memberModal').classList.add('hidden');
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            document.getElementById('memberModal').classList.add('hidden');
        });

        document.getElementById('closeDetailModal').addEventListener('click', () => {
            document.getElementById('detailModal').classList.add('hidden');
        });

        // 表单提交
        document.getElementById('memberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMember();
        });

        // 搜索
        document.getElementById('searchInput').addEventListener('input', () => {
            this.renderTree();
            this.renderMemberList();
        });

        document.getElementById('searchBtn').addEventListener('click', () => {
            this.renderTree();
            this.renderMemberList();
        });

        // 筛选
        document.getElementById('filterGeneration').addEventListener('change', () => {
            this.renderTree();
            this.renderMemberList();
        });

        document.getElementById('filterGender').addEventListener('change', () => {
            this.renderTree();
            this.renderMemberList();
        });

        // 导出/导入
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.importData(e.target.files[0]);
                }
            };
            input.click();
        });

        // 点击弹窗外部关闭
        document.getElementById('memberModal').addEventListener('click', (e) => {
            if (e.target.id === 'memberModal') {
                document.getElementById('memberModal').classList.add('hidden');
            }
        });

        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                document.getElementById('detailModal').classList.add('hidden');
            }
        });

        // 展开/收起全部（用于成员列表）
        document.getElementById('expandAllBtn').addEventListener('click', () => {
            // 展开所有成员项（如果有折叠功能）
            document.querySelectorAll('.member-item').forEach(item => {
                item.classList.add('active');
            });
        });

        document.getElementById('collapseAllBtn').addEventListener('click', () => {
            // 收起所有成员项
            document.querySelectorAll('.member-item').forEach(item => {
                item.classList.remove('active');
            });
        });
    }

    // 保存成员
    saveMember() {
        const id = document.getElementById('memberId').value;
        const formData = {
            name: document.getElementById('memberName').value,
            gender: document.getElementById('memberGender').value,
            birthDate: document.getElementById('memberBirthDate').value || null,
            deathDate: document.getElementById('memberDeathDate').value || null,
            generation: document.getElementById('memberGeneration').value || 1,
            fatherId: document.getElementById('memberFather').value || null,
            motherId: document.getElementById('memberMother').value || null,
            spouseId: document.getElementById('memberSpouse').value || null,
            description: document.getElementById('memberDescription').value || ''
        };

        // 更新配偶关系
        if (formData.spouseId) {
            const spouse = this.getMember(formData.spouseId);
            if (spouse && !spouse.spouseId) {
                spouse.spouseId = id || 'temp';
            }
        }

        if (id) {
            const oldMember = this.getMember(id);
            if (oldMember && oldMember.spouseId && oldMember.spouseId !== formData.spouseId) {
                const oldSpouse = this.getMember(oldMember.spouseId);
                if (oldSpouse) {
                    oldSpouse.spouseId = null;
                    this.updateMember(oldMember.spouseId, { spouseId: null });
                }
            }
            this.updateMember(id, formData);
        } else {
            const newMember = this.addMember(formData);
            if (formData.spouseId) {
                const spouse = this.getMember(formData.spouseId);
                if (spouse) {
                    spouse.spouseId = newMember.id;
                    this.updateMember(formData.spouseId, { spouseId: newMember.id });
                }
            }
        }

        document.getElementById('memberModal').classList.add('hidden');
    }
}

// 初始化应用
let familyTree;
document.addEventListener('DOMContentLoaded', () => {
    familyTree = new FamilyTree();
});

