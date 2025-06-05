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
                    :view-info="viewInfo" :config="config" :dv-info="dvInfo" :canvas-style-data="canvasStyleData"
                    :canvas-view-info="viewInfo" show-position="viewDialog" />
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

// Assuming ChartObj is the correct, non-partial base type for chart definitions
// It might be imported from a type definition file, e.g. import { ChartObj } from '@/views/chart/components/js/type';

interface ExtendedChartObj extends ChartObj {
    chartExtRequest?: {
        goPage?: number;
        pageSize?: number;
        resultMode?: string;
        resultCount?: number;
    };
    isExcelExport?: boolean;
    dataFrom?: string;
    // Properties like name, id, render, type, data, customAttr, etc.,
    // will now be inherited from ChartObj with their original (non-optional) status.
}

const downLoading = ref(false)
const dvMainStore = dvMainStoreWithOut()
const dialogShow = ref(false)
const requestStore = useRequestStoreWithOut()
const permissionStore = usePermissionStoreWithOut()
let viewInfo = ref<ExtendedChartObj | null>(null)
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
    render: 'antv',
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

// Define a more complete default for customStyle.text
const DEFAULT_VIEW_TEXT_STYLE = {
    show: false,
    fontSize: 18, // Example default
    color: '#000000', // Example default
    hPosition: 'center', // Example default
    vPosition: 'center', // Example default
    isItalic: false,
    isBolder: false,
    remarkShow: false,
    remark: '',
    remarkBackgroundColor: '#FFFFFF',
    fontFamily: 'Arial',
    letterSpace: '0px',
    fontShadow: false,
};

// Define default for mobile custom attributes and styles if needed
const DEFAULT_CUSTOM_ATTR_MOBILE = { basicStyle: {}, tableHeader: {}, tableCell: {}, tooltip: {} };
const DEFAULT_CUSTOM_STYLE_MOBILE = { text: deepCopy(DEFAULT_VIEW_TEXT_STYLE), background: { color: '#FFFFFF', alpha: '100' } };

// Define default structures for other customStyle properties
const DEFAULT_LEGEND_STYLE = { show: true, textStyle: { fontSize: 12, color: '#333333' }, position: 'top-center', seriesCnt: 0, icon: 'auto', orient: 'horizontal' };
const DEFAULT_AXIS_STYLE = { show: true, name: '', nameTextStyle: { fontSize: 12, color: '#333333' }, labelTextStyle: { fontSize: 12, color: '#333333' }, lineStyle: { style: 'solid', width: 1, color: '#CCCCCC' }, splitLineStyle: { show: false, style: 'dashed', width: 1, color: '#DDDDDD' } };
const DEFAULT_MISC_STYLE = { errorConfig: { show: true, msg: '数据加载失败' } }; // Example

