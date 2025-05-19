import { useI18n } from '@/hooks/web/useI18n'
import { formatterItem, valueFormatter } from '@/views/chart/components/js/formatter'
import {
    configEmptyDataStyle,
    configSummaryRow,
    copyContent,
    SortTooltip,
    summaryRowStyle
} from '@/views/chart/components/js/panel/common/common_table'
import { S2ChartView, S2DrawOptions } from '@/views/chart/components/js/panel/types/impl/s2'
import { parseJson } from '@/views/chart/components/js/util'
import {
    type LayoutResult,
    S2DataConfig,
    S2Event,
    S2Options,
    ScrollbarPositionType,
    TableColCell,
    TableDataCell,
    TableSheet,
    ViewMeta
} from '@antv/s2'
import { isNumber } from 'lodash-es'
import { TABLE_EDITOR_PROPERTY, TABLE_EDITOR_PROPERTY_INNER } from './common'
import { fillColumnNames, getLeafNodes } from '@/views/chart/components/js/panel/common/common_table'

const { t } = useI18n()

/**
 * 汇总表
 */
export class TableNormal extends S2ChartView<TableSheet> {
    properties = TABLE_EDITOR_PROPERTY
    propertyInner: EditorPropertyInner = {
        ...TABLE_EDITOR_PROPERTY_INNER,
        'table-header-selector': [
            ...TABLE_EDITOR_PROPERTY_INNER['table-header-selector'],
            'tableHeaderSort',
            'showTableHeader',
            'headerGroup'
        ],
        'basic-style-selector': [
            ...TABLE_EDITOR_PROPERTY_INNER['basic-style-selector'],
            'showSummary',
            'summaryLabel',
            'showHoverStyle'
        ],
        'table-cell-selector': [
            ...TABLE_EDITOR_PROPERTY_INNER['table-cell-selector'],
            'tableFreeze',
            'tableColumnFreezeHead',
            'tableRowFreezeHead'
        ]
    }
    axis: AxisType[] = ['xAxis', 'yAxis', 'drill', 'filter']
    axisConfig: AxisConfig = {
        xAxis: {
            name: `${t('chart.drag_block_table_data_column')} / ${t('chart.dimension')}`,
            type: 'd'
        },
        yAxis: {
            name: `${t('chart.drag_block_table_data_column')} / ${t('chart.quota')}`,
            type: 'q'
        }
    }

    setupDefaultOptions(chart: ChartObj): ChartObj {
        chart.xAxis = []
        return chart
    }

