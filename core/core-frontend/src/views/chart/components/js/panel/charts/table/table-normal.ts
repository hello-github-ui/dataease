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

// ====== 明细表辅助函数：多级表头宽度递归计算 ======
function calcTreeWidth(node) {
    if (!node.children?.length) {
        return node.width
    }
    return node.children.reduce((pre, cur) => {
        return pre + calcTreeWidth(cur)
    }, 0)
}
function getStartPosition(node) {
    if (!node.children?.length) {
        return node.x
    }
    return getStartPosition(node.children[0])
}

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
        const { container, chart, action, resizeAction } = drawOption
        const containerDom = document.getElementById(container)
        if (!containerDom) return

        // fields
        let fields = chart.data?.fields ?? []
        let columns: any[] = []
        let meta: any[] = []
        const axisMap = [...chart.xAxis, ...chart.yAxis].reduce((pre, cur) => {
            pre[cur.dataeaseName] = cur
            return pre
        }, {})
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
        // ====== 多级表头分组适配，完全复用明细表逻辑 ======
        const { headerGroup, showTableHeader } = tableHeader
        if (headerGroup && showTableHeader !== false) {
            const { headerGroupConfig } = tableHeader
            if (headerGroupConfig?.columns?.length) {
                const allKeys = columns
                const leafNodes = getLeafNodes(headerGroupConfig.columns as any)
                const leafKeys = leafNodes.map(c => c.key)
                if (JSON.stringify(leafKeys) === JSON.stringify(allKeys)) {
                    columns.splice(0, columns.length, ...headerGroupConfig.columns)
                    meta.splice(0, meta.length, ...headerGroupConfig.meta)
                }
            }
        }
        // 空值处理
        const newData = this.configEmptyDataStrategy(chart)
        if (Array.isArray((chart as any).fields?.columns) && (chart as any).fields.columns[0]?.children) {
            // 传进来的是树结构，直接用
            columns = (chart as any).fields.columns
            meta = (chart as any).meta || []
        }
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
        s2Options.style = this.configStyle(chart, s2DataConfig)
        if (tableCell.tableFreeze) {
            s2Options.frozenColCount = tableCell.tableColumnFreezeHead ?? 0
            s2Options.frozenRowCount = tableCell.tableRowFreezeHead ?? 0
        }
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
        this.configTooltip(chart, s2Options)
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
            chart.container = container
            this.configHeaderInteraction(chart, s2Options)
        }
        // 总计
        configSummaryRow(chart, s2Options, newData, tableHeader, basicStyle, basicStyle.showSummary)

        console.log('[最终传给S2的columns]', JSON.stringify(s2DataConfig.fields.columns, null, 2));

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
                const lastLayoutResult = newChart.store.get('lastLayoutResult') as any
                if (lastLayoutResult) {
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
                    // 处理分组的单元格，宽度为所有叶子节点之和
                    ev.colNodes.forEach(n => {
                        if (n.colIndex === -1) {
                            n.width = calcTreeWidth(n)
                            n.x = getStartPosition(n)
                        }
                    })
                    ev.colsHierarchy.width = totalWidth
                    newChart.store.set('lastLayoutResult', undefined)
                    return
                }
                const containerWidth = containerDom.getBoundingClientRect().width
                const totalWidth = ev.colLeafNodes.reduce((p, n) => {
                    n.width = Math.round(n.width)
                    n.x = p
                    return p + n.width
                }, 0)
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
            const rowData = newChart.dataSet.getRowData(meta as ViewMeta)
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
                const lastLayoutResult = newChart.store.get('lastLayoutResult') as any
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
            const meta = cell.getMeta() as ViewMeta
            const nameIdMap = meta.field ? { [meta.field]: meta.field } : {}
            const rowData = newChart.dataSet.getRowData(meta as ViewMeta)
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