<script lang="ts" setup>
import {computed, onMounted, PropType, reactive, watch} from 'vue'
import {COLOR_PANEL, DEFAULT_BASIC_STYLE, DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import icon_info_outlined from '@/assets/svg/icon_info_outlined.svg'
import {useI18n} from '@/hooks/web/useI18n'
import CustomColorStyleSelect from '@/views/chart/components/editor/editor-style/components/CustomColorStyleSelect.vue'
import {cloneDeep, debounce, defaultsDeep, isNumber} from 'lodash-es'
import {SERIES_NUMBER_FIELD} from '@antv/s2'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import {ElFormItem, ElInputNumber, ElMessage} from 'element-plus-secondary'
import {svgStrToUrl} from '../../../js/util'
import {numberToChineseUnderHundred} from '../../../js/panel/common/common_antv'
import {useLocaleStoreWithOut} from '@/store/modules/locale'

const dvMainStore = dvMainStoreWithOut()
const localeStore = useLocaleStoreWithOut()
const {batchOptStatus, mobileInPc} = storeToRefs(dvMainStore)
const {t} = useI18n()
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
const showProperty = prop => props.propertyInner?.includes(prop)
const tableExpandLevelOptions = reactive([{name: t('chart.expand_all'), value: 'all'}])
const predefineColors = COLOR_PANEL
const state = reactive({
    basicStyleForm: JSON.parse(JSON.stringify(DEFAULT_BASIC_STYLE)) as ChartBasicStyle,
    miscForm: JSON.parse(JSON.stringify(DEFAULT_MISC)) as ChartMiscAttr,
    customColor: null,
    colorIndex: 0,
    fieldColumnWidth: {
        fieldId: '',
        width: 0
    },
    fileList: []
})
const emit = defineEmits(['onBasicStyleChange', 'onMiscChange'])
const changeBasicStyle = (prop?: string, requestData = false) => {
    emit('onBasicStyleChange', {data: state.basicStyleForm, requestData}, prop)
}
const onAlphaChange = v => {
    const _v = parseInt(v)
    if (_v >= 0 && _v <= 100) {
        state.basicStyleForm.alpha = _v
    } else if (_v < 0) {
        state.basicStyleForm.alpha = 0
    } else if (_v > 100) {
        state.basicStyleForm.alpha = 100
    } else {
        const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
        const oldForm = defaultsDeep(basicStyle, cloneDeep(DEFAULT_BASIC_STYLE)) as ChartBasicStyle
        state.basicStyleForm.alpha = oldForm.alpha
    }
    changeBasicStyle('alpha')
}

const onColumnWidthRatioChange = v => {
    const _v = parseInt(v)
    if (_v >= 1 && _v <= 100) {
        state.basicStyleForm.columnWidthRatio = _v
    } else if (_v < 1) {
        state.basicStyleForm.columnWidthRatio = 1
    } else if (_v > 100) {
        state.basicStyleForm.columnWidthRatio = 100
    } else {
        const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
        const oldForm = defaultsDeep(basicStyle, cloneDeep(DEFAULT_BASIC_STYLE)) as ChartBasicStyle
        state.basicStyleForm.columnWidthRatio = oldForm.columnWidthRatio
    }
    changeBasicStyle('columnWidthRatio')
}

const changeMisc = prop => {
    emit('onMiscChange', {data: state.miscForm, requestData: true}, prop)
}
const init = () => {
    const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
    const miscStyle = cloneDeep(props.chart.customAttr.misc)
    configCompat(basicStyle)
    if (
        basicStyle.mapSymbol === 'custom' &&
        state.basicStyleForm.customIcon !== basicStyle.customIcon
    ) {
        let file
        if (basicStyle.customIcon?.startsWith('data')) {
            file = basicStyle.customIcon
        } else {
            file = svgStrToUrl(basicStyle.customIcon)
        }
        file && (state.fileList[0] = {url: file})
    }
    state.basicStyleForm = defaultsDeep(basicStyle, cloneDeep(DEFAULT_BASIC_STYLE)) as ChartBasicStyle
    state.miscForm = defaultsDeep(miscStyle, cloneDeep(DEFAULT_MISC)) as ChartMiscAttr
    if (!state.customColor) {
        state.customColor = state.basicStyleForm.colors[0]
        state.colorIndex = 0
    }
    if (basicStyle.tableLayoutMode === 'tree') {
        tableExpandLevelOptions.splice(1)
        let maxLevel = props.chart.xAxis?.length
        if (isNumber(basicStyle.defaultExpandLevel)) {
            maxLevel = Math.max(maxLevel, basicStyle.defaultExpandLevel)
        }
        for (let i = 1; i <= maxLevel; i++) {
            let name = t('chart.level_label', {num: i})
            if (localeStore.getCurrentLocale.lang !== 'en') {
                name = t('chart.level_label', {num: numberToChineseUnderHundred(i)})
            }
            tableExpandLevelOptions.push({name, value: i})
        }
    }
    initTableColumnWidth()
}
const debouncedInit = debounce(init, 500)
watch(
    [
        () => props.chart.customAttr.basicStyle,
        () => props.chart.customAttr.misc,
        () => props.chart.customAttr.tableHeader,
        () => props.chart.xAxis,
        () => props.chart.yAxis
    ],
    debouncedInit,
    {deep: true}
)
const configCompat = (basicStyle: ChartBasicStyle) => {
    // 悬浮改为图例和缩放按钮
    if (basicStyle.suspension === false && basicStyle.showZoom === undefined) {
        basicStyle.showZoom = false
    }
}
const COLUMN_WIDTH_TYPE = ['table-info', 'table-normal']
const initTableColumnWidth = () => {
    if (!COLUMN_WIDTH_TYPE.includes(props.chart.type)) {
        return
    }
    let {xAxis, yAxis, customAttr} = JSON.parse(JSON.stringify(props.chart))
    let allAxis = xAxis
    if (props.chart.type === 'table-normal') {
        allAxis = allAxis.concat(yAxis)
    }
    const {tableHeader} = customAttr
    if (allAxis.length && tableHeader.showIndex) {
        const indexColumn = {
            dataeaseName: SERIES_NUMBER_FIELD,
            name: tableHeader.indexLabel
        } as unknown as Axis
        allAxis.unshift(indexColumn)
    }
    if (!allAxis.length) {
        state.basicStyleForm.tableFieldWidth?.splice(0)
        state.fieldColumnWidth.fieldId = ''
        state.fieldColumnWidth.width = 0
    } else {
        if (!state.basicStyleForm.tableFieldWidth.length) {
            state.basicStyleForm.tableFieldWidth.splice(0)
            const defaultWidth = parseFloat((100 / allAxis.length).toFixed(2))
            allAxis.forEach(item => {
                state.basicStyleForm.tableFieldWidth.push({
                    fieldId: item.dataeaseName,
                    name: item.name,
                    width: defaultWidth
                })
            })
        } else {
            const fieldMap = state.basicStyleForm.tableFieldWidth.reduce((p, n) => {
                p[n.fieldId] = n
                return p
            }, {})
            state.basicStyleForm.tableFieldWidth.splice(0)
            allAxis.forEach(item => {
                let width = 10
                if (fieldMap[item.dataeaseName]) {
                    width = fieldMap[item.dataeaseName].width
                }
                state.basicStyleForm.tableFieldWidth.push({
                    fieldId: item.dataeaseName,
                    name: item.name,
                    width
                })
            })
        }
        let selectedField = state.basicStyleForm.tableFieldWidth[0]
        const curFieldIndex = state.basicStyleForm.tableFieldWidth.findIndex(
            i => i.fieldId === state.fieldColumnWidth.fieldId
        )
        if (curFieldIndex !== -1) {
            selectedField = state.basicStyleForm.tableFieldWidth[curFieldIndex]
        }
        state.fieldColumnWidth.fieldId = selectedField.fieldId
        state.fieldColumnWidth.width = selectedField.width
    }
}
const changeFieldColumn = () => {
    const {basicStyleForm, fieldColumnWidth} = state
    const fieldWidth = basicStyleForm.tableFieldWidth?.find(
        i => i.fieldId === fieldColumnWidth.fieldId
    )
    if (fieldWidth) {
        fieldColumnWidth.width = fieldWidth.width
    }
}
const changeFieldColumnWidth = () => {
    const {basicStyleForm, fieldColumnWidth} = state
    let {width} = fieldColumnWidth
    let validate = true
    width = parseFloat(width)
    if (isNaN(width) || !isNumber(width)) {
        validate = false
    }
    if (width < 0 || width > 200) {
        validate = false
    }
    const fieldWidth = basicStyleForm.tableFieldWidth?.find(
        i => i.fieldId === fieldColumnWidth.fieldId
    )
    if (!validate) {
        ElMessage.warning('宽度需要在 0-200 之间')
        if (fieldWidth) {
            fieldColumnWidth.width = fieldWidth.width
        }
        return
    }
    if (fieldWidth) {
        fieldWidth.width = fieldColumnWidth.width
        changeBasicStyle('tableFieldWidth')
    }
}
const pageSizeOptions = [
    {name: '10' + t('chart.table_page_size_unit'), value: 10},
    {name: '20' + t('chart.table_page_size_unit'), value: 20},
    {name: '50' + t('chart.table_page_size_unit'), value: 50},
    {name: '100' + t('chart.table_page_size_unit'), value: 100}
]

const gaugeStyleOptions = [{name: '默认', value: 'default'}]

const symbolOptions = [
    {name: t('chart.line_symbol_circle'), value: 'circle'},
    {name: t('chart.line_symbol_rect'), value: 'square'},
    {name: t('chart.line_symbol_triangle'), value: 'triangle'},
    {name: t('chart.line_symbol_diamond'), value: 'diamond'}
]
const mapStyleOptions = [
    {name: t('chart.map_style_normal'), value: 'normal'},
    {name: t('chart.map_style_darkblue'), value: 'darkblue'},
    {name: t('chart.map_style_light'), value: 'light'},
    {name: t('chart.map_style_dark'), value: 'dark'},
    {name: t('chart.map_style_fresh'), value: 'fresh'},
    {name: t('chart.map_style_grey'), value: 'grey'},
    {name: t('chart.map_style_blue'), value: 'blue'},
    {name: t('commons.custom'), value: 'custom'}
]
const heatMapTypeOptions = [
    {name: t('chart.heatmap_classics'), value: 'heatmap'},
    {name: t('chart.heatmap3D'), value: 'heatmap3D'}
]

/**
 * 表格是否合并单元格
 */
const mergeCell = computed(() => {
    if (COLUMN_WIDTH_TYPE.includes(props.chart.type)) {
        let {customAttr} = JSON.parse(JSON.stringify(props.chart))
        const {tableCell} = customAttr
        return tableCell.mergeCells
    }
    return false
})
onMounted(() => {
    init()
})
</script>
<template>
    <div style="width: 100%">
        <template v-if="showProperty('colors')">
            <custom-color-style-select
                v-model="state"
                :chart="chart"
                :property-inner="propertyInner"
                :themes="themes"
                @change-basic-style="prop => changeBasicStyle(prop)"
            />
        </template>

        <el-form-item v-if="showProperty('gradient')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.basicStyleForm.gradient"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('gradient')"
            >
                {{ $t('chart.gradient') }}{{ $t('chart.color') }}
            </el-checkbox>
        </el-form-item>

        <el-form-item
            v-if="showProperty('tableLayoutMode')"
            :class="'form-item-' + themes"
            :label="t('chart.table_layout_mode')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.tableLayoutMode"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('tableLayoutMode')"
            >
                <el-radio :effect="themes" label="grid">{{ t('chart.table_layout_grid') }}</el-radio>
                <el-radio :effect="themes" label="tree">{{ t('chart.table_layout_tree') }}</el-radio>
            </el-radio-group>
        </el-form-item>
        <el-form-item
            v-if="showProperty('tableLayoutMode') && state.basicStyleForm.tableLayoutMode === 'tree'"
            :class="'form-item-' + themes"
            :label="t('chart.default_expand_level')"
            class="form-item"
        >
            <el-select
                v-model="state.basicStyleForm.defaultExpandLevel"
                :effect="themes"
                @change="changeBasicStyle('defaultExpandLevel')"
            >
                <el-option
                    v-for="item in tableExpandLevelOptions"
                    :key="item.value"
                    :label="item.name"
                    :value="item.value"
                />
            </el-select>
        </el-form-item>

        <div v-if="showProperty('alpha')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.not_alpha') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="13">
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.alpha"
                            :effect="themes"
                            @change="changeBasicStyle('alpha')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="11" style="padding-top: 2px">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-input
                            v-model="state.basicStyleForm.alpha"
                            :controls="false"
                            :effect="themes"
                            :max="100"
                            :min="0"
                            class="basic-input-number"
                            type="number"
                            @change="onAlphaChange"
                        >
                            <template #suffix> %</template>
                        </el-input>
                    </el-form-item>
                </el-col>
            </el-row>
        </div>

        <el-form-item
            v-if="showProperty('radiusColumnBar')"
            :class="'form-item-' + themes"
            :label="t('chart.radiusColumnBar')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.radiusColumnBar"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('radiusColumnBar')"
            >
                <el-radio :effect="themes" label="rightAngle">{{ t('chart.rightAngle') }}</el-radio>
                <el-radio :effect="themes" label="roundAngle">{{ t('chart.roundAngle') }}</el-radio>
            </el-radio-group>
        </el-form-item>

        <el-form-item
            v-if="showProperty('layout')"
            :class="'form-item-' + themes"
            :label="t('chart.orient')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.layout"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('layout')"
            >
                <el-radio :effect="themes" label="horizontal">{{ t('chart.horizontal') }}</el-radio>
                <el-radio :effect="themes" label="vertical">{{ t('chart.vertical') }}</el-radio>
            </el-radio-group>
        </el-form-item>
        <!--flow map begin-->
        <el-form-item
            v-if="showProperty('heatMapStyle')"
            :class="'form-item-' + themes"
            :label="t('chart.type')"
            class="form-item"
        >
            <el-select
                v-model="state.basicStyleForm.heatMapType"
                :effect="themes"
                @change="changeBasicStyle('heatMapType')"
            >
                <el-option
                    v-for="item in heatMapTypeOptions"
                    :key="item.name"
                    :label="item.name"
                    :value="item.value"
                />
            </el-select>
        </el-form-item>
        <div v-if="showProperty('mapBaseStyle') || showProperty('heatMapStyle')" class="map-style">
            <el-row style="flex: 1">
                <el-col>
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.map_style')"
                        class="form-item"
                    >
                        <el-select
                            v-model="state.basicStyleForm.mapStyle"
                            :effect="themes"
                            @change="changeBasicStyle('mapStyle')"
                        >
                            <el-option
                                v-for="item in mapStyleOptions"
                                :key="item.name"
                                :label="item.name"
                                :value="item.value"
                            />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-row v-if="state.basicStyleForm.mapStyle === 'custom'" style="flex: 1">
                <el-col>
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.map_style_url')"
                        class="form-item"
                    >
                        <el-input
                            v-model="state.basicStyleForm.mapStyleUrl"
                            :effect="themes"
                            maxlength="50"
                            @change="changeBasicStyle('mapStyleUrl')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
            <div class="alpha-setting">
                <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                    {{ t('chart.chart_map') + ' ' + t('chart.map_pitch') }}
                </label>
                <el-row :gutter="8" style="flex: 1">
                    <el-col>
                        <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                            <el-slider
                                v-model="state.miscForm.mapPitch"
                                :effect="themes"
                                :max="90"
                                :min="0"
                                @change="changeMisc('mapPitch')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </div>
        </div>
        <div v-if="showProperty('heatMapStyle')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.heatMapIntensity') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.heatMapIntensity"
                            :effect="themes"
                            :max="20"
                            :min="1"
                            @change="changeBasicStyle('heatMapIntensity')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <div v-if="showProperty('heatMapStyle')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.heatMapRadius') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.heatMapRadius"
                            :effect="themes"
                            :max="40"
                            :min="1"
                            @change="changeBasicStyle('heatMapRadius')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>

        <!--flow map end-->
        <!--map start-->
        <el-row :gutter="8">
            <el-col v-if="showProperty('areaBorderColor')" :span="12">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.area_border_color')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.basicStyleForm.areaBorderColor"
                        :effect="themes"
                        :persistent="false"
                        :predefine="predefineColors"
                        :trigger-width="108"
                        class="color-picker-style"
                        is-custom
                        show-alpha
                        @change="changeBasicStyle('areaBorderColor')"
                    />
                </el-form-item>
            </el-col>
        </el-row>
        <el-row :gutter="8">
            <el-col v-if="showProperty('areaBaseColor')" :span="12">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.area_base_color')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.basicStyleForm.areaBaseColor"
                        :effect="themes"
                        :persistent="false"
                        :predefine="predefineColors"
                        :trigger-width="108"
                        class="color-picker-style"
                        is-custom
                        show-alpha
                        @change="changeBasicStyle('areaBaseColor')"
                    />
                </el-form-item>
            </el-col>
        </el-row>
        <el-form-item v-if="showProperty('showLabel')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.basicStyleForm.showLabel"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('showLabel')"
            >
                {{ t('chart.show_label') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item v-if="showProperty('autoFit')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.basicStyleForm.autoFit"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('autoFit')"
            >
                {{ t('chart.auto_fit') }}
            </el-checkbox>
        </el-form-item>
        <div
            v-if="showProperty('zoomLevel') && state.basicStyleForm.autoFit === false"
            class="alpha-setting"
        >
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.zoom_level') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.zoomLevel"
                            :effect="themes"
                            :max="18"
                            :min="1"
                            :step="0.1"
                            @change="changeBasicStyle('zoomLevel')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <template v-if="showProperty('mapCenter') && state.basicStyleForm.autoFit === false">
            <el-row :gutter="8">
                <el-col :span="12">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.central_point') + ' ' + t('chart.longitude')"
                        class="form-item"
                    >
                        <el-input-number
                            v-model.number="state.basicStyleForm.mapCenter.longitude"
                            :effect="props.themes"
                            :max="180"
                            :min="-180"
                            controls-position="right"
                            @change="changeBasicStyle('mapCenter.longitude')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.central_point') + ' ' + t('chart.latitude')"
                        class="form-item"
                    >
                        <el-input-number
                            v-model.number="state.basicStyleForm.mapCenter.latitude"
                            :effect="props.themes"
                            :max="90"
                            :min="-90"
                            controls-position="right"
                            @change="changeBasicStyle('mapCenter.latitude')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </template>
        <el-form-item v-if="showProperty('zoom')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.basicStyleForm.showZoom"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('showZoom')"
            >
                {{ t('chart.show_zoom') }}
            </el-checkbox>
        </el-form-item>
        <div v-if="showProperty('zoom') && state.basicStyleForm.showZoom">
            <el-form-item
                :class="'form-item-' + themes"
                :label="t('chart.button_color')"
                class="form-item"
            >
                <el-color-picker
                    v-model="state.basicStyleForm.zoomButtonColor"
                    :effect="themes"
                    :persistent="false"
                    :predefine="predefineColors"
                    :trigger-width="108"
                    class="color-picker-style"
                    is-custom
                    @change="changeBasicStyle('zoomButtonColor')"
                />
            </el-form-item>
            <el-form-item
                :class="'form-item-' + themes"
                :label="t('chart.button_background_color')"
                class="form-item"
            >
                <el-color-picker
                    v-model="state.basicStyleForm.zoomBackground"
                    :effect="themes"
                    :persistent="false"
                    :predefine="predefineColors"
                    :trigger-width="108"
                    class="color-picker-style"
                    is-custom
                    @change="changeBasicStyle('zoomBackground')"
                />
            </el-form-item>
        </div>

        <!--map end-->

        <!--table start-->
        <el-row :gutter="8">
            <el-col v-if="showProperty('tableBorderColor')" :span="12">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.table_border_color')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.basicStyleForm.tableBorderColor"
                        :effect="themes"
                        :persistent="false"
                        :predefine="predefineColors"
                        :trigger-width="mobileInPc ? 197 : 108"
                        color-format="rgb"
                        is-custom
                        show-alpha
                        @change="changeBasicStyle('tableBorderColor')"
                    />
                </el-form-item>
            </el-col>
            <el-col v-if="showProperty('tableScrollBarColor')" :span="12">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.table_scroll_bar_color')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.basicStyleForm.tableScrollBarColor"
                        :effect="themes"
                        :persistent="false"
                        :predefine="predefineColors"
                        :trigger-width="mobileInPc ? 197 : 108"
                        class="color-picker-style"
                        color-format="rgb"
                        is-custom
                        show-alpha
                        @change="changeBasicStyle('tableScrollBarColor')"
                    />
                </el-form-item>
            </el-col>
        </el-row>

        <el-form-item
            v-if="showProperty('tablePageMode')"
            :class="'form-item-' + themes"
            :label="t('chart.table_page_mode')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.tablePageMode"
                :effect="themes"
                @change="changeBasicStyle('tablePageMode', true)"
            >
                <el-radio :effect="themes" label="page">{{ t('chart.page_mode_page') }}</el-radio>
                <el-radio :effect="themes" label="pull">{{ t('chart.page_mode_pull') }}</el-radio>
            </el-radio-group>
        </el-form-item>
        <el-form-item
            v-if="showProperty('tablePageMode') && state.basicStyleForm.tablePageMode !== 'pull'"
            :class="'form-item-' + themes"
            :label="t('chart.table_pager_style')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.tablePageStyle"
                :effect="themes"
                @change="changeBasicStyle('tablePageStyle', true)"
            >
                <el-radio :effect="themes" label="simple">{{ t('chart.page_pager_simple') }}</el-radio>
                <el-radio :effect="themes" label="general">{{ t('chart.page_pager_general') }}</el-radio>
            </el-radio-group>
        </el-form-item>
        <el-form-item
            v-if="
        showProperty('tablePageMode') &&
        state.basicStyleForm.tablePageMode === 'page' &&
        state.basicStyleForm.tablePageStyle === 'simple'
      "
            :class="'form-item-' + themes"
            :label="t('chart.table_page_size')"
            class="form-item"
        >
            <el-select
                v-model="state.basicStyleForm.tablePageSize"
                :effect="themes"
                :placeholder="t('chart.table_page_size')"
                @change="changeBasicStyle('tablePageSize', true)"
            >
                <el-option
                    v-for="item in pageSizeOptions"
                    :key="item.value"
                    :label="item.name"
                    :value="item.value"
                />
            </el-select>
        </el-form-item>

        <!--table end-->

        <!--table2 start-->
        <el-form-item
            v-if="showProperty('tableColumnMode')"
            :class="'form-item-' + themes"
            :label="t('chart.table_column_width_config')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.tableColumnMode"
                class="table-column-mode"
                @change="changeBasicStyle('tableColumnMode')"
            >
                <el-radio :effect="themes" label="adapt">
                    {{ t('chart.table_column_adapt') }}
                </el-radio>
                <el-radio :effect="themes" label="custom">
                    {{ t('chart.table_column_fixed') }}
                </el-radio>
                <el-radio v-show="chart.type !== 'table-pivot'" :effect="themes" label="field">
                    {{ t('chart.table_column_custom') }}
                </el-radio>
            </el-radio-group>
        </el-form-item>
        <el-form-item
            v-if="showProperty('tableColumnMode') && state.basicStyleForm.tableColumnMode === 'custom'"
            :class="'form-item-' + themes"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model.number="state.basicStyleForm.tableColumnWidth"
                :effect="themes"
                :min="10"
                controls-position="right"
                @change="changeBasicStyle('tableColumnWidth')"
            />
        </el-form-item>
        <el-form-item
            v-if="showProperty('tableColumnMode') && state.basicStyleForm.tableColumnMode === 'field'"
            class="form-item table-field-width-config"
            label=""
        >
            <el-select
                v-model="state.fieldColumnWidth.fieldId"
                :disabled="batchOptStatus"
                :effect="themes"
                @change="changeFieldColumn()"
            >
                <el-option
                    v-for="item in state.basicStyleForm.tableFieldWidth"
                    :key="item.fieldId"
                    :label="item.name"
                    :value="item.fieldId"
                />
            </el-select>
            <el-input
                v-model.number="state.fieldColumnWidth.width"
                :disabled="batchOptStatus"
                :effect="themes"
                class="basic-input-number"
                type="number"
                @change="changeFieldColumnWidth()"
            >
                <template #append>%</template>
            </el-input>
        </el-form-item>
        <el-form-item
            v-if="showProperty('showSummary')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.basicStyleForm.showSummary"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('showSummary')"
            >
                {{ t('chart.table_show_summary') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('summaryLabel') && state.basicStyleForm.showSummary"
            :class="'form-item-' + themes"
            :label="t('chart.table_summary_label')"
            class="form-item"
        >
            <el-input
                v-model="state.basicStyleForm.summaryLabel"
                :effect="themes"
                :max-length="10"
                type="text"
                @blur="changeBasicStyle('summaryLabel')"
            />
        </el-form-item>
        <el-form-item v-if="showProperty('autoWrap')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.basicStyleForm.autoWrap"
                :disabled="mergeCell"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('autoWrap')"
            >
        <span class="data-area-label">
          <span style="margin-right: 4px">{{ t('chart.table_auto_break_line') }}</span>
          <el-tooltip v-if="mergeCell" class="item" effect="dark" placement="bottom">
            <template #content>
              <div>{{ t('chart.merge_cells_break_line_tip') }}</div>
            </template>
            <el-icon :class="{ 'hint-icon--dark': themes === 'dark' }" class="hint-icon">
              <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
            </el-icon>
          </el-tooltip>
          <el-tooltip v-else class="item" effect="dark" placement="bottom">
            <template #content>
              <div>{{ t('chart.table_break_line_tip') }}</div>
            </template>
            <el-icon :class="{ 'hint-icon--dark': themes === 'dark' }" class="hint-icon">
              <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
            </el-icon>
          </el-tooltip>
        </span>
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('autoWrap') && state.basicStyleForm.autoWrap"
            :class="'form-item-' + themes"
            :label="t('chart.table_break_line_max_lines')"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model="state.basicStyleForm.maxLines"
                :disabled="mergeCell"
                :effect="themes"
                :min="1"
                :precision="0"
                :show-input-controls="false"
                :step="1"
                controls-position="right"
                @change="changeBasicStyle('maxLines')"
            />
        </el-form-item>
        <el-form-item
            v-if="showProperty('showHoverStyle')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.basicStyleForm.showHoverStyle"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('showHoverStyle')"
            >
                {{ t('chart.show_hover_style') }}
            </el-checkbox>
        </el-form-item>
        <!--table2 end-->
        <!--gauge start-->
        <el-form-item
            v-if="showProperty('gaugeStyle')"
            :class="'form-item-' + themes"
            :label="t('chart.chart_style')"
            class="form-item"
        >
            <el-select
                v-model="state.basicStyleForm.gaugeStyle"
                :effect="themes"
                @change="changeBasicStyle('gaugeStyle')"
            >
                <el-option
                    v-for="item in gaugeStyleOptions"
                    :key="item.value"
                    :label="item.name"
                    :value="item.value"
                />
            </el-select>
        </el-form-item>
        <el-form-item
            v-if="showProperty('gaugeAxisLine')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.basicStyleForm.gaugeAxisLine"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('gaugeAxisLine')"
            >
                {{ t('chart.gauge_axis_label') }}
            </el-checkbox
            >
        </el-form-item>
        <el-form-item
            v-if="showProperty('gaugePercentLabel') && state.basicStyleForm.gaugeAxisLine"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.basicStyleForm.gaugePercentLabel"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('gaugePercentLabel')"
            >
                {{ t('chart.gauge_percentage_tick') }}
            </el-checkbox
            >
        </el-form-item>
        <!--gauge end-->
        <!--bar start-->
        <el-form-item
            v-if="showProperty('barDefault')"
            :class="'form-item-' + themes"
            class="form-item form-item-slider"
        >
            <el-checkbox
                v-model="state.basicStyleForm.barDefault"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('barDefault')"
            >
                {{ t('chart.adapt') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('barDefault') && !state.basicStyleForm.barDefault"
            :class="'form-item-' + themes"
            :label="t('chart.bar_gap')"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model="state.basicStyleForm.barGap"
                :effect="themes"
                :max="5"
                :min="0"
                :show-input-controls="false"
                :step="0.1"
                controls-position="right"
                @change="changeBasicStyle('barGap')"
            />
        </el-form-item>
        <div v-if="showProperty('columnWidthRatio')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.column_width_ratio') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="13">
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.columnWidthRatio"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            @change="changeBasicStyle('columnWidthRatio')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="11" style="padding-top: 2px">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-input
                            v-model="state.basicStyleForm.columnWidthRatio"
                            :controls="false"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            class="basic-input-number"
                            type="number"
                            @change="onColumnWidthRatioChange"
                        >
                            <template #suffix> %</template>
                        </el-input>
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <!--bar end-->
        <!--line area start-->
        <el-row :gutter="8">
            <el-col :span="12">
                <el-form-item
                    v-if="showProperty('lineWidth')"
                    :class="'form-item-' + themes"
                    :label="t('chart.line_width')"
                    class="form-item form-item-slider"
                >
                    <el-input-number
                        v-model="state.basicStyleForm.lineWidth"
                        :effect="themes"
                        :max="10"
                        :min="0"
                        controls-position="right"
                        @change="changeBasicStyle('lineWidth')"
                    />
                </el-form-item>
            </el-col>
        </el-row>
        <el-row :gutter="8">
            <el-col :span="12">
                <el-form-item
                    v-if="showProperty('lineSymbol')"
                    :class="'form-item-' + themes"
                    :label="t('chart.line_symbol')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.basicStyleForm.lineSymbol"
                        :effect="themes"
                        :placeholder="t('chart.line_symbol')"
                        @change="changeBasicStyle('lineSymbol')"
                    >
                        <el-option
                            v-for="item in symbolOptions"
                            :key="item.value"
                            :label="item.name"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item
                    v-if="showProperty('lineSymbolSize')"
                    :class="'form-item-' + themes"
                    :label="t('chart.line_symbol_size')"
                    class="form-item form-item-slider"
                >
                    <el-input-number
                        v-model="state.basicStyleForm.lineSymbolSize"
                        :effect="themes"
                        :max="20"
                        :min="0"
                        controls-position="right"
                        @change="changeBasicStyle('lineSymbolSize')"
                    />
                </el-form-item>
            </el-col>
        </el-row>
        <el-form-item
            v-if="showProperty('lineSmooth')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.basicStyleForm.lineSmooth"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('lineSmooth')"
            >
                {{ t('chart.line_smooth') }}
            </el-checkbox>
        </el-form-item>
        <!--line area end-->
        <!--radar begin-->
        <el-form-item
            v-if="showProperty('radarShape')"
            :class="'form-item-' + themes"
            :label="t('chart.shape')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.basicStyleForm.radarShape"
                :effect="themes"
                @change="changeBasicStyle('radarShape')"
            >
                <el-radio :effect="themes" label="polygon">{{ t('chart.polygon') }}</el-radio>
                <el-radio :effect="themes" label="circle">{{ t('chart.circle') }}</el-radio>
            </el-radio-group>
        </el-form-item>
        <el-form-item
            v-if="showProperty('radarShowPoint')"
            :class="'form-item-' + themes"
            class="form-item margin-bottom-8"
        >
            <el-checkbox
                v-model="state.basicStyleForm.radarShowPoint"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('radarShowPoint')"
            >
                {{ $t('chart.radar_point') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('radarPointSize')"
            :class="'form-item-' + themes"
            :label="t('chart.radar_point_size')"
            class="form-item margin-bottom-8"
            style="padding-left: 20px"
        >
            <el-input-number
                v-model="state.basicStyleForm.radarPointSize"
                :disabled="!state.basicStyleForm.radarShowPoint"
                :effect="themes"
                :max="30"
                :min="0"
                controls-position="right"
                size="middle"
                style="width: 100%"
                @change="changeBasicStyle('radarPointSize')"
            />
        </el-form-item>
        <el-form-item
            v-if="showProperty('radarAreaColor')"
            :class="'form-item-' + themes"
            class="form-item margin-bottom-8"
        >
            <el-checkbox
                v-model="state.basicStyleForm.radarAreaColor"
                :effect="themes"
                size="small"
                @change="changeBasicStyle('radarAreaColor')"
            >
                {{ $t('chart.radar_area_color') }}
            </el-checkbox>
        </el-form-item>
        <!--radar end-->
        <!--scatter start-->
        <el-form-item
            v-if="showProperty('scatterSymbol')"
            :class="'form-item-' + themes"
            :label="t('chart.bubble_symbol')"
            class="form-item"
        >
            <el-select
                v-model="state.basicStyleForm.scatterSymbol"
                :effect="themes"
                :placeholder="t('chart.line_symbol')"
                @change="changeBasicStyle('scatterSymbol')"
            >
                <el-option
                    v-for="item in symbolOptions"
                    :key="item.value"
                    :label="item.name"
                    :value="item.value"
                />
            </el-select>
        </el-form-item>
        <el-form-item
            v-if="showProperty('scatterSymbolSize')"
            :class="'form-item-' + themes"
            :label="t('chart.bubble_size')"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model="state.basicStyleForm.scatterSymbolSize"
                :effect="themes"
                :max="40"
                :min="1"
                controls-position="right"
                @change="changeBasicStyle('scatterSymbolSize')"
            />
        </el-form-item>
        <!--scatter end-->

        <!--symbol map start-->
        <el-form-item
            v-if="showProperty('mapSymbol')"
            :class="'form-item-' + themes"
            :label="t('chart.bubble_symbol')"
            class="form-item"
        >
            <el-select
                v-model="state.basicStyleForm.mapSymbol"
                :effect="themes"
                :placeholder="t('chart.line_symbol')"
                @change="changeBasicStyle('mapSymbol')"
            >
                <el-option
                    v-for="item in symbolOptions"
                    :key="item.value"
                    :label="item.name"
                    :value="item.value"
                />
            </el-select>
        </el-form-item>
        <el-form-item
            v-if="showProperty('mapSymbolSize')"
            :class="'form-item-' + themes"
            :label="t('chart.bubble_size')"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model="state.basicStyleForm.mapSymbolSize"
                :effect="themes"
                :max="40"
                :min="1"
                controls-position="right"
                @change="changeBasicStyle('mapSymbolSize')"
            />
        </el-form-item>
        <el-form-item
            v-if="showProperty('mapSymbolOpacity')"
            :class="'form-item-' + themes"
            :label="t('chart.not_alpha')"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model="state.basicStyleForm.mapSymbolOpacity"
                :effect="themes"
                :max="100"
                :min="1"
                controls-position="right"
                @change="changeBasicStyle('mapSymbolOpacity')"
            />
        </el-form-item>
        <el-form-item
            v-if="showProperty('mapSymbol') && state.basicStyleForm.mapSymbol !== 'marker'"
            :class="'form-item-' + themes"
            :label="t('visualization.border_color')"
            class="form-item form-item-slider"
        >
            <el-input-number
                v-model="state.basicStyleForm.mapSymbolStrokeWidth"
                :effect="themes"
                :max="5"
                :min="0"
                controls-position="right"
                @change="changeBasicStyle('mapSymbolStrokeWidth')"
            />
        </el-form-item>
        <!-- pie/rose start -->

        <div v-show="showProperty('topN')" class="top-n-setting">
            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.basicStyleForm.calcTopN"
                    :effect="themes"
                    @change="changeBasicStyle('calcTopN')"
                >
                    {{ $t('chart.top_n_desc') }}
                </el-checkbox>
            </el-form-item>
            <el-form-item
                v-show="state.basicStyleForm.calcTopN"
                :class="'form-item-' + themes"
                class="form-item"
            >
                <span>{{ $t('chart.top_n_input_1') }}</span>
                <el-input-number
                    v-model="state.basicStyleForm.topN"
                    :effect="themes"
                    :max="100"
                    :min="1"
                    :precision="0"
                    :step-strictly="true"
                    :value-on-clear="5"
                    controls-position="right"
                    size="small"
                    @change="changeBasicStyle('topN')"
                />
                <span>{{ $t('chart.top_n_input_2') }}</span>
            </el-form-item>
            <el-form-item
                v-show="state.basicStyleForm.calcTopN"
                :class="'form-item-' + themes"
                :label="t('chart.top_n_label')"
                class="form-item"
            >
                <el-input
                    v-model="state.basicStyleForm.topNLabel"
                    :effect="themes"
                    :maxlength="50"
                    size="small"
                    @change="changeBasicStyle('topNLabel')"
                />
            </el-form-item>
        </div>
        <div v-if="showProperty('innerRadius')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.pie_inner_radius_percent') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="13">
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.innerRadius"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            @change="changeBasicStyle('innerRadius')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="11">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-input
                            v-model="state.basicStyleForm.innerRadius"
                            :controls="false"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            class="basic-input-number"
                            type="number"
                            @change="changeBasicStyle('innerRadius')"
                        >
                            <template #suffix> %</template>
                        </el-input>
                    </el-form-item>
                </el-col>
            </el-row>
        </div>

        <div v-if="showProperty('radius')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.pie_outer_radius') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="13">
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.basicStyleForm.radius"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            @change="changeBasicStyle('radius')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="11">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-input
                            v-model="state.basicStyleForm.radius"
                            :controls="false"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            class="basic-input-number"
                            type="number"
                            @change="changeBasicStyle('radius')"
                        >
                            <template #suffix> %</template>
                        </el-input>
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <!-- pie/rose end -->
        <!-- circle-packing start -->
        <div v-if="showProperty('circleBorderStyle')">
            <div class="alpha-setting">
                <el-row style="display: flex; width: 100%">
                    <el-col :span="10">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="t('chart.circle_packing_border_color')"
                            class="form-item"
                        >
                            <el-color-picker
                                v-model="state.basicStyleForm.circleBorderColor"
                                :predefine="state.predefineColors"
                                :triggerWidth="65"
                                class="color-picker-style"
                                is-custom
                                show-alpha
                                @change="changeBasicStyle('circleBorderColor')"
                            >
                            </el-color-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="14">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="t('chart.circle_packing_border_width')"
                            class="form-item"
                        >
                            <el-input-number
                                v-model="state.basicStyleForm.circleBorderWidth"
                                :effect="themes"
                                :max="50"
                                :min="0"
                                class="color-picker-style"
                                controls-position="right"
                                @change="changeBasicStyle('circleBorderWidth')"
                            >
                            </el-input-number>
                        </el-form-item>
                    </el-col>
                </el-row>
            </div>
            <el-row>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.circle_packing_padding')"
                    class="form-item"
                    style="width: 150px"
                >
                    <el-input-number
                        v-model="state.basicStyleForm.circlePadding"
                        :effect="themes"
                        :max="10"
                        :min="0"
                        class="color-picker-style"
                        controls-position="right"
                        @change="changeBasicStyle('circlePadding')"
                    >
                    </el-input-number>
                </el-form-item>
            </el-row>
        </div>
        <!-- circle-packing end -->
    </div>
</template>
<style lang="less" scoped>
.color-picker-style {
    cursor: pointer;
    z-index: 1003;
}

.alpha-setting {
    display: flex;
    width: 100%;

    .alpha-slider {
        padding: 0 8px;

        :deep(.ed-slider__button-wrapper) {
            --ed-slider-button-wrapper-size: 36px;
            --ed-slider-button-size: 16px;
        }
    }

    .alpha-label {
        padding-right: 8px;
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        height: 32px;
        line-height: 32px;
        display: inline-flex;
        align-items: flex-start;

        min-width: 56px;

        &.dark {
            color: #a6a6a6;
        }
    }
}

.table-field-width-config {
    .ed-select {
        width: 100px !important;

        :deep(.ed-input__wrapper) {
            border-radius: 4px 0 0 4px !important;
        }
    }

    .ed-input-group {
        width: 120px;

        :deep(.ed-input__wrapper) {
            border-radius: 0 !important;
        }

        :deep(.ed-input-group__append) {
            padding: 0 8px;
        }
    }
}

.table-column-mode {
    :deep(.ed-radio) {
        margin-right: 10px !important;
    }
}

.basic-input-number {
    :deep(input) {
        -webkit-appearance: none;
        -moz-appearance: textfield;

        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
            -webkit-appearance: none;
        }
    }
}

.top-n-setting {
    .ed-input-number {
        width: 80px !important;
        margin: 0 2px;
    }

    :deep(span) {
        font-size: 12px;
    }
}

.avatar-uploader-container {
    :deep(.ed-upload--picture-card) {
        background: #eff0f1;
        border: 1px dashed #dee0e3;
        border-radius: 4px;

        .ed-icon {
            color: #1f2329;
        }

        &:hover {
            .ed-icon {
                color: var(--ed-color-primary);
            }
        }
    }

    &.img-area_dark {
        :deep(.ed-upload-list__item).is-ready {
            border-color: #434343;
        }

        :deep(.ed-upload--picture-card) {
            background: #373737;
            border-color: #434343;

            .ed-icon {
                color: #ebebeb;
            }
        }
    }

    &.img-area_light {
        :deep(.ed-upload-list__item).is-ready {
            border-color: #dee0e3;
        }
    }

    :deep(.ed-upload-list__item-preview) {
        display: none !important;
    }

    :deep(.ed-upload-list__item-delete) {
        margin-left: 0 !important;
    }

    :deep(.ed-upload-list__item-status-label) {
        display: none !important;
    }

    :deep(.ed-icon--close-tip) {
        display: none !important;
    }
}

.avatar-uploader {
    width: 90px;
    height: 80px;
    overflow: hidden;
}

.avatar-uploader {
    width: 90px;

    :deep(.ed-upload) {
        width: 80px;
        height: 80px;
        line-height: 90px;
    }

    :deep(.ed-upload-list li) {
        width: 80px !important;
        height: 80px !important;
    }

    :deep(.ed-upload--picture-card) {
        background: #eff0f1;
        border: 1px dashed #dee0e3;
        border-radius: 4px;

        .ed-icon {
            color: #1f2329;
        }

        &:hover {
            .ed-icon {
                color: var(--ed-color-primary);
            }
        }
    }
}

.uploader {
    :deep(.ed-form-item__content) {
        justify-content: center;
    }
}

.data-area-label {
    text-align: left;
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
}
</style>
