<template>
    <el-dialog ref="enlargeDialog" :title="viewInfo?.title" :append-to-body="true" v-model="dialogShow" width="70vw"
        trigger="click" class="userViewEnlarge-class">
        <template #header v-if="!isIframe">
            <div class="header-title">
                <div>{{ viewInfo?.title }}</div>
                <div class="export-button">
                    <el-select v-if="optType === 'enlarge' && exportPermissions[0]" v-model="pixel" class="pixel-select"
                        size="small">
                        <el-option-group v-for="group in pixelOptions" :key="group.label" :label="group.label">
                            <el-option v-for="item in group.options" :key="item.value" :label="item.label"
                                :value="item.value" />
                        </el-option-group>
                    </el-select>
                    <el-button class="m-button" v-if="optType === 'enlarge' && exportPermissions[0]" link size="middle"
                        @click="downloadViewImage">
                        <el-icon color="#1F2329" size="16" style="margin-right: 3px">
                            <icon_download_outlined />
                        </el-icon>
                        {{ t('chart.export_img') }}
                    </el-button>
                    <el-button class="m-button" v-if="optType === 'details' && exportPermissions[1]" link size="middle"
                        :loading="exportLoading" :disabled="requestStore.loadingMap[permissionStore.currentPath] > 0 ||
                            state.dataFrom === 'template'
                            " @click="downloadViewDetails('view')">
                        <el-icon color="#1F2329" size="16" style="margin-right: 3px">
                            <icon_download_outlined />
                        </el-icon>
                        {{ t('chart.export_excel') }}
                    </el-button>
                    <el-button class="m-button" v-if="optType === 'details' && exportPermissions[2]" link size="middle"
                        :loading="exportLoading" @click="downloadViewDetails('dataset')" :disabled="requestStore.loadingMap[permissionStore.currentPath] > 0 ||
                            state.dataFrom === 'template'
                            ">
                        <el-icon color="#1F2329" size="16" style="margin-right: 3px">
                            <icon_download_outlined />
                        </el-icon>
                        {{ t('chart.export_raw_details') }}
                    </el-button>
                    <el-button class="m-button"
                        v-if="optType === 'details' && (viewInfo.type === 'table-pivot' || viewInfo.type === 'table-info' || viewInfo.type === 'table-normal')"
                        link size="middle" :loading="exportLoading" @click="exportAsFormattedExcel">
                        <el-icon color="#1F2329" size="16" style="margin-right: 3px">
                            <icon_download_outlined />
                        </el-icon>
                        {{ t('chart.export_excel_formatter') }}
                    </el-button>
                    <el-divider class="close-divider" direction="vertical"
                        v-if="exportPermissions[0] || exportPermissions[1] || exportPermissions[2]" />
                </div>
            </div>
        </template>
        <div v-loading="downLoading" :element-loading-text="t('visualization.export_loading')"
            element-loading-background="rgba(122, 122, 122, 1)" class="enlarge-outer" v-if="dialogShow">
            <div id="enlarge-inner-content" class="enlarge-inner" :class="{
                'enlarge-inner-with-header': optType === 'details' && sourceViewType.includes('chart-mix')
            }" v-loading="requestStore.loadingMap[permissionStore.currentPath]" ref="viewContainer"
                :style="customExport">
                <component-wrapper v-if="optType === 'enlarge'" class="enlarge-wrapper" :opt-type="optType"
                    :view-info="viewInfo" :config="config" :dv-info="dvInfo" :font-family="canvasStyleData?.fontFamily"
                    show-position="viewDialog" />
                <template v-if="optType === 'details' && !sourceViewType.includes('chart-mix')">
                    <chart-component-s2 v-if="!detailsError" :view="viewInfo" show-position="viewDialog"
                        ref="chartComponentDetails" />
                    <empty-background v-if="detailsError" :description="t('visualization.no_details')"
                        img-type="noneWhite" />
                </template>
                <template v-else-if="optType === 'details' && sourceViewType.includes('chart-mix')">
                    <el-tabs class="tab-header" v-model="activeName" @tab-change="handleClick">
                        <el-tab-pane :label="t('chart.drag_block_value_axis_left')" name="left"></el-tab-pane>
                        <el-tab-pane :label="t('chart.drag_block_value_axis_right')" name="right"></el-tab-pane>
                    </el-tabs>
                    <div style="flex: 1">
                        <chart-component-s2 v-if="activeName === 'left'" :view="viewInfo" show-position="viewDialog"
                            ref="chartComponentDetails" />
                        <chart-component-s2 v-else-if="activeName === 'right'" :view="viewInfo"
                            show-position="viewDialog" ref="chartComponentDetails2" />
                    </div>
                </template>
            </div>
        </div>
    </el-dialog>
</template>