const dialogInit = (canvasStyle, view: ChartObj, item, opt, params = { scale: 0.5 }) => {
    state.scale = params.scale;
    sourceViewType.value = view?.type;
    detailsError.value = false;
    optType.value = opt;
    dialogShow.value = true;
    state.componentSourceType = view?.type;
    state.dataFrom = (view as ExtendedChartObj)?.dataFrom;
    config.value = deepCopy(item);

    if (opt === 'details') {
        if (!view || !view.id || !view.type) {
            console.error("Source view for details is invalid or missing critical properties (id, type). Actual view:", view);
            detailsError.value = true;
            viewInfo.value = {
                id: view?.id || 'error-view-' + Date.now(),
                name: view?.name || view?.title || 'Error View - Critical Info Missing',
                title: view?.title || view?.name || 'Error View - Critical Info Missing',
                type: view?.type || 'table-info',
                render: 'antv',
                showPosition: 'details',
                stylePriority: 'view',
                chartVersion: '1.0.0',
                customAttr: { basicStyle: {}, tableHeader: {}, tableCell: {}, tooltip: {} },
                customStyle: {
                    text: deepCopy(DEFAULT_VIEW_TEXT_STYLE),
                    background: { color: '#FFFFFF', alpha: '100' },
                    legend: deepCopy(DEFAULT_LEGEND_STYLE),
                    xAxis: deepCopy(DEFAULT_AXIS_STYLE),
                    yAxis: deepCopy(DEFAULT_AXIS_STYLE),
                    yAxisExt: deepCopy(DEFAULT_AXIS_STYLE),
                    misc: deepCopy(DEFAULT_MISC_STYLE)
                },
                customAttrMobile: deepCopy(DEFAULT_CUSTOM_ATTR_MOBILE),
                customStyleMobile: deepCopy(DEFAULT_CUSTOM_STYLE_MOBILE),
                senior: { scrollCfg: { open: false } },
                data: { data: [], fields: [], tableRow: [], left: { data: [], fields: [], tableRow: [] }, right: { data: [], fields: [], tableRow: [] }, customCalc: {} } as Chart['data'],
                xAxis: [],
                yAxis: [],
                xAxisExt: [],
                yAxisExt: [],
                viewFields: [],
                xAxistype: 0,
                drill: false,
                drillFields: [],
                drillFilters: [],
                extStack: null,
                linkage: null,
                linkageActive: false,
                linkageFilters: [],
                plugin: {},
                refreshViewEnable: false,
                refreshTime: 1,
                refreshUnit: 'minute',
                customFilter: [],
                resultMode: 'PLAINTEXT',
                resultCount: 1000,
                releaseStatus: 'unpublished',
                releaseTime: 0,
                datasetMode: 0,
                engine: 'LOCAL',
                sortPriority: [],
                tableauId: '',
                datasourceType: '',
                tableId: (view?.tableId && !isNaN(parseInt(String(view.tableId))) ? parseInt(String(view.tableId)) : 0),
                totalItems: 0,
                jumpActive: false,
                jumpUrl: '',
                jumpTarget: '_blank',
                isPlugin: false,
                extColor: []
            } as ExtendedChartObj;
        } else {
            detailsError.value = false;
            viewInfo.value = deepCopy(view) as ExtendedChartObj;
            if (!viewInfo.value.name) {
                viewInfo.value.name = String(viewInfo.value.title || viewInfo.value.id || 'Unnamed View');
            }
            if (!viewInfo.value.title) {
                viewInfo.value.title = String(viewInfo.value.name);
            }
        }

        if (viewInfo.value) {
            if (!viewInfo.value.customStyle) {
                viewInfo.value.customStyle = {
                    text: deepCopy(DEFAULT_VIEW_TEXT_STYLE),
                    background: { color: '#FFFFFF', alpha: '100' },
                    legend: deepCopy(DEFAULT_LEGEND_STYLE),
                    xAxis: deepCopy(DEFAULT_AXIS_STYLE),
                    yAxis: deepCopy(DEFAULT_AXIS_STYLE),
                    yAxisExt: deepCopy(DEFAULT_AXIS_STYLE),
                    misc: deepCopy(DEFAULT_MISC_STYLE)
                };
            }
            if (!viewInfo.value.customStyle.text) viewInfo.value.customStyle.text = deepCopy(DEFAULT_VIEW_TEXT_STYLE);
            if (!viewInfo.value.customStyle.background) viewInfo.value.customStyle.background = { color: '#FFFFFF', alpha: '100' };
            if (!viewInfo.value.customStyle.legend) viewInfo.value.customStyle.legend = deepCopy(DEFAULT_LEGEND_STYLE);
            if (!viewInfo.value.customStyle.xAxis) viewInfo.value.customStyle.xAxis = deepCopy(DEFAULT_AXIS_STYLE);
            if (!viewInfo.value.customStyle.yAxis) viewInfo.value.customStyle.yAxis = deepCopy(DEFAULT_AXIS_STYLE);
            if (!viewInfo.value.customStyle.yAxisExt) viewInfo.value.customStyle.yAxisExt = deepCopy(DEFAULT_AXIS_STYLE);
            if (!viewInfo.value.customStyle.misc) viewInfo.value.customStyle.misc = deepCopy(DEFAULT_MISC_STYLE);

            viewInfo.value.customStyle.text.show = false;

            if (!sourceViewType.value?.includes('table')) {
                assign(viewInfo.value, DETAIL_CHART_ATTR);
            } else {
                assign(viewInfo.value, DETAIL_TABLE_ATTR);
                if (sourceViewType.value && viewInfo.value.type !== sourceViewType.value) {
                    viewInfo.value.type = sourceViewType.value;
                }
            }
        } else {
            console.error("viewInfo.value is unexpectedly null after initial processing in dialogInit.");
            detailsError.value = true;
        }

        if (!detailsError.value) {
            dataDetailsOpt();
        }
    } else { // opt === 'enlarge'
        viewInfo.value = deepCopy(view) as ExtendedChartObj;
        if (!viewInfo.value.customStyle) {
            viewInfo.value.customStyle = {
                text: deepCopy(DEFAULT_VIEW_TEXT_STYLE),
                background: { color: '#FFFFFF', alpha: '100' },
                legend: deepCopy(DEFAULT_LEGEND_STYLE),
                xAxis: deepCopy(DEFAULT_AXIS_STYLE),
                yAxis: deepCopy(DEFAULT_AXIS_STYLE),
                yAxisExt: deepCopy(DEFAULT_AXIS_STYLE),
                misc: deepCopy(DEFAULT_MISC_STYLE)
            };
        }
        if (!viewInfo.value.customStyle.text) viewInfo.value.customStyle.text = deepCopy(DEFAULT_VIEW_TEXT_STYLE);
        if (!viewInfo.value.customStyle.background) viewInfo.value.customStyle.background = { color: '#FFFFFF', alpha: '100' };
        if (!viewInfo.value.customStyle.legend) viewInfo.value.customStyle.legend = deepCopy(DEFAULT_LEGEND_STYLE);
        viewInfo.value.customStyle.text.show = false;
    }

    nextTick(() => {
        initWatermark();
    });
};

