<template>
    <div :id="containerId" class="table-container"></div>
    <div class="button-group">
        <el-button :effect="themes" @click="onCancelConfig">{{ t('chart.cancel') }}</el-button>
        <el-button type="primary" @click="onConfigChange">{{ t('chart.confirm') }}</el-button>
    </div>
    <div :id="menuGroupId" class="group-menu"></div>
</template>

<script setup lang="ts">
import { dvMainStoreWithOut } from '@/store/modules/data-visualization/dvMain'
import { formatterItem, valueFormatter } from '@/views/chart/components/js/formatter'
import {
    BaseTooltip,
    ColCell,
    ColumnNode,
    Node,
    S2DataConfig,
    S2Event,
    S2Options,
    TableSheet,
    TooltipShowOptions
} from '@antv/s2'
import { ElMessageBox } from 'element-plus-secondary'
import { cloneDeep, debounce, isEqual, isNumber } from 'lodash-es'
import { computed, nextTick, onMounted, onUnmounted, PropType } from 'vue'
import { uuid } from 'vue-uuid'
import { useI18n } from '@/hooks/web/useI18n'
import { getColumns, getCustomTheme } from '@/views/chart/components/js/panel/common/common_table'
import { fillColumnNames, getLeafNodes } from '@/views/chart/components/js/panel/common/common_table'

const { t } = useI18n()
const dvMainStore = dvMainStoreWithOut()
const props = defineProps({
    chart: {
        type: Object as PropType<ChartObj>,
        required: true
    },
    themes: {
        type: String as PropType<EditorTheme>,
        default: 'dark'
    },
    propertyInner: {
        type: Array<string>
    }
})
const emits = defineEmits(['onConfigChange', 'onCancelConfig'])
const onCancelConfig = () => {
    emits('onCancelConfig')
}

const onConfigChange = () => {
    // 1. 获取表头分组配置
    const headerGroupConfig = props.chart?.customAttr?.tableHeader?.headerGroupConfig || {};
    const columns = headerGroupConfig.columns || [];

    // 2. 获取所有字段定义
    const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);

    // 创建字段映射
    const fieldNameMap = {};
    allFields.forEach(field => {
        if (field.dataeaseName && field.name) {
            fieldNameMap[field.dataeaseName] = field.name;
        }
    });

    // 3. 递归确保 columns 的 name 字段正确
    function ensureColumnNames(columns) {
        if (!columns || !Array.isArray(columns)) return columns;

        return columns.map(col => {
            const result = { ...col };

            // 如果是分组节点（有children），递归处理子节点
            if (col.children && col.children.length > 0) {
                result.children = ensureColumnNames(col.children);
            }
            // 如果是叶子节点，确保有正确的名称
            else if (col.key && fieldNameMap[col.key] && !col.name) {
                result.name = fieldNameMap[col.key];
            }

            return result;
        });
    }

    const correctedColumns = ensureColumnNames(columns);

    // 4. 生成meta数据，只包含叶子节点
    const leafNodes = [];
    function collectLeafNodes(columns) {
        if (!columns) return;
        columns.forEach(col => {
            if (!col.children || col.children.length === 0) {
                leafNodes.push({
                    field: col.key,
                    name: col.name || fieldNameMap[col.key] || col.key
                });
            } else {
                collectLeafNodes(col.children);
            }
        });
    }
    collectLeafNodes(correctedColumns);

    // 5. 日志
    console.log('[表头配置确认] columns:', JSON.stringify(correctedColumns, null, 2));
    console.log('[表头配置确认] meta:', JSON.stringify(leafNodes, null, 2));

    // 6. 触发事件
    emits('onConfigChange', {
        columns: cloneDeep(correctedColumns),
        meta: cloneDeep(leafNodes)
    });
};