<script setup lang="ts">
import ComponentWrapper from '@/components/data-visualization/canvas/ComponentWrapper.vue'
import { computed, h, nextTick, reactive, ref } from 'vue'
import { toPng } from 'html-to-image'
import { useI18n } from '@/hooks/web/useI18n'
import { deepCopy, exportPermission } from '@/utils/utils'
import icon_download_outlined from '@/assets/svg/icon_download_outlined.svg'
import ChartComponentS2 from '@/views/chart/components/views/components/ChartComponentS2.vue'
import { dvMainStoreWithOut } from '@/store/modules/data-visualization/dvMain'
import { exportExcelDownload } from '@/views/chart/components/js/util'
import { storeToRefs } from 'pinia'
import { RefreshLeft } from '@element-plus/icons-vue'
import { assign } from 'lodash-es'
import { useEmitt } from '@/hooks/web/useEmitt'
import { ElButton, ElMessage } from 'element-plus-secondary'
import { exportDetailExcelWithMultiHeader, exportPivotExcel, fetchAllTableRows } from '@/views/chart/components/js/panel/common/common_table'
import { useRequestStoreWithOut } from '@/store/modules/request'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { activeWatermarkCheckUser } from '@/components/watermark/watermark'
import { getCanvasStyle } from '@/utils/style'
import EmptyBackground from '../empty-background/src/EmptyBackground.vue'
import { supportExtremumChartType } from '@/views/chart/components/js/extremumUitl'
import Exceljs from 'exceljs'
import { saveAs } from 'file-saver'
import { innerExportDetails, getData } from '@/api/chart'

// 更新数据接口定义
interface DataResponse {
    data?: {
        tableRow: any[];
        fields: any[];
        sourceFields?: any[];
        totalItems: number;
        total: number;
    };
    chartExtRequest?: {
        goPage?: number;
    };
}

interface ExtendedChartObj extends DeepPartial<ChartObj> {
    chartExtRequest?: {
        goPage?: number;
        pageSize?: number;
        resultMode?: string;
        resultCount?: number;
    };
    isExcelExport?: boolean;
    name: string;  // 添加必需的name属性
    id: string;    // 添加必需的id属性
}

const downLoading = ref(false)
const dvMainStore = dvMainStoreWithOut()
const dialogShow = ref(false)
const requestStore = useRequestStoreWithOut()
const permissionStore = usePermissionStoreWithOut()
let viewInfo = ref<ExtendedChartObj>(null)
const config = ref(null)
const viewContainer = ref(null)
const { t } = useI18n()
const optType = ref(null)
const chartComponentDetails = ref(null)
const chartComponentDetails2 = ref(null)
const { dvInfo, editMode, isIframe, canvasStyleData } = storeToRefs(dvMainStore)
const exportLoading = ref(false)
const sourceViewType = ref()
const activeName = ref('left')
const detailsError = ref(false)
const DETAIL_CHART_ATTR: DeepPartial<ChartObj> = {
    render: 'antv',
    type: 'table-info',
    customAttr: {
        basicStyle: {
            tableColumnMode: 'dialog',
            tablePageMode: 'pull'
        },
        tableHeader: {
            tableHeaderBgColor: '#F8F8F9',
            tableHeaderFontColor: '#7C7E81'
        },
        tableCell: {
            tableItemBgColor: '#FFFFFF',
            tableFontColor: '#7C7E81',
            enableTableCrossBG: false,
            mergeCells: false
        },
        tooltip: {
            show: false
        }
    },
    senior: {
        scrollCfg: {
            open: false
        }
    },
    showPosition: 'dialog'
}

const state = reactive({
    scale: 0.5,
    componentSourceType: null,
    dataFrom: null
})
const DETAIL_TABLE_ATTR: DeepPartial<ChartObj> = {
    senior: {
        scrollCfg: {
            open: false
        }
    },
    showPosition: 'dialog'
}

const exportPermissions = computed(() =>
    exportPermission(dvInfo.value['weight'], dvInfo.value['ext'])
)

const customExport = computed(() => {
    const style =
        canvasStyleData.value && optType.value === 'enlarge'
            ? getCanvasStyle(canvasStyleData.value, 'canvas-main')
            : {}
    if (downLoading.value) {
        const bashStyle = pixel.value.split(' * ')
        style['width'] = bashStyle[0] + 'px!important'
        style['height'] = bashStyle[1] + 'px!important'
        return style
    } else {
        return style
    }
})

const pixel = ref('1280 * 720')

const pixelOptions = [
    {
        label: 'Windows(16:9)',
        options: [
            {
                value: '1920 * 1080',
                label: '1920 * 1080'
            },
            {
                value: '1600 * 900',
                label: '1600 * 900'
            },
            {
                value: '1280 * 720',
                label: '1280 * 720'
            }
        ]
    },
    {
        label: 'MacOS(16:10)',
        options: [
            {
                value: '2560 * 1600',
                label: '2560 * 1600'
            },
            {
                value: '1920 * 1200',
                label: '1920 * 1200'
            },
            {
                value: '1680 * 1050',
                label: '1680 * 1050'
            }
        ]
    }
]
const dialogInit = (canvasStyle, view, item, opt, params = { scale: 0.5 }) => {
    state.scale = params.scale
    sourceViewType.value = view.type
    detailsError.value = false
    optType.value = opt
    dialogShow.value = true
    state.componentSourceType = view.type
    state.dataFrom = view.dataFrom
    viewInfo.value = deepCopy(view) as DeepPartial<ChartObj>
    viewInfo.value.customStyle.text.show = false
    config.value = deepCopy(item)
    if (opt === 'details') {
        if (!viewInfo.value.type?.includes('table')) {
            assign(viewInfo.value, DETAIL_CHART_ATTR)
            viewInfo.value.xAxis.forEach(i => (i.hide = false))
            viewInfo.value.yAxis.forEach(i => (i.hide = false))
        } else {
            assign(viewInfo.value, DETAIL_TABLE_ATTR)
        }
        dataDetailsOpt()
    }
    nextTick(() => {
        initWatermark()
    })
}

