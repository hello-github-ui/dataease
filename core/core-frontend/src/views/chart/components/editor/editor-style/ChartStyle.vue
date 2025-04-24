<script lang="ts" setup>
import {useI18n} from '@/hooks/web/useI18n'
import {computed, nextTick, PropType, ref, toRefs, watch} from 'vue'
import MiscSelector from '@/views/chart/components/editor/editor-style/components/MiscSelector.vue'
import LabelSelector from '@/views/chart/components/editor/editor-style/components/LabelSelector.vue'
import TooltipSelector from '@/views/chart/components/editor/editor-style/components/TooltipSelector.vue'
import XAxisSelector from '@/views/chart/components/editor/editor-style/components/XAxisSelector.vue'
import YAxisSelector from '@/views/chart/components/editor/editor-style/components/YAxisSelector.vue'
import DualYAxisSelector from '@/views/chart/components/editor/editor-style/components/DualYAxisSelector.vue'
import TitleSelector from '@/views/chart/components/editor/editor-style/components/TitleSelector.vue'
import LegendSelector from '@/views/chart/components/editor/editor-style/components/LegendSelector.vue'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import CollapseSwitchItem from '@/components/collapse-switch-item/src/CollapseSwitchItem.vue'
import {ElCollapse, ElCollapseItem} from 'element-plus-secondary'
import BasicStyleSelector from '@/views/chart/components/editor/editor-style/components/BasicStyleSelector.vue'
import SymbolicStyleSelector from '@/views/chart/components/editor/editor-style/components/SymbolicStyleSelector.vue'
import DualBasicStyleSelector from '@/views/chart/components/editor/editor-style/components/DualBasicStyleSelector.vue'
import ComponentPosition from '@/components/visualization/common/ComponentPosition.vue'
import BackgroundOverallCommon from '@/components/visualization/component-background/BackgroundOverallCommon.vue'
import TableHeaderSelector from '@/views/chart/components/editor/editor-style/components/table/TableHeaderSelector.vue'
import TableCellSelector from '@/views/chart/components/editor/editor-style/components/table/TableCellSelector.vue'
import TableTotalSelector from '@/views/chart/components/editor/editor-style/components/table/TableTotalSelector.vue'
import MiscStyleSelector from '@/views/chart/components/editor/editor-style/components/MiscStyleSelector.vue'
import IndicatorValueSelector from '@/views/chart/components/editor/editor-style/components/IndicatorValueSelector.vue'
import IndicatorNameSelector from '@/views/chart/components/editor/editor-style/components/IndicatorNameSelector.vue'
import QuadrantSelector from '@/views/chart/components/editor/editor-style/components/QuadrantSelector.vue'
import FlowMapLineSelector from '@/views/chart/components/editor/editor-style/components/FlowMapLineSelector.vue'
import FlowMapPointSelector from '@/views/chart/components/editor/editor-style/components/FlowMapPointSelector.vue'
import CommonBorderSetting from '@/custom-component/common/CommonBorderSetting.vue'
import {snapshotStoreWithOut} from '@/store/modules/data-visualization/snapshot'

const snapshotStore = snapshotStoreWithOut()

const dvMainStore = dvMainStoreWithOut()
const {dvInfo, batchOptStatus, mobileInPc} = storeToRefs(dvMainStore)
const {t} = useI18n()

const state = {
    attrActiveNames: [],
    styleActiveNames: [],
    initReady: true
}

const props = defineProps({
    commonBackgroundPop: {
        type: Object,
        required: false
    },
    commonBorderPop: {
        type: Object,
        required: false
    },
    chart: {
        type: Object as PropType<ChartObj>,
        required: true
    },
    themes: {
        type: String as PropType<EditorTheme>,
        default: 'dark'
    },
    dimensionData: {
        type: Array,
        required: true
    },
    quotaData: {
        type: Array,
        required: true
    },
    properties: {
        type: Array as PropType<EditorProperty[]>,
        required: false,
        default: () => {
            return []
        }
    },
    propertyInnerAll: {
        type: Object as PropType<EditorPropertyInner>,
        required: false,
        default: () => {
            return {}
        }
    },
    selectorSpec: {
        type: Object as PropType<EditorSelectorSpec>,
        required: false,
        default: () => {
            return {}
        }
    },
    allFields: {
        type: Array,
        required: true
    }
})