const init = () => {
    const chart = cloneDeep(props.chart)
    const xAxis = chart.xAxis
    const { headerGroupConfig } = chart.customAttr.tableHeader
    const showColumns = []
    xAxis?.forEach(axis => {
        axis.hide !== true && showColumns.push({ key: axis.dataeaseName })
    })
    if (!showColumns.length) {
        return
    }

    // 添加调试日志：打印所有字段和ID
    console.log('[表头分组弹窗-init] allFields:', chart.xAxis);

    // 为补丁收集映射
    if (window.fixS2TableHeaders) {
        chart.xAxis?.forEach(axis => {
            if (axis.dataeaseName && axis.name) {
                window.fixS2TableHeaders.addMapping(axis.dataeaseName, axis.name);
                console.log(`[表头分组弹窗-init] 添加字段映射: ${axis.dataeaseName} => ${axis.name}`);
            }
        });
    }

    if (!headerGroupConfig?.columns?.length) {
        chart.customAttr.tableHeader.headerGroupConfig = {
            columns: [...showColumns],
            meta: []
        }
    }
    // 优先用数据里的fields补全中文名，如果没有name则用xAxis/yAxis的name补全
    let allFields = [];
    if (chart.data && (chart.data.fields || chart.data.sourceFields)) {
        allFields = chart.data.fields || chart.data.sourceFields;
        const axisFields = (chart.xAxis || []).concat(chart.yAxis || []);
        allFields = allFields.map(f => {
            if (!f.name) {
                const axis = axisFields.find(a => a.dataeaseName === f.key || a.dataeaseName === f.dataeaseName);
                if (axis && axis.name) {
                    return { ...f, name: axis.name };
                }
            }
            return f;
        });
    } else {
        allFields = (chart.xAxis || []).concat(chart.yAxis || []);
    }
    // 日志打印
    console.log('[表头分组弹窗-init] allFields:', JSON.stringify(allFields, null, 2));
    console.log('[表头分组弹窗-init] columns:', JSON.stringify(chart.customAttr.tableHeader.headerGroupConfig.columns, null, 2));
    console.log('[表头分组弹窗-init] xAxis:', JSON.stringify(chart.xAxis, null, 2));
    console.log('[表头分组弹窗-init] yAxis:', JSON.stringify(chart.yAxis, null, 2));
    chart.customAttr.tableHeader.headerGroupConfig.columns = fillColumnNames(chart.customAttr.tableHeader.headerGroupConfig.columns, allFields);
    console.log('[表头分组弹窗-init] columnsWithName:', JSON.stringify(chart.customAttr.tableHeader.headerGroupConfig.columns, null, 2));
    nextTick(() => {
        renderTable(chart)
    })
}
const menuGroupId = computed(() => {
    return 'menu-group-' + props.chart.id
})
const containerId = computed(() => {
    return 'table-container-' + props.chart.id
})
let s2: TableSheet
const renderTable = (chart: ChartObj) => {
    const data = dvMainStore.getViewDataDetails(chart.id)
    const containerDom = document.getElementById(containerId.value)
    let realData = []
    if (data?.tableRow?.length) {
        realData = data.tableRow.slice(0, 10)
    }
    const { headerGroupConfig } = chart.customAttr.tableHeader

    // 收集所有字段ID到中文名称的映射
    const fieldNameMap = {};
    const allFields = (chart.xAxis || []).concat(chart.yAxis || []);

    // 从字段定义收集映射
    allFields.forEach(field => {
        if (field.dataeaseName && field.name) {
            fieldNameMap[field.dataeaseName] = field.name;
            console.log(`[表头分组设置] 字段映射: ${field.dataeaseName} => ${field.name}`);
        }
    });

    // 从数据字段收集映射
    if (chart.data && chart.data.fields) {
        chart.data.fields.forEach(field => {
            if ((field.dataeaseName || field.key) && field.name) {
                fieldNameMap[field.dataeaseName || field.key] = field.name;
            }
        });
    }

    // 递归修复 columns 结构中的名称
    function fixColumns(columns) {
        if (!columns || !Array.isArray(columns)) return columns;

        return columns.map(col => {
            const result = { ...col };

            // 如果是分组节点，递归处理子节点
            if (col.children && col.children.length > 0) {
                // 保留分组名称
                result.name = col.name || col.title || `分组${col.key.substring(0, 4)}`;
                result.children = fixColumns(col.children);
            }
            // 如果是叶子节点，从映射获取中文名
            else if (col.key) {
                // 使用映射中的中文名称
                if (fieldNameMap[col.key]) {
                    result.name = fieldNameMap[col.key];
                    console.log(`[表头分组设置] 设置字段 ${col.key} 名称为: ${result.name}`);
                }
            }

            return result;
        });
    }

    // 修复和应用columns配置
    const columns = fixColumns(headerGroupConfig.columns || []);
    console.log('[表头分组弹窗] 修复后的columns:', JSON.stringify(columns, null, 2));

    // 构建meta配置
    const leafNodes = [];
    function collectLeafNodes(columns) {
        if (!columns) return;
        columns.forEach(col => {
            if (!col.children || col.children.length === 0) {
                leafNodes.push({
                    field: col.key,
                    name: col.name || fieldNameMap[col.key] || col.key
                });
            } else {
                collectLeafNodes(col.children);
            }
        });
    }
    collectLeafNodes(columns);

    // 使用收集的叶子节点作为meta
    const meta = headerGroupConfig.meta && headerGroupConfig.meta.length > 0 ?
        headerGroupConfig.meta : leafNodes;

    // 确保meta中的name是正确的
    meta.forEach(item => {
        if (item.field && fieldNameMap[item.field]) {
            item.name = fieldNameMap[item.field];
        }
    });

    console.log('[表头分组弹窗] meta:', JSON.stringify(meta, null, 2));

    // data config
    const s2DataConfig: S2DataConfig = {
        fields: {
            columns
        },
        meta,
        data: realData
    }
    // options
    const s2Options: S2Options = {
        width: containerDom.getBoundingClientRect().width,
        height: containerDom.offsetHeight,
        tooltip: {
            getContainer: () => containerDom,
            renderTooltip: sheet => new GroupMenu(sheet),
            style: {
                position: 'absolute',
                borderRadius: '4px'
            }
        },
        interaction: {
            rangeSelection: false
        }
    }
    s2 = new TableSheet(containerDom, s2DataConfig, s2Options)
    const theme = getCustomTheme(chart)
    s2.setTheme(theme)
    const groupMenuContainer = document.getElementById(menuGroupId.value)
    s2.on(S2Event.COL_CELL_CONTEXT_MENU, e => {
        e.preventDefault()
        const curColumns = s2.dataCfg.fields.columns as Array<ColumnNode>
        console.log('curColumns: ', curColumns)
        const curMeta = s2.dataCfg.meta
        const activeCells = s2.interaction.getActiveCells()
        const colKeys = activeCells?.map(cell => cell.getMeta().field)
        const activeColumns = getColumns(colKeys, curColumns)
        const curCell = s2.getCell(e.target)
        groupMenuContainer.innerText = ''
        // 右键点击的目标单元格不在已选的单元格中，清空已选单元格，隐藏菜单
        if (activeColumns?.length) {
            const index = activeColumns.findIndex(cell => cell.key === curCell.getMeta().field)
            if (index === -1) {
                s2.interaction.clearState()
                s2.hideTooltip()
                return
            }
        }
        //只有一个cell，并且colIndex为-1，那就是组合的，显示取消分组按钮和重命名按钮
        if (activeColumns?.length === 1 && curCell.getMeta().colIndex === -1) {
            s2.interaction.clearState()
            s2.interaction.selectHeaderCell({ cell: curCell })
            const cancelBtn = document.createElement('span')
            groupMenuContainer.appendChild(cancelBtn)
            cancelBtn.innerText = t('chart.cancel_group')
            cancelBtn.onclick = () => {
                s2.hideTooltip()
                const parent = curCell.getMeta().parent
                if (parent?.id === 'root') {
                    const startIndex = curColumns.findIndex(cell => cell.key === curCell.getMeta().field)
                    const [curCol] = getColumns([curCell.getMeta().field], curColumns)
                    curColumns.splice(startIndex, 1, ...curCol.children)
                    const index = curMeta.findIndex(meta => meta.field === curCell.getMeta().field)
                    curMeta.splice(index, 1)
                    const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                    const filledColumns = fillColumnNames(curColumns, allFields);
                    emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(curMeta) })
                    s2.setDataCfg({
                        fields: {
                            columns: curColumns
                        },
                        meta: curMeta
                    })
                    s2.render(true)
                } else {
                    const [parentColumn] = getColumns([parent.field], curColumns)
                    if (parentColumn) {
                        const startIndex = parentColumn.children?.findIndex(
                            cell => cell.key === curCell.getMeta().field
                        )
                        const [curCol] = getColumns([curCell.getMeta().field], parentColumn.children)
                        parentColumn.children?.splice(startIndex, 1, ...curCol.children)
                        const index = curMeta.findIndex(meta => meta.field === curCell.getMeta().field)
                        curMeta.splice(index, 1)
                        const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                        const filledColumns = fillColumnNames(curColumns, allFields);
                        emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(curMeta) })
                        s2.setDataCfg({
                            fields: {
                                columns: curColumns
                            },
                            meta: curMeta
                        })
                        s2.render(true)
                    }
                }
                s2.interaction.clearState()
            }
            const cancelAllBtn = document.createElement('span')
            groupMenuContainer.appendChild(cancelAllBtn)
            cancelAllBtn.innerText = t('chart.cancel_all_group')
            cancelAllBtn.onclick = () => {
                s2.hideTooltip()
                const parent = curCell.getMeta().parent
                if (parent?.id === 'root') {
                    const [curCol] = getColumns([curCell.getMeta().field], curColumns)
                    const leafNodes = getLeafNodes(curCol.children)
                    const startIndex = curColumns.findIndex(cell => cell.key === curCell.getMeta().field)
                    curColumns.splice(startIndex, 1, ...leafNodes)
                    const noneLeafNodes = getNonLeafNodes([curCol])
                    const newMeta = curMeta.filter(meta => !noneLeafNodes.includes(meta.field))
                    const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                    const filledColumns = fillColumnNames(curColumns, allFields);
                    emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(newMeta) })
                    s2.setDataCfg({
                        fields: {
                            columns: curColumns
                        },
                        meta: newMeta
                    })
                    s2.render(true)
                } else {
                    const [parentColumn] = getColumns([parent.field], curColumns)
                    if (parentColumn) {
                        const [curCol] = getColumns([curCell.getMeta().field], parentColumn.children)
                        const leafNodes = getLeafNodes(curCol.children)
                        const startIndex = parentColumn.children?.findIndex(
                            cell => cell.key === curCell.getMeta().field
                        )
                        parentColumn.children?.splice(startIndex, 1, ...leafNodes)
                        const noneLeafNodes = getNonLeafNodes([curCol])
                        const newMeta = curMeta.filter(meta => !noneLeafNodes.includes(meta.field))
                        const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                        const filledColumns = fillColumnNames(curColumns, allFields);
                        emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(newMeta) })
                        s2.setDataCfg({
                            fields: {
                                columns: curColumns
                            },
                            meta: newMeta
                        })
                        s2.render(true)
                    }
                }
                s2.interaction.clearState()
            }
            // 新增：分组节点重命名按钮（仅分组节点显示）
            // 判断当前节点是否为分组节点（有children）
            const [curCol] = getColumns([curCell.getMeta().field], curColumns)
            if (curCol && curCol.children && curCol.children.length > 0) {
                const renameGroupBtn = document.createElement('span')
                groupMenuContainer.appendChild(renameGroupBtn)
                renameGroupBtn.innerText = t('chart.rename_group') || '重命名分组'
                renameGroupBtn.onclick = () => {
                    s2.hideTooltip()
                    ElMessageBox.prompt('', t('chart.group_name'), {
                        confirmButtonText: t('chart.confirm'),
                        cancelButtonText: t('chart.cancel'),
                        showClose: false,
                        showInput: true,
                        inputPlaceholder: t('chart.group_name_edit_tip'),
                        inputValue: curCol.name || '',
                        inputErrorMessage: t('chart.group_name_error_tip'),
                        inputValidator: val => {
                            if (val?.length < 1 || val?.length > 20) {
                                return t('chart.group_name_error_tip')
                            }
                            return true
                        }
                    })
                        .then(res => {
                            const newName = res.value
                            // 递归更新columns树结构中该分组节点的name
                            const updateGroupName = (columns, key, name) => {
                                for (const col of columns) {
                                    if (col.key === key) {
                                        col.name = name
                                        break
                                    }
                                    if (col.children) {
                                        updateGroupName(col.children, key, name)
                                    }
                                }
                            }
                            updateGroupName(curColumns, curCell.getMeta().field, newName)
                            // 重新emit并刷新
                            const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                            const filledColumns = fillColumnNames(curColumns, allFields);
                            emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(curMeta) })
                            s2.setDataCfg({
                                fields: {
                                    columns: curColumns
                                },
                                meta: curMeta
                            })
                            s2.render(true)
                        })
                        .catch(() => { })
                }
            }
            const renameBtn = document.createElement('span')
            groupMenuContainer.appendChild(renameBtn)
            renameBtn.innerText = t('chart.rename')
            renameBtn.onclick = () => {
                s2.hideTooltip()
                const cellMeta = curMeta.find(meta => meta.field === curCell.getMeta().field)
                ElMessageBox.prompt('', t('chart.group_name'), {
                    confirmButtonText: t('chart.confirm'),
                    cancelButtonText: t('chart.cancel'),
                    showClose: false,
                    showInput: true,
                    inputPlaceholder: t('chart.group_name_edit_tip'),
                    inputValue: cellMeta.name,
                    inputErrorMessage: t('chart.group_name_error_tip'),
                    inputValidator: val => {
                        if (val?.length < 1 || val?.length > 20) {
                            return t('chart.group_name_error_tip')
                        }
                        return true
                    }
                })
                    .then(res => {
                        const newName = res.value
                        // 1. meta 结构
                        cellMeta.name = newName
                        // 2. columns 结构也要同步
                        const updateColumnName = (columns, key, name) => {
                            for (const col of columns) {
                                if (col.key === key) {
                                    col.name = name
                                    break
                                }
                                if (col.children) {
                                    updateColumnName(col.children, key, name)
                                }
                            }
                        }
                        updateColumnName(curColumns, curCell.getMeta().field, newName)
                        const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                        const filledColumns = fillColumnNames(curColumns, allFields);
                        emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(curMeta) })
                        s2.setDataCfg({
                            fields: {
                                columns: curColumns
                            },
                            meta: curMeta
                        })
                        s2.render(true)
                    })
                    .catch(() => {
                        // do nothing
                    })
            }
            s2.showTooltip({
                position: {
                    x: e.x,
                    y: e.y
                },
                content: groupMenuContainer
            })
            return
        }
        //如果有多个cell都在同一个层级，并且parent相同，那就是可以进行合并分组操作
        if (activeColumns?.length > 1) {
            const sameParent = activeCells.every(
                cell => cell.getMeta().parent === curCell.getMeta().parent
            )
            if (!sameParent) {
                return
            }
            let upDepth = -1
            let tmpCell = curCell
            while (tmpCell?.getMeta?.()?.parent || tmpCell?.parent) {
                upDepth++
                tmpCell = tmpCell?.getMeta?.()?.parent || tmpCell?.parent
            }
            let startIndex = -1
            let endIndex = -1
            const parent = curCell.getMeta().parent
            // 分组的节点
            if (parent.colIndex !== -1) {
                activeColumns.forEach(cell => {
                    const index = parent.children.findIndex(item => item.getMeta().field === cell.key)
                    if (index < startIndex || startIndex === -1) {
                        startIndex = index
                    }
                    if (index > endIndex || endIndex === -1) {
                        endIndex = index
                    }
                })
            } else {
                activeColumns.forEach(cell => {
                    const index = parent.children.findIndex(item => item.key === cell.key)
                    if (index < startIndex || startIndex === -1) {
                        startIndex = index
                    }
                    if (index > endIndex || endIndex === -1) {
                        endIndex = index
                    }
                })
            }
            const totalColumns = []
            if (parent?.id === 'root') {
                totalColumns.push(...curColumns.slice(startIndex, endIndex + 1))
            } else {
                const [parentColumn] = getColumns([parent.field], curColumns)
                totalColumns.push(...parentColumn.children?.slice(startIndex, endIndex + 1))
            }
            const chiildDepth = getTreesMaxDepth(totalColumns)
            // 最大分组为 3 级
            if (chiildDepth + upDepth > 1) {
                return
            }
            const mergeBtn = document.createElement('span')
            groupMenuContainer.appendChild(mergeBtn)
            console.log("在 mergeBtn.onclick 之前查看 totalColumns: ", totalColumns)
            mergeBtn.innerText = t('chart.merge_group')
            mergeBtn.onclick = () => {
                s2.hideTooltip()
                ElMessageBox.prompt('', t('chart.group_name'), {
                    confirmButtonText: t('chart.confirm'),
                    cancelButtonText: t('chart.cancel'),
                    showClose: false,
                    showInput: true,
                    inputPlaceholder: t('chart.group_name_edit_tip'),
                    inputErrorMessage: t('chart.group_name_error_tip'),
                    inputValue: t('chart.group'),
                    inputValidator: val => {
                        if (val?.length < 1 || val?.length > 20) {
                            return t('chart.group_name_error_tip')
                        }
                        return true
                    }
                })
                    .then(res => {
                        const groupName = res.value
                        const newKey = uuid.v4()
                        // 1. 先补全 totalColumns 的 name 字段
                        const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                        const filledChildren = fillColumnNames(totalColumns, allFields);
                        console.log('allFields:', allFields)
                        console.log('totalColumns:', totalColumns)
                        console.log('filledChildren:', filledChildren)
                        // 2. 再作为 children 插入分组节点
                        if (parent?.id === 'root') {
                            curColumns.splice(startIndex, endIndex - startIndex + 1, {
                                key: newKey,
                                name: groupName,
                                children: filledChildren
                            })
                        } else {
                            const [parentColumn] = getColumns([parent.field], curColumns)
                            parentColumn.children?.splice(startIndex, endIndex - startIndex + 1, {
                                key: newKey,
                                name: groupName,
                                children: filledChildren
                            })
                        }
                        curMeta.push({
                            field: newKey,
                            name: groupName
                        })
                        // 递归补全 name 字段
                        // const allFields = (props.chart.xAxis || []).concat(props.chart.yAxis || []);
                        // emit 前再递归补全一次
                        const filledColumns = fillColumnNames(curColumns, allFields);
                        emits('onConfigChange', { columns: cloneDeep(filledColumns), meta: cloneDeep(curMeta) });
                        s2.setDataCfg({
                            fields: {
                                columns: curColumns
                            },
                            meta: curMeta
                        })
                        s2.render(true)
                        s2.interaction.clearState()
                    })
                    .catch(() => { })
            }
            s2.showTooltip({
                position: {
                    x: e.x,
                    y: e.y
                },
                content: groupMenuContainer
            })
            return
        }
    })
    s2.on(S2Event.COL_CELL_CLICK, e => {
        const lastCell = s2.store.get('lastClickedCell') as ColCell
        const originEvent = e.originalEvent as MouseEvent
        if (!lastCell || !(originEvent?.ctrlKey || originEvent?.metaKey || originEvent?.shiftKey)) {
            const cell = s2.getCell(e.target)
            s2.store.set('lastClickedCell', cell)
            return
        }
        if (originEvent?.shiftKey) {
            if (!lastCell) {
                const cell = s2.getCell(e.target)
                s2.store.set('lastClickedCell', cell)
                return
            }
            const curCell = s2.getCell(e.target)
            const lastMeta = lastCell.getMeta()
            const curMeta = curCell.getMeta()
            if (
                lastMeta.key === curMeta.key ||
                lastMeta.level !== curMeta.level ||
                lastMeta.parent !== curMeta.parent
            ) {
                return
            }
            const parent = curMeta.parent as Node
            const lastIndex = parent.children.findIndex(item => item.key === lastMeta.key)
            const curIndex = parent.children.findIndex(item => item.key === curMeta.key)
            const startIndex = Math.min(lastIndex, curIndex)
            const endIndex = Math.max(lastIndex, curIndex)
            const activeCells = parent.children.slice(startIndex, endIndex + 1)
            s2.interaction.clearState()
            activeCells.forEach(cell => {
                s2.interaction.selectHeaderCell({ cell: cell.belongsCell, isMultiSelection: true })
            })
        }
    })
    s2.render()
    // S2渲染后DOM日志
    nextTick(() => {
        const ths = document.querySelectorAll(`#${containerId.value} .antv-s2-col-cell .antv-s2-col-cell-text`);
        ths.forEach((th, idx) => {
            console.log(`[S2表头DOM] 第${idx}列:`, th.textContent);
        });
    });
}