const dataDetailsOpt = () => {
    nextTick(() => {
        const viewDataInfo = dvMainStore.getViewDataDetails(viewInfo.value.id)
        if (viewDataInfo) {
            if (sourceViewType.value.includes('chart-mix')) {
                chartComponentDetails.value?.renderChartFromDialog(viewInfo.value, viewDataInfo.left)
                chartComponentDetails2.value?.renderChartFromDialog(viewInfo.value, viewDataInfo.right)
            } else {
                chartComponentDetails.value.renderChartFromDialog(viewInfo.value, viewDataInfo)
            }
        } else {
            detailsError.value = true
        }
    })
}

const handleClick = tab => {
    nextTick(() => {
        const viewDataInfo = dvMainStore.getViewDataDetails(viewInfo.value.id)
        if (tab === 'left') {
            chartComponentDetails.value?.renderChartFromDialog(viewInfo.value, viewDataInfo.left)
        } else if (tab === 'right') {
            chartComponentDetails2.value?.renderChartFromDialog(viewInfo.value, viewDataInfo.right)
        }
    })
}

const downloadViewImage = () => {
    htmlToImage()
}

const downloadViewDetails = (downloadType = 'view') => {
    const viewDataInfo = dvMainStore.getViewDataDetails(viewInfo.value.id)
    const viewInfoSource = dvMainStore.getViewDetails(viewInfo.value.id)
    if (!viewDataInfo) {
        ElMessage.error(t('chart.field_is_empty_export_error'))
        return
    }
    const chartExtRequest = dvMainStore.getLastViewRequestInfo(viewInfo.value.id)
    const chart = {
        ...viewInfoSource,
        chartExtRequest,
        data: viewDataInfo,
        type: sourceViewType.value,
        downloadType: downloadType,
        busiFlag: dvInfo.value.type
    }
    exportLoading.value = true
    exportExcelDownload(chart, () => {
        openMessageLoading(exportData)
    })
    exportLoading.value = false
}