const {
    chart,
    themes,
    properties,
    propertyInnerAll,
    commonBackgroundPop,
    commonBorderPop,
    selectorSpec
} = toRefs(props)
const emit = defineEmits([
    'onColorChange',
    'onMiscChange',
    'onLabelChange',
    'onTooltipChange',
    'onChangeXAxisForm',
    'onChangeYAxisForm',
    'onChangeYAxisExtForm',
    'onTextChange',
    'onLegendChange',
    'onBasicStyleChange',
    'onBackgroundChange',
    'onStyleAttrChange',
    'onTableHeaderChange',
    'onTableCellChange',
    'onTableTotalChange',
    'onChangeMiscStyleForm',
    'onExtTooltipChange',
    'onIndicatorChange',
    'onIndicatorNameChange',
    'onChangeQuadrantForm',
    'onChangeFlowMapLineForm',
    'onChangeFlowMapPointForm'
])

const indicatorValueRef = ref()
const indicatorNameRef = ref()

const positionComponentShow = computed(() => {
    return !batchOptStatus.value && dvInfo.value.type !== 'dashboard'
})

const showProperties = (property: EditorProperty) => properties.value?.includes(property)

const onMiscChange = (val, prop) => {
    emit('onMiscChange', val, prop)
}

const onLabelChange = (val, prop) => {
    state.initReady && emit('onLabelChange', val, prop)
}

const onTooltipChange = (val, prop) => {
    state.initReady && emit('onTooltipChange', val, prop)
}

const onChangeXAxisForm = (val, prop) => {
    state.initReady && emit('onChangeXAxisForm', val, prop)
}

const onChangeYAxisForm = (val, prop) => {
    if (prop === 'show' && chart.value.type.includes('chart-mix')) {
        chart.value.customStyle.yAxisExt.show = val.show
        onChangeYAxisExtForm(chart.value.customStyle.yAxisExt, 'show')
    }
    state.initReady && emit('onChangeYAxisForm', val, prop)
}

const onChangeYAxisExtForm = (val, prop) => {
    state.initReady && emit('onChangeYAxisExtForm', val, prop)
}

const onTextChange = (val, prop) => {
    state.initReady && emit('onTextChange', val, prop)
}

const onIndicatorChange = (val, prop) => {
    const value = {indicatorValue: val, indicatorName: undefined}
    if (prop === 'color' || prop === 'suffixColor') {
        value.indicatorName = indicatorNameRef.value?.getFormData()
    }
    state.initReady && emit('onIndicatorChange', value, prop)
}

const onIndicatorNameChange = (val, prop) => {
    const value = {indicatorName: val, indicatorValue: undefined}
    if (prop === 'color') {
        value.indicatorValue = indicatorValueRef.value?.getFormData()
    }
    state.initReady && emit('onIndicatorNameChange', value, prop)
}

const onLegendChange = (val, prop) => {
    state.initReady && emit('onLegendChange', val, prop)
}
const onBasicStyleChange = (val, prop) => {
    state.initReady && emit('onBasicStyleChange', val, prop)
}

const onBackgroundChange = (val, prop) => {
    snapshotStore.recordSnapshotCache('onBackgroundChange')
    state.initReady && emit('onBackgroundChange', val, prop)
}

const onActiveChange = val => {
    snapshotStore.recordSnapshotCache('onActiveChange')
    state.initReady &&
    emit('onStyleAttrChange', {
        custom: 'style',
        property: 'active',
        value: commonBorderPop.value.borderActive
    })
}

const onStyleAttrChange = ({key, value}) => {
    state.initReady && emit('onStyleAttrChange', {custom: 'style', property: key, value: value})
}

const onTableHeaderChange = (val, prop) => {
    emit('onTableHeaderChange', val, prop)
}
const onTableCellChange = (val, prop) => {
    emit('onTableCellChange', val, prop)
}
const onTableTotalChange = (val, prop) => {
    emit('onTableTotalChange', val, prop)
}
const onChangeMiscStyleForm = (val, prop) => {
    emit('onChangeMiscStyleForm', val, prop)
}

