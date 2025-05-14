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
            // ====== 优先使用从 ChartComponentS2.vue 传入的处理好的 columns 结构 ======
            if (specialColumns && specialColumns.length > 0) {
                console.log('[table-normal.ts] 使用特殊传入的 columns 结构:', JSON.stringify(specialColumns, null, 2));
                columns.length = 0;
                columns.push(...specialColumns);
                // 递归生成 meta，保证只有叶子节点，顺序和 columns 叶子节点一致
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
                const leafKeys = getLeafKeys(specialColumns);
                meta.length = 0;
                const allFields = (chart.xAxis || []).concat(chart.yAxis || []);
                leafKeys.forEach(key => {
                    const fieldDef = allFields.find((f: any) => f.dataeaseName === key || f.key === key);
                    meta.push({
                        field: key,
                        name: fieldDef?.name || key
                    });
                });
                console.log('[table-normal.ts] 特殊处理后的 meta:', JSON.stringify(meta, null, 2));

                // 打印构造S2实例前的完整配置信息
                console.log('[table-normal.ts 创建S2实例前] 完整配置:');
                console.log('- containerDom:', containerDom?.id);
                console.log('- columns类型:', Object.prototype.toString.call(columns));
                console.log('- columns内容:', JSON.stringify(columns, null, 2));
                console.log('- meta类型:', Object.prototype.toString.call(meta));
                console.log('- meta内容:', JSON.stringify(meta, null, 2));
                // 引用透传测试
                (columns as any).__test_columns_pass = true;

                const result = this.finishDrawChart(containerDom, columns, meta, chart, action, resizeAction);
                console.log('[table-normal.ts S2实例创建后] 实例:', Object.prototype.toString.call(result));
                console.log('[table-normal.ts S2实例创建后] dataCfg.fields:', result.dataCfg?.fields);
                console.log('[table-normal.ts S2实例创建后] dataCfg.meta:', result.dataCfg?.meta);
                console.log('[table-normal.ts S2实例创建后] 引用透传测试:', (result.dataCfg?.fields?.columns as any)?.__test_columns_pass);
                // 再次打印 columns
                console.log('[table-normal.ts S2实例创建后] 原始columns引用测试:', (columns as any).__test_columns_pass);
                // 尝试强制设置 S2 实例的结构
                if (result.dataCfg?.fields) {
                    console.log('[table-normal.ts] 尝试强制设置S2实例的field.columns');
                    result.dataCfg.fields.columns = columns;
                }
                return result;
            }
            // ====== 如果没有特殊传入的 columns 结构，使用原有逻辑 ======
            const { headerGroupConfig } = tableHeader;
            if (headerGroupConfig?.columns?.length) {
                // 递归补全 columns 的 name 字段
                const allFields = (chart.xAxis || []).concat(chart.yAxis || []);
                const columnsWithName = fillColumnNames(headerGroupConfig.columns, allFields);
                columns.length = 0;
                columns.push(...columnsWithName);
                // 递归生成 meta，保证只有叶子节点，顺序和 columns 叶子节点一致
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
                    const fieldDef = allFields.find((f: any) => f.dataeaseName === key || f.key === key);
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
        console.log('[S2实际渲染前] data.fields:', (chart.data.fields || []).map(f => f.dataeaseName || f.key));

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
        console.log('[S2实际渲染] data.fields:', (chart.data.fields || []).map(f => f.dataeaseName || f.key));

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

        // 打印 columns 和 meta，确保没有丢失
        console.log('[finishDrawChart] columns:', JSON.stringify(columns, null, 2));
        console.log('[finishDrawChart] meta:', JSON.stringify(meta, null, 2));
        console.log('[finishDrawChart] columns.__test_columns_pass:', (columns as any).__test_columns_pass);

        // data config
        const s2DataConfig = {
            fields: {
                columns: columns
            },
            meta: meta,
            data: newData
        }

        console.log('[finishDrawChart] s2DataConfig.fields.columns:', JSON.stringify(s2DataConfig.fields.columns, null, 2));
        console.log('[finishDrawChart] s2DataConfig.meta:', JSON.stringify(s2DataConfig.meta, null, 2));

        // options
        const s2Options = {
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

        // 打印 S2 实例创建前的最终配置
        console.log('[finishDrawChart] 最终s2DataConfig:', {
            columns: s2DataConfig.fields.columns,
            meta: s2DataConfig.meta,
            columnsType: Object.prototype.toString.call(s2DataConfig.fields.columns),
            metaType: Object.prototype.toString.call(s2DataConfig.meta)
        });

        // 创建 TableSheet 实例
        const newChart = new TableSheet(containerDom, s2DataConfig, s2Options)

        // 打印创建后的状态
        console.log('[finishDrawChart] S2实例创建后:', {
            instance: Object.prototype.toString.call(newChart),
            dataCfg: newChart.dataCfg,
            options: newChart.options
        });

        // 检查实例是否成功应用 columns
        console.log('[finishDrawChart] S2实例fields:', newChart.dataCfg?.fields);
        console.log('[finishDrawChart] S2实例fields.columns引用测试:', (newChart.dataCfg?.fields?.columns as any)?.__test_columns_pass);
        // 总计
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