const exportAsFormattedExcel = async () => {
    console.log('开始导出带格式Excel...');
    const s2Instance = dvMainStore.getViewInstanceInfo(viewInfo.value.id)
    console.log('获取到的S2实例:', s2Instance ? '成功' : '失败');
    if (!s2Instance) {
        console.error('未获取到S2实例，无法导出带格式Excel')
        ElMessage.error('S2 实例不存在，无法导出');
        return
    }
    const chart = dvMainStore.getViewDetails(viewInfo.value.id)
    console.log('获取到的chart(ViewDetails)信息:', chart);

    // 定义在函数作用域内的辅助函数，接收参数以避免作用域混淆
    function collectLeafKeysRecursive(nodes, targetLeafKeysArray) {
        if (!Array.isArray(nodes)) {
            console.warn('[collectLeafKeysRecursive] Input nodes is not an array, skipping.');
            return;
        }
        nodes.forEach(node => {
            if (!node.children || node.children.length === 0) {
                targetLeafKeysArray.push(String(node.key));
            } else {
                if (Array.isArray(node.children)) {
                    collectLeafKeysRecursive(node.children, targetLeafKeysArray);
                } else {
                    console.warn('[collectLeafKeysRecursive] Node children is not an array, skipping recursion for node:', node.key);
                }
            }
        });
    }

    function findSemanticGroupNodeKeysRecursive(nodes, targetSemanticGroupKeysArray) {
        if (!Array.isArray(nodes)) {
            console.warn('[findSemanticGroupNodeKeysRecursive] Input nodes is not an array, skipping.');
            return;
        }
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                targetSemanticGroupKeysArray.push(String(node.key));
                if (Array.isArray(node.children)) {
                    findSemanticGroupNodeKeysRecursive(node.children, targetSemanticGroupKeysArray);
                } else {
                    console.warn('[findSemanticGroupNodeKeysRecursive] Node children is not an array, skipping recursion for node:', node.key);
                }
            }
        });
    }

    if (viewInfo.value.type === 'table-pivot') {
        console.log('导出透视表...');
        const chartForPivot = viewInfo.value as ChartObj;
        exportPivotExcel(s2Instance, chartForPivot);
    } else if (viewInfo.value.type === 'table-info') {
        console.log('[导出明细表带格式] 导出明细表...');
        const rawViewInfoForDetail = viewInfo.value as ExtendedChartObj;
        console.log('[导出明细表带格式] 原始viewInfo:', rawViewInfoForDetail);

        const userPageSizeForDetail = rawViewInfoForDetail.customAttr?.basicStyle?.tablePageSize || 20;
        console.log(`[导出明细表带格式] 用户UI设置的每页条数: ${userPageSizeForDetail}`);

        console.log('[导出明细表带格式] 开始使用 fetchAllTableRows 获取全部数据，pageSize将使用用户UI设置...');
        const allDataFetchedForDetail = await fetchAllTableRows(rawViewInfoForDetail, userPageSizeForDetail);
        const finalRowsForDetail = allDataFetchedForDetail.data?.tableRow || [];
        console.log(`[导出明细表带格式] fetchAllTableRows 获取到数据: ${finalRowsForDetail.length} 条`);

        if (finalRowsForDetail.length === 0) {
            console.warn('[导出明细表带格式] fetchAllTableRows 未返回有效数据，可能无法正确导出。');
        }

        let s2MetaFieldsForDetail = null;
        if (s2Instance && s2Instance.options?.dataCfg?.fields) {
            s2MetaFieldsForDetail = s2Instance.options.dataCfg.fields;
            console.log("[导出明细表带格式] S2 options.dataCfg.fields captured for field definitions (column order/names).");
        }

        const sourceFieldsFromFetchedForDetail = allDataFetchedForDetail.data?.fields || [];
        const fieldsForExportForDetail = s2MetaFieldsForDetail
            ? (s2MetaFieldsForDetail.values || s2MetaFieldsForDetail.columns || s2MetaFieldsForDetail.rows || []).map(f_key => {
                const f_detail = sourceFieldsFromFetchedForDetail.find(fd => fd.dataeaseName === f_key || fd.key === f_key);
                return f_detail || { key: f_key, name: f_key, dataeaseName: f_key };
            })
            : sourceFieldsFromFetchedForDetail;

        const viewDataInfoForExportForDetail = {
            ...(allDataFetchedForDetail.data || {}),
            tableRow: finalRowsForDetail,
            fields: fieldsForExportForDetail,
            totalItems: finalRowsForDetail.length,
            total: finalRowsForDetail.length
        };

        const headerGroupConfigDetail = rawViewInfoForDetail.customAttr?.tableHeader?.headerGroupConfig;
        const configColumnsDetail = headerGroupConfigDetail?.columns;
        console.log('[导出明细表带格式] headerGroupConfig:', headerGroupConfigDetail);
        console.log('[导出明细表带格式] configColumnsDetail type:', typeof configColumnsDetail, 'is Array:', Array.isArray(configColumnsDetail), 'value:', configColumnsDetail);

        if (!configColumnsDetail || !Array.isArray(configColumnsDetail) || configColumnsDetail.length === 0) {
            console.log("[导出明细表带格式] No valid array headerGroupConfig.columns found, treating as a plain table export.");
            exportDetailExcelWithMultiHeader(rawViewInfoForDetail, viewDataInfoForExportForDetail, rawViewInfoForDetail.title || '明细表');
            return;
        }

        console.log('Valid headerGroupConfig.columns found, proceeding with multi-header export logic for Detail Table.');

        const leafKeysForDetail = [];
        collectLeafKeysRecursive(configColumnsDetail, leafKeysForDetail);

        if (leafKeysForDetail.length === 0 && configColumnsDetail.length > 0) {
            console.warn("[Detail Table Export] collectLeafKeysRecursive did not populate leafKeys, attempting direct map from configColumns.");
            configColumnsDetail.forEach(node => leafKeysForDetail.push(String(node.key)));
        }

        if (leafKeysForDetail.length === 0) {
            console.error("[Detail Table Export] Failed to derive leafKeys. Check table header configuration or data structure.");
            exportDetailExcelWithMultiHeader(rawViewInfoForDetail, viewDataInfoForExportForDetail, rawViewInfoForDetail.title || '明细表');
            return;
        }

        let tempActualGroupingKeysForDetail = [];
        const customAttrForDetail = rawViewInfoForDetail.customAttr;
        const tableCellMergeForDetail = customAttrForDetail?.tableCell?.mergeCells;
        const xAxisFieldsForDetail = rawViewInfoForDetail.xAxis || [];

        if (tableCellMergeForDetail && xAxisFieldsForDetail.length > 0) {
            const dimensionFieldDataeaseNamesForDetail = new Set(
                xAxisFieldsForDetail.filter(f => f.groupType === 'd').map(f => f.dataeaseName)
            );
            leafKeysForDetail.forEach(lk => {
                if (dimensionFieldDataeaseNamesForDetail.has(lk)) {
                    tempActualGroupingKeysForDetail.push(lk);
                }
            });
            if (tempActualGroupingKeysForDetail.length === 0 && leafKeysForDetail.length > 0) {
                // Fallback: if specific dimension fields from xAxis are not in leafKeys, but merge is enabled,
                // and we have leaf keys, group by the first leaf key by default for merge.
                // This might not be semantically correct for all cases but prevents errors.
                // tempActualGroupingKeysForDetail.push(leafKeysForDetail[0]);
                // More robust: check if xAxisFields exist in leafKeys at all
                const firstMatchedXAxisDim = xAxisFieldsForDetail.find(xf => xf.groupType === 'd' && leafKeysForDetail.includes(xf.dataeaseName));
                if (firstMatchedXAxisDim) {
                    tempActualGroupingKeysForDetail = [firstMatchedXAxisDim.dataeaseName];
                } else if (leafKeysForDetail.length > 0) {
                    console.warn("[Detail Table Export] Merge cells enabled, but no xAxis dimension fields found in leafKeys. Defaulting to group by first leafKey if any.");
                    tempActualGroupingKeysForDetail.push(leafKeysForDetail[0]);
                }

            }
        } else if (leafKeysForDetail.length > 0) { // No explicit mergeCells config from xAxis, derive from header structure
            const semanticGroupNodeKeysRawForDetail = [];
            findSemanticGroupNodeKeysRecursive(configColumnsDetail, semanticGroupNodeKeysRawForDetail);
            const uniqueSemanticGroupNodeKeysForDetail = [...new Set(semanticGroupNodeKeysRawForDetail)];
            let numBasedOnStructureForDetail = uniqueSemanticGroupNodeKeysForDetail.length;

            if (numBasedOnStructureForDetail === 0 && leafKeysForDetail.length > 0) {
                numBasedOnStructureForDetail = 1; // Default to merge by the first column if no explicit groups
            }
            tempActualGroupingKeysForDetail = leafKeysForDetail.slice(0, Math.min(numBasedOnStructureForDetail, leafKeysForDetail.length));
        }

        const actualDataFieldKeysForGroupingForDetail = tempActualGroupingKeysForDetail;
        const actualGroupKeyToLeafIndexMapForDetail = {};
        actualDataFieldKeysForGroupingForDetail.forEach(key => {
            const index = leafKeysForDetail.indexOf(key);
            if (index !== -1) {
                actualGroupKeyToLeafIndexMapForDetail[key] = index;
            }
        });

        const expectedDateOrderInShopForDetail = {};
        if (s2Instance && actualDataFieldKeysForGroupingForDetail.length >= 2) {
            const primaryGroupKeyForDetail = actualDataFieldKeysForGroupingForDetail[0];
            const secondaryGroupKeyForDetail = actualDataFieldKeysForGroupingForDetail[1];
            const displayDataForDetail = s2Instance.dataSet.getDisplayDataSet();

            if (displayDataForDetail && primaryGroupKeyForDetail && secondaryGroupKeyForDetail) {
                displayDataForDetail.forEach(row => {
                    const shopValueForDetail = row[primaryGroupKeyForDetail];
                    const dateValueForDetail = row[secondaryGroupKeyForDetail];
                    if (shopValueForDetail && dateValueForDetail !== undefined && dateValueForDetail !== null) {
                        if (!expectedDateOrderInShopForDetail[shopValueForDetail]) {
                            expectedDateOrderInShopForDetail[shopValueForDetail] = [];
                        }
                        const shopDatesForDetail = expectedDateOrderInShopForDetail[shopValueForDetail];
                        if (!shopDatesForDetail.includes(dateValueForDetail)) {
                            shopDatesForDetail.push(dateValueForDetail);
                        }
                    }
                });
            }
        }
        console.log('[Detail Table Export] expectedDateOrderInShopForDetail:', expectedDateOrderInShopForDetail);
        console.log('[Detail Table Export] leafKeysForDetail: ', leafKeysForDetail);
        console.log('[Detail Table Export] actualDataFieldKeysForGroupingForDetail: ', actualDataFieldKeysForGroupingForDetail);
        console.log('[Detail Table Export] actualGroupKeyToLeafIndexMapForDetail: ', actualGroupKeyToLeafIndexMapForDetail);

        exportDetailExcelWithMultiHeader(
            rawViewInfoForDetail,
            viewDataInfoForExportForDetail,
            rawViewInfoForDetail.title || '明细表',
            leafKeysForDetail,
            actualDataFieldKeysForGroupingForDetail,
            actualGroupKeyToLeafIndexMapForDetail,
            expectedDateOrderInShopForDetail
        );

    } else if (viewInfo.value.type === 'table-normal') {
        console.log('[导出汇总表带格式] 开始导出，viewInfo:', viewInfo.value)
        const rawViewInfoForSummary = viewInfo.value as ExtendedChartObj;

        // Prepare request data for a single fetch of all summary data
        const requestDataForSummary = JSON.parse(JSON.stringify(rawViewInfoForSummary));
        if (requestDataForSummary.chartExtRequest) {
            delete requestDataForSummary.chartExtRequest.goPage;
            delete requestDataForSummary.chartExtRequest.pageSize;
            // Optionally, set a flag if the backend API uses it for full data export
            // requestDataForSummary.chartExtRequest.resultMode = 'all'; 
        }
        // Indicate this is for an export context, if backend uses this flag
        requestDataForSummary.isExcelExport = true;

        console.log('[导出汇总表带格式] 开始使用 getData 直接获取全部数据，请求参数:', requestDataForSummary);
        try {
            const allDataFetchedForSummary = await getData(requestDataForSummary);
            const allRowsForSummary = allDataFetchedForSummary?.data?.tableRow || [];
            console.log(`[导出汇总表带格式] getData 获取到数据: ${allRowsForSummary.length} 条`);

            if (allRowsForSummary.length === 0) {
                console.warn('[导出汇总表带格式] getData 未返回有效数据，可能无法正确导出。');
            }
            if (allRowsForSummary.length > 300000) {
                console.warn(`[导出汇总表带格式] getData 返回数据超过30万条 (${allRowsForSummary.length} 条)，将截断至30万条。`);
                allRowsForSummary.splice(300000); // Truncate to 300,000 rows
            }

            let s2MetaFieldsForSummary = null;
            if (s2Instance && s2Instance.options?.dataCfg?.fields) {
                s2MetaFieldsForSummary = s2Instance.options.dataCfg.fields;
                console.log('[导出汇总表带格式] S2 options.dataCfg.fields:', s2MetaFieldsForSummary)
            }
            const sourceFieldsForExportForSummary = allDataFetchedForSummary?.data?.fields || allDataFetchedForSummary?.data?.sourceFields || [];
            const fieldsForExportForSummary = s2MetaFieldsForSummary ?
                (s2MetaFieldsForSummary.values || s2MetaFieldsForSummary.columns || s2MetaFieldsForSummary.rows || []).map(f_key => {
                    const f_detail = sourceFieldsForExportForSummary.find(fd => fd.dataeaseName === f_key || fd.key === f_key);
                    return f_detail || { key: f_key, name: f_key, dataeaseName: f_key };
                })
                : sourceFieldsForExportForSummary;

            const viewDataInfoForExportForSummary = {
                ...(allDataFetchedForSummary?.data || {}),
                tableRow: allRowsForSummary,
                fields: fieldsForExportForSummary,
                totalItems: allRowsForSummary.length,
                total: allRowsForSummary.length
            };

            const headerGroupConfigSummary = rawViewInfoForSummary.customAttr?.tableHeader?.headerGroupConfig;
            const configColumnsSummary = headerGroupConfigSummary?.columns;
            console.log('[导出汇总表带格式] headerGroupConfig:', headerGroupConfigSummary);
            console.log('[导出汇总表带格式] configColumnsSummary type:', typeof configColumnsSummary, 'is Array:', Array.isArray(configColumnsSummary), 'value:', configColumnsSummary);

            if (!configColumnsSummary || !Array.isArray(configColumnsSummary) || configColumnsSummary.length === 0) {
                console.log('[导出汇总表带格式] 未找到有效数组多级表头结构，按普通表导出');
                exportDetailExcelWithMultiHeader(rawViewInfoForSummary, viewDataInfoForExportForSummary, rawViewInfoForSummary.title || '汇总表');
                return;
            }
            console.log('[导出汇总表带格式] 多级表头结构:', configColumnsSummary)

            const leafKeysForSummary = [];
            collectLeafKeysRecursive(configColumnsSummary, leafKeysForSummary);

            if (leafKeysForSummary.length === 0 && configColumnsSummary.length > 0) {
                console.warn('[Summary Table Export] collectLeafKeysRecursive未获取到叶子key，尝试直接取columns');
                configColumnsSummary.forEach(node => leafKeysForSummary.push(String(node.key)));
            }
            if (leafKeysForSummary.length === 0) {
                console.error('[Summary Table Export] 叶子key为空，无法导出');
                exportDetailExcelWithMultiHeader(rawViewInfoForSummary, viewDataInfoForExportForSummary, rawViewInfoForSummary.title || '汇总表');
                return;
            }

            let tempActualGroupingKeysForSummary = [];
            const customAttrForSummary = rawViewInfoForSummary.customAttr;
            const tableCellMergeForSummary = customAttrForSummary?.tableCell?.mergeCells;
            const xAxisFieldsForSummary = rawViewInfoForSummary.xAxis || [];

            if (tableCellMergeForSummary && xAxisFieldsForSummary.length > 0) {
                const dimensionFieldDataeaseNamesForSummary = new Set(
                    xAxisFieldsForSummary.filter(f => f.groupType === 'd').map(f => f.dataeaseName)
                );
                leafKeysForSummary.forEach(lk => {
                    if (dimensionFieldDataeaseNamesForSummary.has(lk)) {
                        tempActualGroupingKeysForSummary.push(lk);
                    }
                });
                if (tempActualGroupingKeysForSummary.length === 0 && leafKeysForSummary.length > 0) {
                    const firstMatchedXAxisDim = xAxisFieldsForSummary.find(xf => xf.groupType === 'd' && leafKeysForSummary.includes(xf.dataeaseName));
                    if (firstMatchedXAxisDim) {
                        tempActualGroupingKeysForSummary = [firstMatchedXAxisDim.dataeaseName];
                    } else if (leafKeysForSummary.length > 0) {
                        console.warn("[Summary Table Export] Merge cells enabled, but no xAxis dimension fields found in leafKeys. Defaulting to group by first leafKey if any.");
                        tempActualGroupingKeysForSummary.push(leafKeysForSummary[0]);
                    }
                }
            } else if (leafKeysForSummary.length > 0) {
                const semanticGroupNodeKeysRawForSummary = [];
                findSemanticGroupNodeKeysRecursive(configColumnsSummary, semanticGroupNodeKeysRawForSummary);
                const uniqueSemanticGroupNodeKeysForSummary = [...new Set(semanticGroupNodeKeysRawForSummary)];
                let numBasedOnStructureForSummary = uniqueSemanticGroupNodeKeysForSummary.length;
                if (numBasedOnStructureForSummary === 0 && leafKeysForSummary.length > 0) {
                    numBasedOnStructureForSummary = 1;
                }
                tempActualGroupingKeysForSummary = leafKeysForSummary.slice(0, Math.min(numBasedOnStructureForSummary, leafKeysForSummary.length));
            }

            const actualDataFieldKeysForGroupingForSummary = tempActualGroupingKeysForSummary;
            const actualGroupKeyToLeafIndexMapForSummary = {};
            actualDataFieldKeysForGroupingForSummary.forEach(key => {
                const index = leafKeysForSummary.indexOf(key);
                if (index !== -1) {
                    actualGroupKeyToLeafIndexMapForSummary[key] = index;
                }
            });

            const expectedDateOrderInShopForSummary = {};
            if (s2Instance && actualDataFieldKeysForGroupingForSummary.length >= 2) {
                const primaryGroupKeyForSummary = actualDataFieldKeysForGroupingForSummary[0];
                const secondaryGroupKeyForSummary = actualDataFieldKeysForGroupingForSummary[1];
                const displayDataForSummary = s2Instance.dataSet.getDisplayDataSet();
                if (displayDataForSummary && primaryGroupKeyForSummary && secondaryGroupKeyForSummary) {
                    displayDataForSummary.forEach(row => {
                        const shopValueForSummary = row[primaryGroupKeyForSummary];
                        const dateValueForSummary = row[secondaryGroupKeyForSummary];
                        if (shopValueForSummary && dateValueForSummary !== undefined && dateValueForSummary !== null) {
                            if (!expectedDateOrderInShopForSummary[shopValueForSummary]) {
                                expectedDateOrderInShopForSummary[shopValueForSummary] = [];
                            }
                            const shopDatesForSummary = expectedDateOrderInShopForSummary[shopValueForSummary];
                            if (!shopDatesForSummary.includes(dateValueForSummary)) {
                                shopDatesForSummary.push(dateValueForSummary);
                            }
                        }
                    });
                }
            }
            console.log('[Summary Table Export] expectedDateOrderInShopForSummary:', expectedDateOrderInShopForSummary);
            console.log('[Summary Table Export] leafKeysForSummary:', leafKeysForSummary);
            console.log('[Summary Table Export] actualDataFieldKeysForGroupingForSummary:', actualDataFieldKeysForGroupingForSummary);
            console.log('[Summary Table Export] actualGroupKeyToLeafIndexMapForSummary:', actualGroupKeyToLeafIndexMapForSummary);

            exportDetailExcelWithMultiHeader(
                rawViewInfoForSummary,
                viewDataInfoForExportForSummary,
                rawViewInfoForSummary.title || '汇总表',
                leafKeysForSummary,
                actualDataFieldKeysForGroupingForSummary,
                actualGroupKeyToLeafIndexMapForSummary,
                expectedDateOrderInShopForSummary
            );

        } catch (error) {
            console.error('[导出汇总表带格式] getData 请求失败:', error);
            ElMessage.error(t('chart.export_failed') + ': ' + (error.message || 'Request Error'));
            exportLoading.value = false; // Ensure loading is reset on error
        }
    }
}

