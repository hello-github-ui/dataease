/**
 * S2 表格补丁文件 - 实例数据修正版
 * 解决多级表头显示问题
 */

// 立即自执行函数
(function() {
    // 日志显示函数，确保能引起注意
    function patchLog(...args) {
        console.log('%c[S2_PATCH_V3]', 'background:#2D8CF0; color:white; font-size:12px; padding:2px 5px; border-radius:3px;', ...args);
    }

    // 错误日志
    function patchError(...args) {
        console.error('%c[S2_PATCH_V3_ERROR]', 'background:red; color:white; font-size:12px; padding:2px 5px; border-radius:3px;', ...args);
    }

    // 显示启动信息
    patchLog('AntV S2 表头修复补丁已加载! - 数据结构修正版');

    // 用于存储已知的字段ID到名称的映射
    const fieldIdToNameMap = new Map();
    
    // 记录已处理过的实例ID，避免重复处理
    const processedInstanceIds = new Set();
    
    // 日志记录和调试用索引号
    let patchAttemptCounter = 0;

    // 从所有可能的数据源收集字段ID到中文名的映射
    function collectAllFieldMappings() {
        patchLog('开始收集字段ID与中文名的映射关系...');
        try {
            // 1. 从Vue全局存储中收集
            if (window.__VUE__ && window.__VUE__.app) {
                try {
                    const app = window.__VUE__.app;
                    if (app._instance && app._instance.ctx && app._instance.ctx.dvMainStore) {
                        const dvMainStore = app._instance.ctx.dvMainStore;
                        // 检查视图数据
                        if (dvMainStore.viewsData) {
                            Object.values(dvMainStore.viewsData).forEach(view => {
                                if (view && view.xAxis) {
                                    const fields = (view.xAxis || []).concat(view.yAxis || []);
                                    fields.forEach(field => {
                                        if (field.dataeaseName && field.name) {
                                            fieldIdToNameMap.set(field.dataeaseName, field.name);
                                            patchLog(`从Store添加映射: ${field.dataeaseName} => ${field.name}`);
                                        }
                                    });
                                }
                            });
                        }
                    }
                } catch (e) {
                    patchError('从Vue存储收集映射时出错:', e);
                }
            }
            // 2. 查找页面上的S2实例，收集更多映射
            const s2Instances = findAllS2Instances();
            s2Instances.forEach(instance => {
                try {
                    // 从chart定义收集
                    if (instance.options && instance.options.chart) {
                        const chart = instance.options.chart;
                        const fields = (chart.xAxis || []).concat(chart.yAxis || []);
                        fields.forEach(field => {
                            if (field.dataeaseName && field.name) {
                                fieldIdToNameMap.set(field.dataeaseName, field.name);
                                patchLog(`从S2实例添加映射: ${field.dataeaseName} => ${field.name}`);
                            }
                        });
                    }
                    // 从meta收集
                    if (instance.dataCfg && instance.dataCfg.meta) {
                        instance.dataCfg.meta.forEach(meta => {
                            if (meta.field && meta.name) {
                                fieldIdToNameMap.set(meta.field, meta.name);
                            }
                        });
                    }
                } catch (e) {
                    patchError('从S2实例收集映射时出错:', e);
                }
            });
            // 3. 添加手动映射（从截图或控制台输出中观察到的）
            addManualMappings();
            patchLog(`映射收集完成，共有${fieldIdToNameMap.size}个映射`);
        } catch (e) {
            patchError('收集映射时出错:', e);
        }
    }

    // 查找页面中的所有S2实例
    function findAllS2Instances() {
        const s2Instances = [];
        try {
            // 1. 查找canvas元素
            const canvasElements = document.querySelectorAll('canvas');
            canvasElements.forEach(canvas => {
                try {
                    // 检查canvas是否属于S2表格
                    if (canvas.parentElement && (
                        canvas.parentElement.classList.contains('antv-s2-container') ||
                        canvas.parentElement.classList.contains('antv-s2')
                    )) {
                        // 尝试从canvas或其父元素获取S2实例
                        const s2Instance = canvas.__s2_instance__ || 
                                          canvas.parentElement.__s2_instance__ || 
                                          canvas.parentElement.__S2_INSTANCE__ ||
                                          canvas.parentElement._s2Instance;
                        if (s2Instance && typeof s2Instance.render === 'function') {
                            s2Instances.push(s2Instance);
                        }
                    }
                } catch (e) {
                    // 忽略单个canvas处理错误
                }
            });
            // 2. 查找Vue组件实例中的S2
            const potentialComponents = document.querySelectorAll('.canvas-content, [data-chart-id]');
            potentialComponents.forEach(el => {
                try {
                    if (el.__vue__) {
                        const vue = el.__vue__;
                        // 查找可能包含S2实例的属性
                        const possibleProps = ['myChart', 's2', 'chartInstance', 'chart'];
                        for (const prop of possibleProps) {
                            if (vue[prop] && typeof vue[prop].render === 'function') {
                                s2Instances.push(vue[prop]);
                                break;
                            }
                        }
                        // 查找$refs中的实例
                        if (vue.$refs) {
                            for (const key in vue.$refs) {
                                const ref = vue.$refs[key];
                                if (ref && typeof ref.render === 'function') {
                                    s2Instances.push(ref);
                                }
                            }
                        }
                    }
                } catch (e) {
                    // 忽略单个组件处理错误
                }
            });
            patchLog(`找到${s2Instances.length}个S2实例`);
        } catch (e) {
            patchError('查找S2实例时出错:', e);
        }
        return s2Instances;
    }

    // 添加已知的手动映射
    function addManualMappings() {
        // 添加一些手动映射（从截图中看到的）
        const manualMappings = [
            { id: "d5c3d494-a43", name: "冷/热" },
            { id: "f_68bd7361c951941a", name: "冷/热" },
            { id: "f_f8fc4f728f1e6fa2", name: "品线" },
            { id: "f_47f238401ac173f1", name: "杯均价" },
            { id: "f_878cf3320c82724f", name: "单价" },
            { id: "5c346f5e-ad3", name: "组合标题" }
        ];
        manualMappings.forEach(mapping => {
            fieldIdToNameMap.set(mapping.id, mapping.name);
            patchLog(`手动添加映射: ${mapping.id} => ${mapping.name}`);
        });
    }

    // 修复S2实例的表头配置
    function fixS2InstanceHeaders(instance) {
        try {
            // 检查实例是否已处理过
            if (!instance || !instance.dataCfg || processedInstanceIds.has(instance.id)) {
                return false;
            }
            patchAttemptCounter++;
            patchLog(`修复S2实例 #${patchAttemptCounter}, id: ${instance.id}`);
            let modified = false;
            // 1. 修复meta配置
            if (instance.dataCfg.meta) {
                instance.dataCfg.meta.forEach(meta => {
                    if (meta.field && fieldIdToNameMap.has(meta.field) && meta.name !== fieldIdToNameMap.get(meta.field)) {
                        meta.name = fieldIdToNameMap.get(meta.field);
                        modified = true;
                        patchLog(`修复meta: ${meta.field} => ${meta.name}`);
                    }
                });
            }
            // 2. 修复columns结构
            if (instance.dataCfg.fields && instance.dataCfg.fields.columns) {
                const fixColumns = (columns) => {
                    if (!columns || !Array.isArray(columns)) return false;
                    let columnModified = false;
                    columns.forEach(col => {
                        // 尝试各种可能的key字段
                        const key = col.key || col.field;
                        if (key && fieldIdToNameMap.has(key) && col.name !== fieldIdToNameMap.get(key)) {
                            col.name = fieldIdToNameMap.get(key);
                            columnModified = true;
                            patchLog(`修复column: ${key} => ${col.name}`);
                        }
                        // 递归处理子节点
                        if (col.children && col.children.length > 0) {
                            const childrenModified = fixColumns(col.children);
                            columnModified = columnModified || childrenModified;
                        }
                    });
                    return columnModified;
                };
                const columnsModified = fixColumns(instance.dataCfg.fields.columns);
                modified = modified || columnsModified;
            }
            // 3. 修复节点标签
            if (instance.facet) {
                try {
                    const colNodes = instance.facet.columnHeader?.cornerNodes || 
                                    instance.facet.columnHeader?.columnsNodes;
                    if (colNodes && colNodes.length > 0) {
                        const fixNodeLabels = (nodes) => {
                            if (!nodes) return false;
                            let nodeModified = false;
                            nodes.forEach(node => {
                                const fieldId = node.field || node.key || node.value;
                                if (fieldId && fieldIdToNameMap.has(fieldId) && 
                                    node.label !== fieldIdToNameMap.get(fieldId)) {
                                    node.label = fieldIdToNameMap.get(fieldId);
                                    nodeModified = true;
                                    patchLog(`修复节点标签: ${fieldId} => ${node.label}`);
                                }
                                // 递归处理子节点
                                if (node.children && node.children.length) {
                                    const childrenModified = fixNodeLabels(node.children);
                                    nodeModified = nodeModified || childrenModified;
                                }
                            });
                            return nodeModified;
                        };
                        const nodesModified = fixNodeLabels(colNodes);
                        modified = modified || nodesModified;
                    }
                } catch (e) {
                    patchError('修复节点标签时出错:', e);
                }
            }
            // 4. 如果有修改，重新渲染
            if (modified) {
                patchLog(`S2实例 ${instance.id} 修复成功，现在重新渲染...`);
                instance.render(false);
                processedInstanceIds.add(instance.id);
                return true;
            } else {
                patchLog(`S2实例 ${instance.id} 无需修复`);
                return false;
            }
        } catch (e) {
            patchError('修复S2实例时出错:', e);
            return false;
        }
    }

    // 执行一次完整的修复
    function runFullFix() {
        // 1. 收集所有映射
        collectAllFieldMappings();
        // 2. 查找并修复所有实例
        const s2Instances = findAllS2Instances();
        patchLog(`准备修复${s2Instances.length}个S2实例`);
        let fixedCount = 0;
        s2Instances.forEach(instance => {
            const fixed = fixS2InstanceHeaders(instance);
            if (fixed) fixedCount++;
        });
        patchLog(`修复完成，成功修复了${fixedCount}个实例`);
    }

    // 设置观察器监视DOM变化，可能有新的S2实例加载
    function setupMutationObserver() {
        patchLog('设置DOM变化观察器，监视新S2实例');
        const observer = new MutationObserver(() => {
            // 当DOM发生变化时，查找并修复新的S2实例
            const s2Instances = findAllS2Instances();
            s2Instances.forEach(instance => {
                // 只处理未处理过的实例
                if (!processedInstanceIds.has(instance.id)) {
                    fixS2InstanceHeaders(instance);
                }
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        patchLog('DOM观察器已设置');
    }

    // 公开API函数
    window.fixS2TableHeaders = {
        // 执行一次完整修复
        fix: runFullFix,
        // 收集映射
        collectMappings: collectAllFieldMappings,
        // 添加映射
        addMapping: (id, name) => {
            fieldIdToNameMap.set(id, name);
            patchLog(`手动添加映射: ${id} => ${name}`);
        },
        // 获取当前映射
        getMappings: () => {
            return Array.from(fieldIdToNameMap.entries()).map(([id, name]) => ({id, name}));
        },
        // 修复指定S2实例
        fixInstance: (instance) => {
            if (instance && typeof instance.render === 'function') {
                return fixS2InstanceHeaders(instance);
            }
            return false;
        }
    };
    // 初始化修复
    function initialize() {
        patchLog('初始化S2表头修复补丁');
        // 执行初次修复
        runFullFix();
        // 设置观察器，监听DOM变化
        setupMutationObserver();
        // 定期检查是否有新实例
        setInterval(() => {
            const s2Instances = findAllS2Instances();
            s2Instances.forEach(instance => {
                // 只处理未处理过的实例
                if (!processedInstanceIds.has(instance.id)) {
                    fixS2InstanceHeaders(instance);
                }
            });
        }, 5000);
    }
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // 延时初始化，等待Vue应用完全启动
        setTimeout(initialize, 1000);
    }
    // 页面完全加载后再次尝试
    window.addEventListener('load', () => {
        setTimeout(runFullFix, 2000);
    });
})();

export default {
    name: 'S2TablePatch',
    description: '修复 S2 表格多级表头显示问题（实例配置修正版）'
}; 