const onExtTooltipChange = val => {
    emit('onExtTooltipChange', val)
}
const onChangeQuadrantForm = val => {
    emit('onChangeQuadrantForm', val)
}
const onChangeFlowMapLineForm = (val, prop) => {
    emit('onChangeFlowMapLineForm', val, prop)
}
const onChangeFlowMapPointForm = val => {
    emit('onChangeFlowMapPointForm', val)
}
watch(
    () => props.chart.id,
    () => {
        state.initReady = false
        nextTick(() => {
            state.initReady = true
        })
    },
    {deep: true}
)
</script>

<template>
    <el-row :class="'style-' + themes" class="view-panel">
        <div class="attr-style">
            <el-row class="de-collapse-style">
                <el-collapse v-model="state.attrActiveNames" class="style-collapse">
                    <el-collapse-item
                        v-if="positionComponentShow"
                        :effect="themes"
                        :title="t('visualization.position')"
                        name="position"
                    >
                        <component-position :themes="themes"/>
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('basic-style-selector')"
                        :effect="themes"
                        :title="t('chart.basic_style')"
                        name="basicStyle"
                    >
                        <basic-style-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['basic-style-selector']"
                            :themes="themes"
                            @onBasicStyleChange="onBasicStyleChange"
                            @onMiscChange="onMiscChange"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('dual-basic-style-selector')"
                        :effect="themes"
                        :title="t('chart.basic_style')"
                        name="basicStyle"
                    >
                        <DualBasicStyleSelector
                            :chart="chart"
                            :property-inner="propertyInnerAll['dual-basic-style-selector']"
                            :themes="themes"
                            @onBasicStyleChange="onBasicStyleChange"
                            @onMiscChange="onMiscChange"
                        />
                    </el-collapse-item>
                    <collapse-switch-item
                        v-if="showProperties('title-selector')"
                        v-model="chart.customStyle.text.show"
                        :change-model="chart.customStyle.text"
                        :themes="themes"
                        :title="$t('chart.title')"
                        name="title"
                        @modelChange="val => onTextChange(val, 'show')"
                    >
                        <title-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['title-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onTextChange="onTextChange"
                        />
                    </collapse-switch-item>
                    <collapse-switch-item
                        v-if="showProperties('legend-selector')"
                        v-model="chart.customStyle.legend.show"
                        :change-model="chart.customStyle.legend"
                        :themes="themes"
                        :title="$t('chart.legend')"
                        name="legend"
                        @modelChange="val => onLegendChange(val, 'show')"
                    >
                        <legend-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['legend-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onLegendChange="onLegendChange"
                            @onMiscChange="onMiscChange"
                        />
                    </collapse-switch-item>
                    <el-collapse-item
                        v-if="showProperties('background-overall-component') && commonBackgroundPop"
                        :effect="themes"
                        :title="t('visualization.background')"
                        name="background"
                    >
                        <background-overall-common
                            :common-background-pop="commonBackgroundPop"
                            :themes="themes"
                            component-position="component"
                            @onBackgroundChange="onBackgroundChange"
                        />
                    </el-collapse-item>
                    <collapse-switch-item
                        v-if="showProperties('border-style') && commonBorderPop && !batchOptStatus"
                        v-model="commonBorderPop.borderActive"
                        :themes="themes"
                        :title="t('visualization.board')"
                        class="common-style-area"
                        name="borderSetting"
                        @modelChange="val => onActiveChange(val)"
                    >
                        <common-border-setting
                            :style-info="commonBorderPop"
                            :themes="themes"
                            @onStyleAttrChange="onStyleAttrChange"
                        ></common-border-setting>
                    </collapse-switch-item>

                    <el-collapse-item
                        v-if="showProperties('symbolic-style-selector')"
                        :effect="themes"
                        :title="t('chart.symbolic')"
                        name="symbolicStyle"
                    >
                        <SymbolicStyleSelector
                            :chart="chart"
                            :property-inner="propertyInnerAll['symbolic-style-selector']"
                            :themes="themes"
                            @onBasicStyleChange="onBasicStyleChange"
                            @onMiscChange="onMiscChange"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('indicator-value-selector')"
                        :effect="themes"
                        :title="t('chart.indicator_value')"
                        name="indicator-value"
                    >
                        <indicator-value-selector
                            ref="indicatorValueRef"
                            :chart="chart"
                            :property-inner="propertyInnerAll['indicator-value-selector']"
                            :quota-fields="props.quotaData"
                            :themes="themes"
                            class="attr-selector"
                            @onIndicatorChange="onIndicatorChange"
                        />
                    </el-collapse-item>
                    <collapse-switch-item
                        v-if="showProperties('indicator-name-selector')"
                        v-model="chart.customAttr.indicatorName.show"
                        :change-model="chart.customAttr.indicatorName"
                        :themes="themes"
                        :title="t('visualization.indicator_name')"
                        name="indicator-name"
                        @modelChange="val => onIndicatorNameChange(val, 'show')"
                    >
                        <indicator-name-selector
                            ref="indicatorNameRef"
                            :chart="chart"
                            :property-inner="propertyInnerAll['indicator-name-selector']"
                            :quota-fields="props.quotaData"
                            :themes="themes"
                            class="attr-selector"
                            @onIndicatorNameChange="onIndicatorNameChange"
                        />
                    </collapse-switch-item>
                    <el-collapse-item
                        v-if="showProperties('misc-selector') && !chart.type.includes('mix')"
                        :effect="themes"
                        :title="t('visualization.component_size')"
                        name="size"
                    >
                        <misc-selector
                            :chart="chart"
                            :mobile-in-pc="mobileInPc"
                            :property-inner="propertyInnerAll['misc-selector']"
                            :quota-fields="props.quotaData"
                            :themes="themes"
                            class="attr-selector"
                            @onMiscChange="onMiscChange"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('misc-style-selector')"
                        :effect="themes"
                        :title="selectorSpec['misc-style-selector']?.title || t('chart.tooltip_axis')"
                        name="size"
                    >
                        <misc-style-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['misc-style-selector']"
                            :quota-fields="props.quotaData"
                            :themes="themes"
                            class="attr-selector"
                            @onChangeMiscStyleForm="onChangeMiscStyleForm"
                        />
                    </el-collapse-item>
                    <collapse-switch-item
                        v-if="showProperties('label-selector')"
                        v-model="chart.customAttr.label.show"
                        :change-model="chart.customAttr.label"
                        :themes="themes"
                        :title="t('chart.label')"
                        name="label"
                        @modelChange="val => onLabelChange({ data: val }, 'show')"
                    >
                        <label-selector
                            :all-fields="props.allFields"
                            :chart="chart"
                            :property-inner="propertyInnerAll['label-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onLabelChange="onLabelChange"
                        />
                    </collapse-switch-item>
                    <!-- tooltip 为鼠标悬停 移动端table看不到效果 不再单独配置 -->
                    <collapse-switch-item
                        v-if="
              showProperties('tooltip-selector') &&
              (!mobileInPc || (mobileInPc && chart.type.indexOf('table') === -1))
            "
                        v-model="chart.customAttr.tooltip.show"
                        :change-model="chart.customAttr.tooltip"
                        :show-switch="propertyInnerAll['tooltip-selector'].includes('show')"
                        :themes="themes"
                        :title="t('chart.tooltip')"
                        name="tooltip"
                        @modelChange="val => onTooltipChange({ data: val }, 'show')"
                    >
                        <tooltip-selector
                            :all-fields="props.allFields"
                            :chart="chart"
                            :property-inner="propertyInnerAll['tooltip-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onExtTooltipChange="onExtTooltipChange"
                            @onTooltipChange="onTooltipChange"
                        />
                    </collapse-switch-item>
                    <collapse-switch-item
                        v-if="showProperties('table-header-selector')"
                        v-model="chart.customAttr.tableHeader.showTableHeader"
                        :change-model="chart.customAttr.tableHeader"
                        :effect="themes"
                        :show-switch="propertyInnerAll['table-header-selector'].includes('showTableHeader')"
                        :title="t('chart.table_header')"
                        name="tableHeader"
                        @modelChange="val => onTableHeaderChange(val, 'showTableHeader')"
                    >
                        <table-header-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['table-header-selector']"
                            :themes="themes"
                            @onTableHeaderChange="onTableHeaderChange"
                        />
                    </collapse-switch-item>
                    <el-collapse-item
                        v-if="showProperties('table-cell-selector')"
                        :effect="themes"
                        :title="t('chart.table_cell')"
                        name="tableCell"
                    >
                        <table-cell-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['table-cell-selector']"
                            :themes="themes"
                            @onTableCellChange="onTableCellChange"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('table-total-selector')"
                        :effect="themes"
                        :title="t('chart.table_total')"
                        name="tableTotal"
                    >
                        <table-total-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['table-total-selector']"
                            :themes="themes"
                            @onTableTotalChange="onTableTotalChange"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('quadrant-selector')"
                        :effect="themes"
                        :title="t('chart.quadrant')"
                        name="quadrant"
                    >
                        <quadrant-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['quadrant-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onChangeQuadrantForm="onChangeQuadrantForm"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('flow-map-line-selector')"
                        :effect="themes"
                        :title="t('chart.line')"
                        name="flowMapLineSelector"
                    >
                        <flow-map-line-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['flow-map-line-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onBasicStyleChange="onBasicStyleChange"
                            @onChangeFlowMapLineForm="onChangeFlowMapLineForm"
                        />
                    </el-collapse-item>
                    <el-collapse-item
                        v-if="showProperties('flow-map-point-selector')"
                        :effect="themes"
                        :title="t('visualization.component_annotation')"
                        name="flowMapPointSelector"
                    >
                        <flow-map-point-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['flow-map-point-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onChangeFlowMapPointForm="onChangeFlowMapPointForm"
                        />
                    </el-collapse-item>
                </el-collapse>

                <el-collapse v-model="state.styleActiveNames" class="style-collapse">
                    <collapse-switch-item
                        v-if="showProperties('x-axis-selector')"
                        v-model="chart.customStyle.xAxis.show"
                        :change-model="chart.customStyle.xAxis"
                        :themes="themes"
                        :title="selectorSpec['x-axis-selector']?.title || t('chart.xAxis')"
                        name="xAxis"
                        @modelChange="val => onChangeXAxisForm(val, 'show')"
                    >
                        <x-axis-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['x-axis-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onChangeXAxisForm="onChangeXAxisForm"
                        />
                    </collapse-switch-item>
                    <collapse-switch-item
                        v-if="showProperties('y-axis-selector')"
                        v-model="chart.customStyle.yAxis.show"
                        :change-model="chart.customStyle.yAxis"
                        :themes="themes"
                        :title="t('chart.yAxis')"
                        name="yAxis"
                        @modelChange="val => onChangeYAxisForm(val, 'show')"
                    >
                        <y-axis-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['y-axis-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onChangeYAxisForm="onChangeYAxisForm"
                        />
                    </collapse-switch-item>

                    <collapse-switch-item
                        v-if="showProperties('dual-y-axis-selector')"
                        v-model="chart.customStyle.yAxis.show"
                        :change-model="chart.customStyle.yAxis"
                        :themes="themes"
                        :title="selectorSpec['dual-y-axis-selector']?.title ?? t('chart.yAxis')"
                        name="yAxis"
                        @modelChange="val => onChangeYAxisForm(val, 'show')"
                    >
                        <dual-y-axis-selector
                            :chart="chart"
                            :property-inner="propertyInnerAll['dual-y-axis-selector']"
                            :themes="themes"
                            class="attr-selector"
                            @onChangeYAxisExtForm="onChangeYAxisExtForm"
                            @onChangeYAxisForm="onChangeYAxisForm"
                        />
                    </collapse-switch-item>
                </el-collapse>
            </el-row>
        </div>
    </el-row>
</template>

<style lang="less" scoped>
.ed-row {
    display: block;
}

.prop {
    border-bottom: 1px solid @side-outline-border-color;
}

.prop-top {
    border-top: 1px solid @side-outline-border-color;
}

span {
    font-size: 14px;
}

.view-panel {
    display: flex;
    height: 100%;
    width: 100%;
}

.attr-style {
    overflow-y: auto;
    height: 100%;
    width: 100%;
}

.de-collapse-style {
    :deep(.ed-form-item) {
        display: block;
        margin-bottom: 8px;
    }

    :deep(.ed-form-item__label) {
        justify-content: flex-start;
    }
}

:deep(.ed-collapse-item) {
    &:first-child {
        .ed-collapse-item__header {
            border-top: none;
        }
    }
}

.style-collapse:empty {
    border-bottom: none;
}

:deep(.ed-collapse-item__content) {
    padding: 16px 8px 8px 8px !important;
}
</style>