// Helper functions for sorting (can be placed at the top level of the script setup or imported from a util)
function valueCompare(valA, valB, deType) {
    const aIsNull = valA === null || valA === undefined;
    const bIsNull = valB === null || valB === undefined;
    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return -1;
    if (bIsNull) return 1;

    if (deType === 1) { // DATETIME
        // Ensure valid dates before comparing
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        if (isNaN(timeA) && isNaN(timeB)) return 0;
        if (isNaN(timeA)) return -1;
        if (isNaN(timeB)) return 1;
        return timeA - timeB;
    } else if (deType === 2 || deType === 3 || deType === 4) { // BIGINT, DECIMAL, NUMBER (assuming 4 is also numeric like INTEGER)
        valA = parseFloat(valA);
        valB = parseFloat(valB);
        if (isNaN(valA) && isNaN(valB)) return 0;
        if (isNaN(valA)) return -1;
        if (isNaN(valB)) return 1;
        return valA - valB;
    } else if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB);
    }
    // Default comparison for other types or mixed types
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
}

function multiSort(array, criteria) {
    if (!array || !criteria || criteria.length === 0) return array;
    const sortedArray = [...array];

    sortedArray.sort((a, b) => {
        for (const criterion of criteria) {
            const { fieldId, sortMethod, deType } = criterion;
            const comparisonResult = valueCompare(a[fieldId], b[fieldId], deType);
            if (comparisonResult !== 0) {
                return sortMethod === 'ASC' ? comparisonResult : -comparisonResult;
            }
        }
        return 0;
    });
    return sortedArray;
}