    drawChart(drawOption: S2DrawOptions<TableSheet>): TableSheet {
        const { container, chart, action, resizeAction, specialColumns } = drawOption
        const containerDom = document.getElementById(container)
        if (!containerDom) return

        // fields
        let fields = chart.data.fields

        const columns = []
        const meta = []
        if (chart.drill) {
            // 下钻过滤字段
            const filterFields = chart.drillFilters.map(i => i.fieldId)
            // 下钻入口的字段下标
            const drillFieldId = chart.drillFields[0].id
            const drillFieldIndex = chart.xAxis.findIndex(ele => ele.id === drillFieldId)
            // 当前下钻字段
            const curDrillFieldId = chart.drillFields[filterFields.length].id
            const curDrillField = fields.filter(ele => ele.id === curDrillFieldId)
            filterFields.push(curDrillFieldId)
            // 移除下钻字段，把当前下钻字段插入到下钻入口位置
            fields = fields.filter(ele => {
                return !filterFields.includes(ele.id)
            })
            fields.splice(drillFieldIndex, 0, ...curDrillField)
        }
        const axisMap = [...chart.xAxis, ...chart.yAxis].reduce((pre, cur) => {
            pre[cur.dataeaseName] = cur
            return pre
        }, {})
        // add drill list
        fields.forEach(ele => {
            const f = axisMap[ele.dataeaseName]
            if (f?.hide === true) {
                return
            }
            columns.push(ele.dataeaseName)
            meta.push({
                field: ele.dataeaseName,
                name: ele.chartShowName ?? ele.name,
                formatter: function (value) {
                    if (!f) {
                        return value
                    }
                    if (value === null || value === undefined) {
                        return value
                    }
                    if (![2, 3, 4].includes(f.deType) || !isNumber(value)) {
                        return value
                    }
                    let formatCfg = f.formatterCfg
                    if (!formatCfg) {
                        formatCfg = formatterItem
                    }
                    return valueFormatter(value, formatCfg)
                }
            })
        })

        const { basicStyle, tableCell, tableHeader, tooltip } = parseJson(chart.customAttr)
        // ====== 表头分组（多级表头）支持，复用明细表逻辑 ======
        if (tableHeader.headerGroup && tableHeader.showTableHeader !== false) {
            const headerGroupConfig = tableHeader.headerGroupConfig;
            if (headerGroupConfig?.columns?.length) {
                // 1. 获取所有字段定义
                const allFields = (chart.xAxis || []).concat(chart.yAxis || []);
                // 2. 递归补全 columns 的 name 字段（key 保持字段ID，不动）
                const columnsWithName = fillColumnNames(headerGroupConfig.columns, allFields);
                columns.length = 0;
                columns.push(...columnsWithName);
                // 3. 递归生成 meta，保证只有叶子节点，顺序和 columns 叶子节点一致
                const getLeafKeys = (cols) => {
                    const result = [];
                    function dfs(nodes) {
                        nodes.forEach(node => {
                            if (node.children && node.children.length > 0) {
                                dfs(node.children);
                            } else {
                                result.push(node.key);
                            }
                        });
                    }
                    dfs(cols);
                    return result;
                };
                const leafKeys = getLeafKeys(columnsWithName);
                meta.length = 0;
                leafKeys.forEach(key => {
                    const fieldDef = allFields.find((f: any) => f.dataeaseName === key);
                    meta.push({
                        field: key,
                        name: fieldDef?.name || key
                    });
                });
                // 关键打印
                console.log('[S2递归渲染] columns:', JSON.stringify(columns, null, 2));
                console.log('[S2递归渲染] meta:', JSON.stringify(meta, null, 2));
                return this.finishDrawChart(containerDom, columns, meta, chart, action, resizeAction);
            }
        }

        // 空值处理
        const newData = this.configEmptyDataStrategy(chart)
        console.log('[S2实际渲染前] columns:', JSON.stringify(columns, null, 2));
        console.log('[S2实际渲染前] meta:', JSON.stringify(meta, null, 2));
        console.log('[S2实际渲染前] data.fields:', (chart.data.fields || []).map(f => f.dataeaseName));

        // data config
        const s2DataConfig: S2DataConfig = {
            fields: {
                columns: columns
            },
            meta: meta,
            data: newData
        }

        console.log('[S2实际渲染] columns:', JSON.stringify(columns, null, 2));
        console.log('[S2实际渲染] meta:', JSON.stringify(meta, null, 2));
        console.log('[S2实际渲染] data.fields:', (chart.data.fields || []).map(f => f.dataeaseName));

        // options
        const s2Options: S2Options = {
            width: containerDom.getBoundingClientRect().width,
            height: containerDom.offsetHeight,
            showSeriesNumber: tableHeader.showIndex,
            conditions: this.configConditions(chart),
            tooltip: {
                getContainer: () => containerDom,
                renderTooltip: sheet => new SortTooltip(sheet)
            },
            interaction: {
                hoverHighlight: !(basicStyle.showHoverStyle === false),
                scrollbarPosition: newData.length
                    ? ScrollbarPositionType.CONTENT
                    : ScrollbarPositionType.CANVAS
            }
        }
        // 列宽设置
        s2Options.style = this.configStyle(chart, s2DataConfig)
        // 行列冻结
        if (tableCell.tableFreeze) {
            s2Options.frozenColCount = tableCell.tableColumnFreezeHead ?? 0
            s2Options.frozenRowCount = tableCell.tableRowFreezeHead ?? 0
        }
        // 开启序号之后，第一列就是序号列，修改 label 即可
        if (s2Options.showSeriesNumber) {
            let indexLabel = tableHeader.indexLabel
            if (!indexLabel) {
                indexLabel = ''
            }
            s2Options.layoutCoordinate = (_, __, col) => {
                if (col.colIndex === 0 && col.rowIndex === 0) {
                    col.label = indexLabel
                    col.value = indexLabel
                }
            }
            s2Options.dataCell = meta => {
                return new TableDataCell(meta, meta.spreadsheet)
            }
        }
        // tooltip
        this.configTooltip(chart, s2Options)
        // 隐藏表头，保留顶部的分割线, 禁用表头横向 resize
        if (tableHeader.showTableHeader === false) {
            s2Options.style.colCfg.height = 1
            if (tableCell.showHorizonBorder === false) {
                s2Options.style.colCfg.height = 0
            }
            s2Options.interaction.resize = {
                colCellVertical: false
            }
            s2Options.colCell = (node, sheet, config) => {
                node.label = ' '
                return new TableColCell(node, sheet, config)
            }
        } else {
            // header interaction
            chart.container = container
            this.configHeaderInteraction(chart, s2Options)
        }

        // 总计
        configSummaryRow(chart, s2Options, newData, tableHeader, basicStyle, basicStyle.showSummary)
        // 开始渲染
        const newChart = new TableSheet(containerDom, s2DataConfig, s2Options)
        // 总计紧贴在单元格后面
        summaryRowStyle(newChart, newData, tableCell, tableHeader, basicStyle.showSummary)
        // 自适应铺满
        if (basicStyle.tableColumnMode === 'adapt') {
            newChart.on(S2Event.LAYOUT_RESIZE_COL_WIDTH, () => {
                newChart.store.set('lastLayoutResult', newChart.facet.layoutResult)
            })
            newChart.on(S2Event.LAYOUT_AFTER_HEADER_LAYOUT, (ev: LayoutResult) => {
                const lastLayoutResult = newChart.store.get('lastLayoutResult') as LayoutResult
                if (lastLayoutResult) {
                    // 拖动表头 resize
                    const widthByFieldValue = newChart.options.style?.colCfg?.widthByFieldValue
                    const lastLayoutWidthMap: Record<string, number> =
                        lastLayoutResult?.colLeafNodes.reduce((p, n) => {
                            p[n.value] = widthByFieldValue?.[n.value] ?? n.width
                            return p
                        }, {}) || {}
                    const totalWidth = ev.colLeafNodes.reduce((p, n) => {
                        n.width = lastLayoutWidthMap[n.value] || n.width
                        n.x = p
                        return p + n.width
                    }, 0)
                    ev.colsHierarchy.width = totalWidth
                    newChart.store.set('lastLayoutResult', undefined)
                    return
                }
                const containerWidth = containerDom.getBoundingClientRect().width
                const scale = containerWidth / ev.colsHierarchy.width
                if (scale <= 1) {
                    // 图库计算的布局宽度已经大于等于容器宽度，不需要再扩大，但是需要处理非整数宽度值，不然会出现透明细线
                    ev.colLeafNodes.reduce((p, n) => {
                        n.width = Math.round(n.width)
                        n.x = p
                        return p + n.width
                    }, 0)
                    return
                }
                const totalWidth = ev.colLeafNodes.reduce((p, n) => {
                    n.width = Math.round(n.width * scale)
                    n.x = p
                    return p + n.width
                }, 0)
                if (totalWidth > containerWidth) {
                    // 从最后一列减掉
                    ev.colLeafNodes[ev.colLeafNodes.length - 1].width -= totalWidth - containerWidth
                }
                ev.colsHierarchy.width = containerWidth
            })
        }
        configEmptyDataStyle(newChart, basicStyle, newData, container)
        // click
        newChart.on(S2Event.DATA_CELL_CLICK, ev => {
            const cell = newChart.getCell(ev.target)
            const meta = cell.getMeta() as ViewMeta
            const nameIdMap = fields.reduce((pre, next) => {
                pre[next['dataeaseName']] = next['id']
                return pre
            }, {})

            const rowData = newChart.dataSet.getRowData(meta)
            const dimensionList = []
            for (const key in rowData) {
                if (nameIdMap[key]) {
                    dimensionList.push({ id: nameIdMap[key], value: rowData[key] })
                }
            }
            const param = {
                x: ev.x,
                y: ev.y,
                data: {
                    dimensionList,
                    name: nameIdMap[meta.valueField],
                    sourceType: 'table-normal',
                    quotaList: []
                }
            }
            action(param)
        })
        // tooltip
        const { show } = tooltip
        if (show) {
            newChart.on(S2Event.COL_CELL_HOVER, event => this.showTooltip(newChart, event, meta))
            newChart.on(S2Event.DATA_CELL_HOVER, event => this.showTooltip(newChart, event, meta))
        }
        // header resize
        newChart.on(S2Event.LAYOUT_RESIZE_COL_WIDTH, ev => resizeAction(ev))
        // right click
        newChart.on(S2Event.GLOBAL_CONTEXT_MENU, event => copyContent(newChart, event, meta))
        // touch
        this.configTouchEvent(newChart, drawOption, meta)
        // theme
        const customTheme = this.configTheme(chart)
        newChart.setThemeCfg({ theme: customTheme })

        return newChart
    }

