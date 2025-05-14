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
import { innerExportDetails } from '@/api/chart'

const downLoading = ref(false)
const dvMainStore = dvMainStoreWithOut()
const dialogShow = ref(false)
const requestStore = useRequestStoreWithOut()
const permissionStore = usePermissionStoreWithOut()
let viewInfo = ref<DeepPartial<ChartObj>>(null)
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
    console.log('最上面的 viewInfo.value: ', viewInfo.value)
    const s2Instance = dvMainStore.getViewInstanceInfo(viewInfo.value.id)
    if (!s2Instance) {
        console.error('未获取到S2实例，无法导出带格式Excel')
        return
    }
    const chart = dvMainStore.getViewDetails(viewInfo.value.id)
    if (viewInfo.value.type === 'table-pivot') {
        exportPivotExcel(s2Instance, chart)
    } else if (viewInfo.value.type === 'table-info') {
        const rawViewInfo = viewInfo.value;

        // 1. 获取S2首页顺序
        const s2FirstPageRows = s2Instance.dataSet.getDisplayDataSet() || [];
        // 2. 获取全量API顺序
        const allDataFetched = await fetchAllTableRows(rawViewInfo, 100);
        const allRows = allDataFetched.data?.tableRow || [];
        // 3. 获取每页条数
        const pageSize = rawViewInfo.customAttr?.basicStyle?.tablePageSize || 20;
        // 4. 拆分后续页
        const restRows = allRows.slice(pageSize);
        // 5. 拼接
        const finalRows = [...s2FirstPageRows, ...restRows];

        let s2MetaFields = null;
        if (s2Instance && s2Instance.options?.dataCfg?.fields) {
            s2MetaFields = s2Instance.options.dataCfg.fields;
            console.log("S2 options.dataCfg.fields captured for field definitions (column order/names).");
        }
        const sourceFieldsForExport = allDataFetched.data?.fields || allDataFetched.data?.sourceFields || [];
        const fieldsForExport = s2MetaFields ?
            (s2MetaFields.values || s2MetaFields.columns || s2MetaFields.rows || []).map(f_key => {
                const f_detail = sourceFieldsForExport.find(fd => fd.dataeaseName === f_key || fd.key === f_key);
                return f_detail || { key: f_key, name: f_key, dataeaseName: f_key };
            })
            : sourceFieldsForExport;

        const viewDataInfoForExport = {
            ...(allDataFetched.data || {}),
            tableRow: finalRows,
            fields: fieldsForExport
        };

        const headerGroupConfig = rawViewInfo.customAttr?.tableHeader?.headerGroupConfig;
        const configColumns = headerGroupConfig?.columns;

        if (!configColumns || configColumns.length === 0) {
            console.log("No valid headerGroupConfig.columns found, treating as a plain table export.");
            exportDetailExcelWithMultiHeader(viewInfo, viewDataInfoForExport, rawViewInfo.title || '明细表');
            return;
        }

        console.log('Valid headerGroupConfig.columns found, proceeding with multi-header export logic.');

        const leafKeys = [];
        function collectLeafKeysRecursive(nodes) {
            nodes?.forEach(node => {
                if (!node.children || node.children.length === 0) {
                    leafKeys.push(String(node.key));
                } else {
                    collectLeafKeysRecursive(node.children);
                }
            });
        }
        collectLeafKeysRecursive(configColumns);

        if (leafKeys.length === 0 && configColumns.length > 0) {
            console.warn("collectLeafKeysRecursive did not populate leafKeys, attempting direct map from configColumns.");
            configColumns.forEach(node => leafKeys.push(String(node.key)));
        }

        if (leafKeys.length === 0) {
            console.error("Failed to derive leafKeys. Check table header configuration or data structure.");
            exportDetailExcelWithMultiHeader(viewInfo, viewDataInfoForExport, rawViewInfo.title || '明细表');
            return;
        }

        let tempActualGroupingKeys = [];
        const customAttr = rawViewInfo.customAttr;
        const tableCellMerge = customAttr?.tableCell?.mergeCells;
        const xAxisFields = rawViewInfo.xAxis || [];

        if (tableCellMerge && xAxisFields.length > 0) {
            const dimensionFieldDataeaseNames = new Set(
                xAxisFields.filter(f => f.groupType === 'd').map(f => f.dataeaseName)
            );
            leafKeys.forEach(lk => {
                if (dimensionFieldDataeaseNames.has(lk)) {
                    tempActualGroupingKeys.push(lk);
                }
            });
            if (tempActualGroupingKeys.length === 0 && leafKeys.length > 0) {
                tempActualGroupingKeys.push(leafKeys[0]);
            }
        } else if (leafKeys.length > 0) {
            const semanticGroupNodeKeysRaw = [];
            function findSemanticGroupNodeKeysRecursive(nodes) {
                nodes?.forEach(node => {
                    if (node.children && node.children.length > 0) {
                        semanticGroupNodeKeysRaw.push(String(node.key));
                        findSemanticGroupNodeKeysRecursive(node.children);
                    }
                });
            }
            findSemanticGroupNodeKeysRecursive(configColumns);
            const uniqueSemanticGroupNodeKeys = [...new Set(semanticGroupNodeKeysRaw)];
            let numBasedOnStructure = uniqueSemanticGroupNodeKeys.length;
            if (numBasedOnStructure === 0 && leafKeys.length > 0) {
                numBasedOnStructure = 1;
            }
            tempActualGroupingKeys = leafKeys.slice(0, Math.min(numBasedOnStructure, leafKeys.length));
        }

        const actualDataFieldKeysForGrouping = tempActualGroupingKeys;

        const actualGroupKeyToLeafIndexMap = {};
        actualDataFieldKeysForGrouping.forEach(key => {
            const index = leafKeys.indexOf(key);
            if (index !== -1) {
                actualGroupKeyToLeafIndexMap[key] = index;
            }
        });

        const expectedDateOrderInShop = {};
        if (s2Instance && actualDataFieldKeysForGrouping.length >= 2) {
            const primaryGroupKey = actualDataFieldKeysForGrouping[0];
            const secondaryGroupKey = actualDataFieldKeysForGrouping[1];
            const displayData = s2Instance.dataSet.getDisplayDataSet();

            if (displayData && primaryGroupKey && secondaryGroupKey) {
                console.log('S2 getDisplayDataSet():', displayData.slice(0, 5));
                displayData.forEach(row => {
                    const shopValue = row[primaryGroupKey];
                    const dateValue = row[secondaryGroupKey];
                    if (shopValue && dateValue !== undefined && dateValue !== null) {
                        if (!expectedDateOrderInShop[shopValue]) {
                            expectedDateOrderInShop[shopValue] = [];
                        }
                        const shopDates = expectedDateOrderInShop[shopValue];
                        if (shopDates.length === 0 || shopDates[shopDates.length - 1] !== dateValue) {
                            if (!shopDates.includes(dateValue)) {
                                shopDates.push(dateValue);
                            }
                        }
                    }
                });
            }
        }
        console.log('UserViewEnlarge.vue -> expectedDateOrderInShop:', expectedDateOrderInShop);

        console.log('UserViewEnlarge.vue -> REVISED leafKeys: ', leafKeys);
        console.log('UserViewEnlarge.vue -> REVISED actualDataFieldKeysForGrouping: ', actualDataFieldKeysForGrouping);
        console.log('UserViewEnlarge.vue -> REVISED actualGroupKeyToLeafIndexMap: ', actualGroupKeyToLeafIndexMap);

        console.log('[弹窗确认 emits] columns:', JSON.stringify(configColumns, null, 2))
        console.log('[弹窗确认 emits] meta:', JSON.stringify(s2MetaFields, null, 2))

        console.log('[主界面实际渲染前] columns:', JSON.stringify(headerGroupConfig.columns, null, 2))
        console.log('[主界面实际渲染前] meta:', JSON.stringify(headerGroupConfig.meta, null, 2))

        exportDetailExcelWithMultiHeader(
            viewInfo,
            viewDataInfoForExport,
            rawViewInfo.title || '明细表',
            leafKeys,
            actualDataFieldKeysForGrouping,
            actualGroupKeyToLeafIndexMap,
            expectedDateOrderInShop
        );
    } else if (viewInfo.value.type === 'table-normal') {
        // 汇总表类型
        console.log('[汇总表导出] 开始导出，viewInfo:', viewInfo.value)
        const rawViewInfo = viewInfo.value;
        // 只用API返回的全量数据，不拼接首页顺序
        const allDataFetched = await fetchAllTableRows(rawViewInfo, 100);
        const allRows = allDataFetched.data?.tableRow || [];
        console.log('[汇总表导出] 全量API数据:', allRows.slice(0, 5), '... 共', allRows.length, '条')
        // 字段定义
        let s2MetaFields = null;
        if (s2Instance && s2Instance.options?.dataCfg?.fields) {
            s2MetaFields = s2Instance.options.dataCfg.fields;
            console.log('[汇总表导出] S2 options.dataCfg.fields:', s2MetaFields)
        }
        const sourceFieldsForExport = allDataFetched.data?.fields || allDataFetched.data?.sourceFields || [];
        const fieldsForExport = s2MetaFields ?
            (s2MetaFields.values || s2MetaFields.columns || s2MetaFields.rows || []).map(f_key => {
                const f_detail = sourceFieldsForExport.find(fd => fd.dataeaseName === f_key || fd.key === f_key);
                return f_detail || { key: f_key, name: f_key, dataeaseName: f_key };
            })
            : sourceFieldsForExport;
        const viewDataInfoForExport = {
            ...(allDataFetched.data || {}),
            tableRow: allRows,
            fields: fieldsForExport
        };
        // 多级表头结构
        const headerGroupConfig = rawViewInfo.customAttr?.tableHeader?.headerGroupConfig;
        const configColumns = headerGroupConfig?.columns;
        if (!configColumns || configColumns.length === 0) {
            console.log('[汇总表导出] 未找到多级表头结构，按普通表导出');
            exportDetailExcelWithMultiHeader(viewInfo, viewDataInfoForExport, rawViewInfo.title || '汇总表');
            return;
        }
        console.log('[汇总表导出] 多级表头结构:', configColumns)
        // 叶子key
        const leafKeys = [];
        function collectLeafKeysRecursive(nodes) {
            nodes?.forEach(node => {
                if (!node.children || node.children.length === 0) {
                    leafKeys.push(String(node.key));
                } else {
                    collectLeafKeysRecursive(node.children);
                }
            });
        }
        collectLeafKeysRecursive(configColumns);
        if (leafKeys.length === 0 && configColumns.length > 0) {
            console.warn('[汇总表导出] collectLeafKeysRecursive未获取到叶子key，尝试直接取columns');
            configColumns.forEach(node => leafKeys.push(String(node.key)));
        }
        if (leafKeys.length === 0) {
            console.error('[汇总表导出] 叶子key为空，无法导出');
            exportDetailExcelWithMultiHeader(viewInfo, viewDataInfoForExport, rawViewInfo.title || '汇总表');
            return;
        }
        // 分组key
        let tempActualGroupingKeys = [];
        const customAttr = rawViewInfo.customAttr;
        const tableCellMerge = customAttr?.tableCell?.mergeCells;
        const xAxisFields = rawViewInfo.xAxis || [];
        if (tableCellMerge && xAxisFields.length > 0) {
            const dimensionFieldDataeaseNames = new Set(
                xAxisFields.filter(f => f.groupType === 'd').map(f => f.dataeaseName)
            );
            leafKeys.forEach(lk => {
                if (dimensionFieldDataeaseNames.has(lk)) {
                    tempActualGroupingKeys.push(lk);
                }
            });
            if (tempActualGroupingKeys.length === 0 && leafKeys.length > 0) {
                tempActualGroupingKeys.push(leafKeys[0]);
            }
        } else if (leafKeys.length > 0) {
            const semanticGroupNodeKeysRaw = [];
            function findSemanticGroupNodeKeysRecursive(nodes) {
                nodes?.forEach(node => {
                    if (node.children && node.children.length > 0) {
                        semanticGroupNodeKeysRaw.push(String(node.key));
                        findSemanticGroupNodeKeysRecursive(node.children);
                    }
                });
            }
            findSemanticGroupNodeKeysRecursive(configColumns);
            const uniqueSemanticGroupNodeKeys = [...new Set(semanticGroupNodeKeysRaw)];
            let numBasedOnStructure = uniqueSemanticGroupNodeKeys.length;
            if (numBasedOnStructure === 0 && leafKeys.length > 0) {
                numBasedOnStructure = 1;
            }
            tempActualGroupingKeys = leafKeys.slice(0, Math.min(numBasedOnStructure, leafKeys.length));
        }
        const actualDataFieldKeysForGrouping = tempActualGroupingKeys;
        const actualGroupKeyToLeafIndexMap = {};
        actualDataFieldKeysForGrouping.forEach(key => {
            const index = leafKeys.indexOf(key);
            if (index !== -1) {
                actualGroupKeyToLeafIndexMap[key] = index;
            }
        });
        // 顺序map（如有）
        const expectedDateOrderInShop = {};
        if (s2Instance && actualDataFieldKeysForGrouping.length >= 2) {
            const primaryGroupKey = actualDataFieldKeysForGrouping[0];
            const secondaryGroupKey = actualDataFieldKeysForGrouping[1];
            const displayData = s2Instance.dataSet.getDisplayDataSet();
            if (displayData && primaryGroupKey && secondaryGroupKey) {
                console.log('[汇总表导出] S2 getDisplayDataSet():', displayData.slice(0, 5));
                displayData.forEach(row => {
                    const shopValue = row[primaryGroupKey];
                    const dateValue = row[secondaryGroupKey];
                    if (shopValue && dateValue !== undefined && dateValue !== null) {
                        if (!expectedDateOrderInShop[shopValue]) {
                            expectedDateOrderInShop[shopValue] = [];
                        }
                        const shopDates = expectedDateOrderInShop[shopValue];
                        if (shopDates.length === 0 || shopDates[shopDates.length - 1] !== dateValue) {
                            if (!shopDates.includes(dateValue)) {
                                shopDates.push(dateValue);
                            }
                        }
                    }
                });
            }
        }

        exportDetailExcelWithMultiHeader(
            viewInfo,
            viewDataInfoForExport,
            rawViewInfo.title || '汇总表',
            leafKeys,
            actualDataFieldKeysForGrouping,
            actualGroupKeyToLeafIndexMap,
            expectedDateOrderInShop
        );
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
    const iconClass = `el-icon-loading`
    const customClass = `de-message-loading de-message-export`
    ElMessage({
        message: h('p', null, [
            t('data_fill.exporting'),
            h(
                ElButton,
                {
                    text: true,
                    size: 'small',
                    class: 'btn-text',
                    onClick: () => {
                        cb()
                    }
                },
                t('data_export.export_center')
            ),
            t('data_fill.progress_to_download')
        ]),
        iconClass,
        icon: h(RefreshLeft),
        showClose: true,
        customClass
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