const exportData = () => {
    useEmitt().emitter.emit('data-export-center', { activeName: 'IN_PROGRESS' })
}

const openMessageLoading = cb => {
    const customClass = `de-message-loading de-message-export`
    ElMessage({
        message: h('p', null, [h('span', { class: 'el-icon-loading', style: { marginRight: '5px' } }), h('span', null, t('dataVisualization.exporting'))]),
        customClass,
        type: 'info',
        duration: 0, // 持续显示，直到手动关闭
        showClose: true,
        onClose: () => {
            if (typeof cb === 'function') {
                cb()
            }
        }
    })
}
// 地图
const mapChartTypes = ['bubble-map', 'flow-map', 'heat-map', 'map', 'symbolic-map']
const htmlToImage = () => {
    downLoading.value = mapChartTypes.includes(viewInfo.value.type) ? false : true
    useEmitt().emitter.emit('renderChart-' + viewInfo.value.id)
    useEmitt().emitter.emit('l7-prepare-picture', viewInfo.value.id)
    // 表格和支持最值图表的渲染时间为2000毫秒，其他图表为500毫秒。
    const renderTime =
        viewInfo.value.type?.includes('table') ||
            supportExtremumChartType({ type: viewInfo.value.type })
            ? 2000
            : 500
    setTimeout(() => {
        initWatermark()
        toPng(viewContainer.value)
            .then(dataUrl => {
                downLoading.value = false
                const a = document.createElement('a')
                a.setAttribute('download', viewInfo.value.title)
                a.href = dataUrl
                a.click()
                useEmitt().emitter.emit('l7-unprepare-picture', viewInfo.value.id)
                useEmitt().emitter.emit('renderChart-' + viewInfo.value.id)
                initWatermark()
            })
            .catch(error => {
                downLoading.value = false
                initWatermark()
                useEmitt().emitter.emit('l7-unprepare-picture', viewInfo.value.id)
                useEmitt().emitter.emit('renderChart-' + viewInfo.value.id)
                console.error('oops, something went wrong!', error)
            })
    }, renderTime)
}