    finishDrawChart(containerDom, columns, meta, chart, action, resizeAction) {
        // 空值处理
        const newData = this.configEmptyDataStrategy(chart)

        // data config
        const s2DataConfig: S2DataConfig = {
            fields: {
                columns: columns
            },
            meta: meta,
            data: newData
        }

        // options
        const s2Options: S2Options = {
            width: containerDom.getBoundingClientRect().width,
            height: containerDom.offsetHeight,
            showSeriesNumber: chart.customAttr.tableHeader.showIndex,
            conditions: this.configConditions(chart),
            tooltip: {
                getContainer: () => containerDom,
                renderTooltip: sheet => new SortTooltip(sheet)
            },
            interaction: {
                hoverHighlight: !(chart.customAttr.basicStyle.showHoverStyle === false),
                scrollbarPosition: newData.length
                    ? ScrollbarPositionType.CONTENT
                    : ScrollbarPositionType.CANVAS
            }
        }

        // 处理表头分组配置
        if (chart.customAttr.tableHeader.headerGroup &&
            chart.customAttr.tableHeader.showTableHeader !== false &&
            chart.customAttr.tableHeader.headerGroupConfig?.columns?.length) {
            // 1. 获取所有字段定义
            const allFields = (chart.xAxis || []).concat(chart.yAxis || []);
            // 2. 递归补全 columns 的 name 字段（key 保持字段ID，不动）
            const columnsWithName = fillColumnNames(chart.customAttr.tableHeader.headerGroupConfig.columns, allFields);
            s2DataConfig.fields.columns = columnsWithName;
            // 3. 递归生成 meta，保证只有叶子节点，顺序和 columns 叶子节点一致
            const getLeafKeys = (cols) => {
                const result = [];
                function dfs(nodes) {
                    nodes.forEach(node => {
                        if (node.children && node.children.length > 0) {
                            dfs(node.children);
                        } else {
                            result.push(node.key);
                        }
                    });
                }
                dfs(cols);
                return result;
            };
            const leafKeys = getLeafKeys(columnsWithName);
            const newMeta = [];
            leafKeys.forEach(key => {
                const fieldDef = allFields.find((f: any) => f.dataeaseName === key);
                newMeta.push({
                    field: key,
                    name: fieldDef?.name || key
                });
            });
            s2DataConfig.meta = newMeta;
            // 关键打印
            console.log('[finishDrawChart] 表头分组配置:', {
                columns: columnsWithName,
                meta: newMeta
            });
        }

        s2Options.style = this.configStyle(chart, s2DataConfig)
        if (chart.customAttr.tableCell.tableFreeze) {
            s2Options.frozenColCount = chart.customAttr.tableCell.tableColumnFreezeHead ?? 0
            s2Options.frozenRowCount = chart.customAttr.tableCell.tableRowFreezeHead ?? 0
        }
        if (s2Options.showSeriesNumber) {
            let indexLabel = chart.customAttr.tableHeader.indexLabel
            if (!indexLabel) {
                indexLabel = ''
            }
            s2Options.layoutCoordinate = (_, __, col) => {
                if (col.colIndex === 0 && col.rowIndex === 0) {
                    col.label = indexLabel
                    col.value = indexLabel
                }
            }
            s2Options.dataCell = meta => {
                return new TableDataCell(meta, meta.spreadsheet)
            }
        }

        this.configTooltip(chart, s2Options)
        if (chart.customAttr.tableHeader.showTableHeader === false) {
            s2Options.style.colCfg.height = 1
            if (chart.customAttr.tableCell.showHorizonBorder === false) {
                s2Options.style.colCfg.height = 0
            }
            s2Options.interaction.resize = {
                colCellVertical: false
            }
            s2Options.colCell = (node, sheet, config) => {
                node.label = ' '
                return new TableColCell(node, sheet, config)
            }
        } else {
            chart.container = containerDom.id
            this.configHeaderInteraction(chart, s2Options)
        }
        configSummaryRow(chart, s2Options, newData, chart.customAttr.tableHeader, chart.customAttr.basicStyle, chart.customAttr.basicStyle.showSummary)

        // 创建 TableSheet 实例
        const newChart = new TableSheet(containerDom, s2DataConfig, s2Options)

        // 添加渲染后的检查
        newChart.on(S2Event.LAYOUT_AFTER_RENDER, () => {
            console.log('[finishDrawChart] 渲染完成:', {
                columns: newChart.dataCfg.fields.columns,
                meta: newChart.dataCfg.meta,
                facet: newChart.facet
            });
        });

        // 总计紧贴在单元格后面
        summaryRowStyle(newChart, newData, chart.customAttr.tableCell, chart.customAttr.tableHeader, chart.customAttr.basicStyle.showSummary)
        // 自适应铺满
        if (chart.customAttr.basicStyle.tableColumnMode === 'adapt') {
            newChart.on(S2Event.LAYOUT_RESIZE_COL_WIDTH, () => {
                newChart.store.set('lastLayoutResult', newChart.facet.layoutResult)
            })
            newChart.on(S2Event.LAYOUT_AFTER_HEADER_LAYOUT, (ev) => {
                const lastLayoutResult = newChart.store.get('lastLayoutResult')
                if (lastLayoutResult) {
                    const widthByFieldValue = newChart.options.style?.colCfg?.widthByFieldValue
                    const lastLayoutWidthMap = lastLayoutResult?.colLeafNodes.reduce((p, n) => {
                        p[n.value] = widthByFieldValue?.[n.value] ?? n.width
                        return p
                    }, {}) || {}
                    const totalWidth = ev.colLeafNodes.reduce((p, n) => {
                        n.width = lastLayoutWidthMap[n.value] || n.width
                        n.x = p
                        return p + n.width
                    }, 0)
                    ev.colsHierarchy.width = totalWidth
                    newChart.store.set('lastLayoutResult', undefined)
                    return
                }
                const containerWidth = containerDom.getBoundingClientRect().width
                const scale = containerWidth / ev.colsHierarchy.width
                if (scale <= 1) {
                    ev.colLeafNodes.reduce((p, n) => {
                        n.width = Math.round(n.width)
                        n.x = p
                        return p + n.width
                    }, 0)
                    return
                }
                const totalWidth = ev.colLeafNodes.reduce((p, n) => {
                    n.width = Math.round(n.width * scale)
                    n.x = p
                    return p + n.width
                }, 0)
                if (totalWidth > containerWidth) {
                    ev.colLeafNodes[ev.colLeafNodes.length - 1].width -= totalWidth - containerWidth
                }
                ev.colsHierarchy.width = containerWidth
            })
        }

        configEmptyDataStyle(newChart, chart.customAttr.basicStyle, newData, containerDom.id)
        newChart.on(S2Event.DATA_CELL_CLICK, ev => {
            const cell = newChart.getCell(ev.target)
            const meta = cell.getMeta()
            const nameIdMap = meta.field ? { [meta.field]: meta.field } : {}
            const rowData = newChart.dataSet.getRowData(meta)
            const dimensionList = []
            for (const key in rowData) {
                if (nameIdMap[key]) {
                    dimensionList.push({ id: nameIdMap[key], value: rowData[key] })
                }
            }
            const param = {
                x: ev.x,
                y: ev.y,
                data: {
                    dimensionList,
                    name: nameIdMap[meta.valueField],
                    sourceType: 'table-normal',
                    quotaList: []
                }
            }
            action(param)
        })

        const { show } = chart.customAttr.tooltip
        if (show) {
            newChart.on(S2Event.COL_CELL_HOVER, event => this.showTooltip(newChart, event, meta))
            newChart.on(S2Event.DATA_CELL_HOVER, event => this.showTooltip(newChart, event, meta))
        }
        newChart.on(S2Event.LAYOUT_RESIZE_COL_WIDTH, ev => resizeAction(ev))
        newChart.on(S2Event.GLOBAL_CONTEXT_MENU, event => copyContent(newChart, event, meta))
        this.configTouchEvent(newChart, { container: containerDom.id, chart, action, resizeAction }, meta)
        const customTheme = this.configTheme(chart)
        newChart.setThemeCfg({ theme: customTheme })

        return newChart;
    }

    constructor() {
        super('table-normal', [])
    }
}