const dataDetailsOpt = () => {
    nextTick(() => {
        const viewDataInfo = dvMainStore.getViewDataDetails(viewInfo.value.id)
        if (viewDataInfo) {
            if (sourceViewType.value.includes('chart-mix')) {
                if (chartComponentDetails.value) {
                    chartComponentDetails.value.renderChartFromDialog(viewInfo.value, viewDataInfo.left)
                } else {
                    console.error('chartComponentDetails (left) ref is null in dataDetailsOpt');
                    detailsError.value = true;
                }
                if (chartComponentDetails2.value) {
                    chartComponentDetails2.value.renderChartFromDialog(viewInfo.value, viewDataInfo.right)
                } else {
                    console.error('chartComponentDetails2 (right) ref is null in dataDetailsOpt');
                }
            } else {
                if (chartComponentDetails.value) {
                    chartComponentDetails.value.renderChartFromDialog(viewInfo.value, viewDataInfo)
                } else {
                    console.error('chartComponentDetails ref is null in dataDetailsOpt for non-mix chart');
                    detailsError.value = true;
                }
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
                const firstMatchedXAxisDim = xAxisFieldsForDetail.find(xf => xf.groupType === 'd' && leafKeysForDetail.includes(xf.dataeaseName));
                if (firstMatchedXAxisDim) {
                    tempActualGroupingKeysForDetail = [firstMatchedXAxisDim.dataeaseName];
                } else if (leafKeysForDetail.length > 0) {
                    console.warn("[Detail Table Export] Merge cells enabled, but no xAxis dimension fields found in leafKeys. Defaulting to group by first leafKey if any.");
                    tempActualGroupingKeysForDetail.push(leafKeysForDetail[0]);
                }

            }
        } else if (leafKeysForDetail.length > 0) {
            const semanticGroupNodeKeysRawForDetail = [];
            findSemanticGroupNodeKeysRecursive(configColumnsDetail, semanticGroupNodeKeysRawForDetail);
            const uniqueSemanticGroupNodeKeysForDetail = [...new Set(semanticGroupNodeKeysRawForDetail)];
            let numBasedOnStructureForDetail = uniqueSemanticGroupNodeKeysForDetail.length;

            if (numBasedOnStructureForDetail === 0 && leafKeysForDetail.length > 0) {
                numBasedOnStructureForDetail = 1;
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
        exportLoading.value = true;

        // 1. 从 S2 实例获取页面显示的叶子列顺序 和 排序后的数据行
        let s2LeafKeysInOrder = [];
        let s2DisplayDataInOrder = [];
        if (s2Instance && s2Instance.facet && s2Instance.facet.layoutResult && s2Instance.facet.layoutResult.colLeafNodes) {
            s2LeafKeysInOrder = s2Instance.facet.layoutResult.colLeafNodes.map(node => String(node.key || node.field));
            console.log('[导出汇总表带格式] 从S2实例获取到的页面列顺序 (s2LeafKeysInOrder):', s2LeafKeysInOrder);
            if (s2Instance.dataSet && typeof s2Instance.dataSet.getDisplayDataSet === 'function') {
                s2DisplayDataInOrder = s2Instance.dataSet.getDisplayDataSet();
                console.log('[导出汇总表带格式] 从S2实例获取到的排序后数据行 (s2DisplayDataInOrder):', s2DisplayDataInOrder.length > 0 ? s2DisplayDataInOrder[0] : '空数据');
            } else {
                console.warn('[导出汇总表带格式] S2实例没有dataSet或getDisplayDataSet方法，无法获取排序后的行数据。');
            }
        } else {
            console.warn('[导出汇总表带格式] 未能从S2实例获取 colLeafNodes，将回退基于xAxis/yAxis的列顺序，并且无法保证行顺序。');
        }

        // Pre-process headerGroupConfig for table-normal to ensure simple export if no valid columns config
        if (rawViewInfoForSummary.customAttr?.tableHeader?.headerGroupConfig) {
            const hgc = rawViewInfoForSummary.customAttr.tableHeader.headerGroupConfig;
            if (!hgc.columns || !Array.isArray(hgc.columns) || hgc.columns.length === 0) {
                // If columns are not properly defined for multi-header, treat as no multi-header config
                // This helps ensure it falls into the simple header export logic in exportDetailExcelWithMultiHeader
                delete rawViewInfoForSummary.customAttr.tableHeader.headerGroupConfig.columns;
                // Also potentially delete meta if it's only relevant with columns
                delete rawViewInfoForSummary.customAttr.tableHeader.headerGroupConfig.meta;
                // Or even simpler, nullify the whole headerGroupConfig if columns are bad
                // rawViewInfoForSummary.customAttr.tableHeader.headerGroupConfig = null; 
                // Let's try deleting columns and meta first, as exportDetailExcelWithMultiHeader checks both
            }
        }

        const requestDataForSummary = JSON.parse(JSON.stringify(rawViewInfoForSummary));
        if (requestDataForSummary.chartExtRequest) {
            delete requestDataForSummary.chartExtRequest.goPage;
            delete requestDataForSummary.chartExtRequest.pageSize;
        }
        requestDataForSummary.isExcelExport = true;

        console.log('[导出汇总表带格式] 开始使用 getData 直接获取全部数据（主要用于获取字段元数据和作为行数据回退），请求参数:', requestDataForSummary);
        try {
            const allDataFetchedForSummary = await getData(requestDataForSummary);
            // 优先使用S2的显示数据行，如果获取失败，则回退到从后端获取的数据行
            let finalRowsForSummary = (s2DisplayDataInOrder.length > 0) ? s2DisplayDataInOrder : (allDataFetchedForSummary?.data?.tableRow || []);

            console.log(`[导出汇总表带格式] 使用的最终数据行来源: ${s2DisplayDataInOrder.length > 0 ? 'S2实例' : '后端getData'}, 条数: ${finalRowsForSummary.length}`);

            if (finalRowsForSummary.length > 300000) {
                console.warn(`[导出汇总表带格式] 最终数据行超过30万条 (${finalRowsForSummary.length} 条)，将截断至30万条。`);
                finalRowsForSummary = finalRowsForSummary.slice(0, 300000);
            }

            const sourceFieldsFromBackend = allDataFetchedForSummary?.data?.fields || allDataFetchedForSummary?.data?.sourceFields || [];
            let definitiveFieldsForExport = [];

            // Construct fields directly from xAxis and yAxis
            if (rawViewInfoForSummary.xAxis?.length) {
                rawViewInfoForSummary.xAxis.forEach(axisItem => {
                    const fieldDetail = sourceFieldsFromBackend.find(f =>
                        (f.dataeaseName === axisItem.dataeaseName || f.key === axisItem.dataeaseName) ||
                        (f.id === axisItem.id)
                    );
                    if (fieldDetail) {
                        definitiveFieldsForExport.push({ ...fieldDetail, name: axisItem.name || String(fieldDetail.key || fieldDetail.dataeaseName) });
                    } else {
                        definitiveFieldsForExport.push({
                            key: axisItem.dataeaseName || axisItem.id,
                            dataeaseName: axisItem.dataeaseName || axisItem.id,
                            name: axisItem.name || String(axisItem.dataeaseName || axisItem.id),
                            id: axisItem.id,
                            deType: axisItem.deType,
                            groupType: axisItem.groupType
                        });
                    }
                });
            }

            if (rawViewInfoForSummary.yAxis?.length) {
                rawViewInfoForSummary.yAxis.forEach(axisItem => {
                    const fieldDetail = sourceFieldsFromBackend.find(f =>
                        (f.dataeaseName === axisItem.dataeaseName || f.key === axisItem.dataeaseName) ||
                        (f.id === axisItem.id)
                    );
                    if (fieldDetail) {
                        definitiveFieldsForExport.push({ ...fieldDetail, name: axisItem.name || String(fieldDetail.key || fieldDetail.dataeaseName) });
                    } else {
                        definitiveFieldsForExport.push({
                            key: axisItem.dataeaseName || axisItem.id,
                            dataeaseName: axisItem.dataeaseName || axisItem.id,
                            name: axisItem.name || String(axisItem.dataeaseName || axisItem.id),
                            id: axisItem.id,
                            deType: axisItem.deType,
                            groupType: axisItem.groupType
                        });
                    }
                });
            }

            if (definitiveFieldsForExport.length === 0 && sourceFieldsFromBackend.length > 0) {
                console.warn('[导出汇总表带格式] xAxis and yAxis did not yield fields, falling back to sourceFieldsFromBackend for table-normal export.');
                definitiveFieldsForExport = sourceFieldsFromBackend.map(f => ({ ...f, name: f.name || String(f.key || f.dataeaseName) }));
            }

            // Final check to ensure all fields have a name
            definitiveFieldsForExport.forEach(field => {
                if (!field.name) {
                    field.name = String(field.key || field.dataeaseName || field.id || 'Unnamed Field');
                }
            });

            console.log('[导出汇总表带格式] Constructed definitiveFieldsForExport (names ensured):', definitiveFieldsForExport);

            // 2. 确定最终用于Excel的列键顺序 (finalFieldKeysForSheet)
            //    优先使用从S2获取的页面顺序。如果获取失败，则回退。
            let finalFieldKeysForSheet;
            if (s2LeafKeysInOrder.length > 0) {
                finalFieldKeysForSheet = s2LeafKeysInOrder;
                // TODO: 未来可以考虑检查 definitiveFieldsForExport 是否包含了 s2LeafKeysInOrder 中的所有key，
                // 并补充缺失的字段定义（特别是name），但这需要更复杂的字段信息源。
                // 当前假设 s2LeafKeysInOrder 中的 key 能在 definitiveFieldsForExport 中找到对应的 name。
            } else {
                // Fallback: Use order derived from definitiveFieldsForExport (based on xAxis/yAxis)
                finalFieldKeysForSheet = definitiveFieldsForExport.map(f => String(f.key || f.dataeaseName));
            }
            console.log('[导出汇总表带格式] 最终用于Excel的列键顺序 (finalFieldKeysForSheet):', finalFieldKeysForSheet);

            const viewDataInfoForExportForSummary = {
                ...(allDataFetchedForSummary?.data || {}), // 保留其他元数据，如totalItems等，但tableRow会被覆盖
                tableRow: finalRowsForSummary, // 使用S2的行数据或回退数据
                fields: definitiveFieldsForExport, // This is for name/meta lookup
                sourceFields: sourceFieldsFromBackend,
                totalItems: finalRowsForSummary.length, // 更新totalItems以匹配实际导出的行数
                total: finalRowsForSummary.length
            };

            const headerGroupConfigSummary = rawViewInfoForSummary.customAttr?.tableHeader?.headerGroupConfig;
            const configColumnsSummary = headerGroupConfigSummary?.columns;

            if (!configColumnsSummary || !Array.isArray(configColumnsSummary) || configColumnsSummary.length === 0) {
                console.log('[导出汇总表带格式] 未找到有效数组多级表头结构，按普通表导出，使用 finalFieldKeysForSheet');
                exportDetailExcelWithMultiHeader(
                    rawViewInfoForSummary,
                    viewDataInfoForExportForSummary,
                    rawViewInfoForSummary.title || '汇总表',
                    finalFieldKeysForSheet, // Use final (S2 or fallback) field keys for columns
                    [],                   // No grouping keys if no config
                    {},                   // No group-to-index map
                    {}                    // No secondary order map
                );
            } else {
                console.log('[导出汇总表带格式] 多级表头结构:', configColumnsSummary)

                // Derive leafKeysFromConfig for grouping/sorting logic calculations
                const leafKeysFromConfigForGroupingCalcs = [];
                collectLeafKeysRecursive(configColumnsSummary, leafKeysFromConfigForGroupingCalcs);

                if (leafKeysFromConfigForGroupingCalcs.length === 0 && configColumnsSummary.length > 0) {
                    console.warn('[Summary Table Export] collectLeafKeysRecursive未获取到叶子key，尝试直接取columns for grouping calc');
                    configColumnsSummary.forEach(node => leafKeysFromConfigForGroupingCalcs.push(String(node.key)));
                }
                // If leafKeysFromConfigForGroupingCalcs is still empty, grouping logic below might not be effective.

                let tempActualGroupingKeysForSummary = [];
                const customAttrForSummary = rawViewInfoForSummary.customAttr;
                const tableCellMergeForSummary = customAttrForSummary?.tableCell?.mergeCells;
                const xAxisFieldsForSummary = rawViewInfoForSummary.xAxis || [];

                // Grouping keys are derived based on what's in header config AND also an xAxis dimension
                if (tableCellMergeForSummary && xAxisFieldsForSummary.length > 0 && leafKeysFromConfigForGroupingCalcs.length > 0) {
                    const dimensionFieldDataeaseNamesForSummary = new Set(
                        xAxisFieldsForSummary.filter(f => f.groupType === 'd').map(f => f.dataeaseName)
                    );
                    leafKeysFromConfigForGroupingCalcs.forEach(lk => {
                        if (dimensionFieldDataeaseNamesForSummary.has(lk)) {
                            tempActualGroupingKeysForSummary.push(lk);
                        }
                    });
                    if (tempActualGroupingKeysForSummary.length === 0) {
                        const firstMatchedXAxisDimInConf = xAxisFieldsForSummary.find(xf => xf.groupType === 'd' && leafKeysFromConfigForGroupingCalcs.includes(xf.dataeaseName));
                        if (firstMatchedXAxisDimInConf) {
                            tempActualGroupingKeysForSummary = [firstMatchedXAxisDimInConf.dataeaseName];
                        } else if (leafKeysFromConfigForGroupingCalcs.length > 0) {
                            console.warn("[Summary Table Export with Config] Merge cells enabled, but no xAxis dimension fields found in configured leafKeys. Defaulting to group by first configured leafKey if any for merge logic.");
                            tempActualGroupingKeysForSummary.push(leafKeysFromConfigForGroupingCalcs[0]);
                        }
                    }
                } else if (leafKeysFromConfigForGroupingCalcs.length > 0) { // No explicit merge, derive from header structure itself
                    const semanticGroupNodeKeysRawForSummary = [];
                    findSemanticGroupNodeKeysRecursive(configColumnsSummary, semanticGroupNodeKeysRawForSummary);
                    const uniqueSemanticGroupNodeKeysForSummary = [...new Set(semanticGroupNodeKeysRawForSummary)];
                    let numBasedOnStructureForSummary = uniqueSemanticGroupNodeKeysForSummary.length;
                    if (numBasedOnStructureForSummary === 0 && leafKeysFromConfigForGroupingCalcs.length > 0) {
                        numBasedOnStructureForSummary = 1;
                    }
                    tempActualGroupingKeysForSummary = leafKeysFromConfigForGroupingCalcs.slice(0, Math.min(numBasedOnStructureForSummary, leafKeysFromConfigForGroupingCalcs.length));
                }

                const actualDataFieldKeysForGroupingForSummary = tempActualGroupingKeysForSummary;
                const actualGroupKeyToLeafIndexMapForSummary = {};
                actualDataFieldKeysForGroupingForSummary.forEach(key => {
                    const index = finalFieldKeysForSheet.indexOf(String(key)); // Map grouping keys to indices within finalFieldKeysForSheet
                    if (index !== -1) {
                        actualGroupKeyToLeafIndexMapForSummary[String(key)] = index;
                    }
                });

                const expectedDateOrderInShopForSummary = {};
                const s2InstanceForSummary = dvMainStore.getViewInstanceInfo(viewInfo.value.id)
                if (s2InstanceForSummary && actualDataFieldKeysForGroupingForSummary.length >= 2) {
                    const primaryGroupKeyForSummary = actualDataFieldKeysForGroupingForSummary[0];
                    const secondaryGroupKeyForSummary = actualDataFieldKeysForGroupingForSummary[1];
                    // Ensure primary and secondary keys are part of the S2 dataset before trying to access them
                    const s2Fields = s2InstanceForSummary.dataSet?.fields?.values || s2InstanceForSummary.dataSet?.fields?.columns || [];
                    if (s2Fields.includes(primaryGroupKeyForSummary) && s2Fields.includes(secondaryGroupKeyForSummary)) {
                        const displayDataForSummary = s2InstanceForSummary.dataSet.getDisplayDataSet();
                        if (displayDataForSummary) {
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
                }
                console.log('[Summary Table Export] allFieldKeysForSheet:', finalFieldKeysForSheet);
                console.log('[Summary Table Export] actualDataFieldKeysForGroupingForSummary:', actualDataFieldKeysForGroupingForSummary);
                console.log('[Summary Table Export] actualGroupKeyToLeafIndexMapForSummary:', actualGroupKeyToLeafIndexMapForSummary);
                console.log('[Summary Table Export] expectedDateOrderInShopForSummary:', expectedDateOrderInShopForSummary);

                exportDetailExcelWithMultiHeader(
                    rawViewInfoForSummary,
                    viewDataInfoForExportForSummary,
                    rawViewInfoForSummary.title || '汇总表',
                    finalFieldKeysForSheet, // Pass final (S2 or fallback) field keys for columns
                    actualDataFieldKeysForGroupingForSummary,
                    actualGroupKeyToLeafIndexMapForSummary,
                    expectedDateOrderInShopForSummary
                );
            }

        } catch (error) {
            console.error('[导出汇总表带格式] getData 请求失败:', error);
            ElMessage.error(t('chart.export_failed') + ': ' + (error.message || 'Request Error'));
        } finally {
            exportLoading.value = false;
        }
    }
}

function valueCompare(valA, valB, deType) {
    const aIsNull = valA === null || valA === undefined;
    const bIsNull = valB === null || valB === undefined;
    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return -1;
    if (bIsNull) return 1;

    if (deType === 1) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        if (isNaN(timeA) && isNaN(timeB)) return 0;
        if (isNaN(timeA)) return -1;
        if (isNaN(timeB)) return 1;
        return timeA - timeB;
    } else if (deType === 2 || deType === 3 || deType === 4) {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
        if (isNaN(valA) && isNaN(valB)) return 0;
        if (isNaN(valA)) return -1;
        if (isNaN(valB)) return 1;
        return valA - valB;
    } else if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB);
    }
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
        duration: 0,
        showClose: true,
        onClose: () => {
            if (typeof cb === 'function') {
                cb()
            }
        }
    })
}

const mapChartTypes = ['bubble-map', 'flow-map', 'heat-map', 'map', 'symbolic-map']
const htmlToImage = () => {
    downLoading.value = mapChartTypes.includes(viewInfo.value.type) ? false : true
    useEmitt().emitter.emit('renderChart-' + viewInfo.value.id)
    useEmitt().emitter.emit('l7-prepare-picture', viewInfo.value.id)
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