const initWatermark = () => {
    activeWatermarkCheckUser('enlarge-inner-content', 'canvas-main', state.scale)
}

defineExpose({
    dialogInit
})
</script>

<style lang="less">
.userViewEnlarge-class {
    .ed-dialog__header {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin-right: unset;
    }

    .ed-dialog__headerbtn {
        position: unset;
    }

    .header-title {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;

        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
    }
}
</style>
<style lang="less" scoped>
.export-button {
    .pixel-select {
        width: 125px;
        margin-right: 8px;
    }

    .m-button {
        color: #1f2329;
        font-size: 14px;
        font-style: normal;
        font-weight: 400;
    }

    .ed-button.is-link {
        font-size: 14px;
        font-weight: 400;
        padding: 4px;

        &:not(.is-disabled):focus,
        &:not(.is-disabled):hover {
            color: #1f2329;
            border-color: transparent;
            background-color: rgba(31, 35, 41, 0.1);
        }

        &:not(.is-disabled):active {
            color: #1f2329;
            border-color: transparent;
            background-color: rgba(31, 35, 41, 0.2);
        }
    }
}

.close-divider {
    margin: 0 16px 0 12px;
}

.enlarge-outer {
    position: relative;
    height: 65vh;
    overflow: hidden;

    .enlarge-inner {
        position: relative;
        width: 100%;
        height: 100%;
        background-size: 100% 100% !important;
    }

    .enlarge-inner-with-header {
        display: flex;
        flex-direction: column;
    }

    .enlarge-wrapper {
        width: 100%;
        height: 100%;
    }
}

.tab-header {
    margin-top: -10px;
    margin-bottom: 10px;
    --ed-tabs-header-height: 34px;
    --custom-tab-color: #646a73;

    :deep(.ed-tabs__nav-wrap::after) {
        background-color: unset;
    }

    &.dark {
        --custom-tab-color: #a6a6a6;
    }

    :deep(.ed-tabs__item) {
        font-weight: 400;
        font-size: 12px;
        padding: 0 8px !important;
        margin-right: 12px;
        color: var(--custom-tab-color);
    }

    :deep(.is-active) {
        font-weight: 500;
        color: var(--ed-color-primary, #3370ff);
    }

    :deep(.ed-tabs__nav-scroll) {
        padding-left: 0 !important;
    }

    :deep(.ed-tabs__header) {
        margin: 0 !important;
    }

    :deep(.ed-tabs__content) {
        height: calc(100% - 35px);
        overflow-y: auto;
        overflow-x: hidden;
    }
}
</style>