const getNonLeafNodes = (tree: Array<ColumnNode>): string[] => {
    const result: string[] = []

    const inorderTraversal = (node: ColumnNode) => {
        // 如果有子节点，则为非叶子节点
        if (node.children?.length > 0) {
            result.push(node.key)

            // 递归处理子节点
            for (let i = 0; i < node.children.length; i++) {
                inorderTraversal(node.children[i] as ColumnNode)
            }
        }
    }

    // 遍历树中所有节点
    tree.forEach(node => inorderTraversal(node))

    return result
}

const getTreesMaxDepth = (nodes: Array<ColumnNode>): number => {
    if (!nodes?.length) {
        return 0
    }

    // 获取单个节点的最大子树深度
    const getNodeMaxDepth = (node: ColumnNode): number => {
        if (!node.children || node.children.length === 0) {
            return 0
        }
        const childrenDepths = node.children.map(child => getNodeMaxDepth(child as ColumnNode))
        return Math.max(...childrenDepths) + 1
    }

    // 计算所有根节点的最大深度
    const rootDepths = nodes.map(node => getNodeMaxDepth(node))
    return Math.max(...rootDepths)
}

const resize = debounce((width, height) => {
    if (s2) {
        s2.changeSheetSize(width, height)
        s2.render(false)
    }
}, 500)
const preSize = [0, 0]
const TOLERANCE = 1
let resizeObserver: ResizeObserver
onMounted(() => {
    // 第一次加载时，初始化配置和渲染表格
    init()

    // 添加：如果存在补丁修复函数，则等待表格渲染后手动调用
    setTimeout(() => {
        if (window.fixS2TableHeaders) {
            console.log('[表头分组设置] 检测到补丁函数，自动调用修复');
            window.fixS2TableHeaders.collectMappings();
            window.fixS2TableHeaders.fix();
        }
    }, 500);

    resizeObserver = new ResizeObserver(([entry] = []) => {
        const [size] = entry.borderBoxSize || []
        // 拖动的时候宽高重新计算，误差范围内不重绘，误差先设置为1
        if (!(preSize[0] || preSize[1])) {
            preSize[0] = size.inlineSize
            preSize[1] = size.blockSize
        }
        const widthOffset = Math.abs(size.inlineSize - preSize[0])
        const heightOffset = Math.abs(size.blockSize - preSize[1])
        if (widthOffset < TOLERANCE && heightOffset < TOLERANCE) {
            return
        }
        preSize[0] = size.inlineSize
        preSize[1] = size.blockSize
        resize(size.inlineSize, Math.round(size.blockSize))
    })
    resizeObserver.observe(document.getElementById(containerId.value))
})
onUnmounted(() => {
    resizeObserver?.disconnect()
})

class GroupMenu extends BaseTooltip {
    show<T = string | Element>(showOptions: TooltipShowOptions<T>): void {
        super.show(showOptions)
        this.container.style.display = 'flex'
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none'
        }
    }
}
</script>

<style scoped lang="less">
.table-container {
    position: relative;
    width: 100%;
    height: 40vh;
}

.group-menu {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    color: black;
    font-size: 14px;

    :deep(span) {
        cursor: pointer;
        padding: 5px 10px;

        &:hover {
            background-color: var(--ed-fill-color-light);
        }
    }
}

.button-group {
    display: flex;
    justify-content: end;
}
</style>
