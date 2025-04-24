<script lang="ts" setup>
import icon_info_outlined from '@/assets/svg/icon_info_outlined.svg'
import {computed, onMounted, PropType, reactive, ref, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {COLOR_PANEL, DEFAULT_LABEL} from '@/views/chart/components/editor/util/chart'
import {ElFormItem, ElIcon, ElInput, ElSpace} from 'element-plus-secondary'
import {
    formatterType,
    getUnitTypeList,
    initFormatCfgUnit,
    isEnLocal,
    onChangeFormatCfgUnitLanguage
} from '@/views/chart/components/js/formatter'
import {cloneDeep, defaultsDeep, defaultTo, intersection, isEmpty, map, union} from 'lodash-es'
import {includesAny} from '../../util/StringUtils'
import {fieldType} from '@/utils/attr'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import Icon from '../../../../../../components/icon-custom/src/Icon.vue'
import {iconFieldMap} from '@/components/icon-group/field-list'

const {t} = useI18n()

const props = defineProps({
    chart: {
        type: Object as PropType<ChartObj>,
        required: true
    },
    dimensionData: {
        type: Array<any>,
        required: false
    },
    quotaData: {
        type: Array<any>,
        required: false
    },
    themes: {
        type: String as PropType<EditorTheme>,
        default: 'dark'
    },
    allFields: {
        type: Array<any>,
        required: false
    },
    propertyInner: {
        type: Array<string>
    }
})
const dvMainStore = dvMainStoreWithOut()
const toolTip = computed(() => {
    return props.themes === 'dark' ? 'ndark' : 'dark'
})
const {batchOptStatus} = storeToRefs(dvMainStore)
watch(
    [() => props.chart.customAttr.label, () => props.chart.customAttr.label.show],
    () => {
        init()
    },
    {deep: false}
)
const yAxis = computed(() => {
    if (props.chart.type.includes('chart-mix') || props.chart.type.includes('bidirectional-bar')) {
        return union(
            defaultTo(
                map(props.chart.yAxis, y => {
                    return {...y, axisType: 'yAxis', seriesId: y.id + '-yAxis'}
                }),
                []
            ),
            defaultTo(
                map(props.chart.yAxisExt, y => {
                    return {...y, axisType: 'yAxisExt', seriesId: y.id + '-yAxisExt'}
                }),
                []
            )
        )
    } else {
        return defaultTo(
            map(props.chart.yAxis, y => {
                return {...y, axisType: 'yAxis', seriesId: y.id + '-yAxis'}
            }),
            []
        )
    }
})

const yAxisIds = computed(() => {
    return map(yAxis.value, y => y.seriesId)
})

watch(
    [() => yAxisIds.value, () => props.chart.type],
    () => {
        initSeriesLabel()
    },
    {deep: true}
)

const computedIdKey = computed(() => {
    if (props.chart.type.includes('chart-mix')) {
        return 'seriesId'
    }
    return 'id'
})

const curSeriesFormatter = ref<Partial<SeriesFormatter>>({})
const formatterEditable = computed(() => {
    return showProperty('seriesLabelFormatter') && yAxis.value?.length
})
const formatterSelector = ref()
// 初始化系列标签
const initSeriesLabel = () => {
    // 批量设置阶段 没有此标签
    if (!showProperty('seriesLabelFormatter') || batchOptStatus.value) {
        return
    }
    const formatter = state.labelForm.seriesLabelFormatter

    const seriesAxisMap = formatter.reduce((pre, next) => {
        const id = next.seriesId ?? next.id
        pre[next[computedIdKey.value]] = {...next, seriesId: id}
        return pre
    }, {})
    formatter.splice(0, formatter.length)
    if (!yAxis.value.length) {
        curSeriesFormatter.value = {}
        return
    }
    let initFlag = false
    const themeColor = dvMainStore.canvasStyleData.dashboard.themeColor
    const axisMap = yAxis.value.reduce((pre, next) => {
        const optionLabel: string = `${next.chartShowName ?? next.name}${
            next.summary !== '' ? '(' + t('chart.' + next.summary) + ')' : ''
        }${
            props.chart.type.includes('chart-mix')
                ? next.axisType === 'yAxis'
                    ? `(${t('chart.left_axis')})`
                    : `(${t('chart.right_axis')})`
                : ''
        }` as string
        const optionShowName: string = `${next.chartShowName ?? next.name}${
            next.summary !== '' ? '(' + t('chart.' + next.summary) + ')' : ''
        }${
            props.chart.type.includes('chart-mix')
                ? next.axisType === 'yAxis'
                    ? `(${t('chart.left_axis')})`
                    : `(${t('chart.right_axis')})`
                : ''
        }` as string
        let tmp = {
            ...next,
            optionLabel: optionLabel,
            optionShowName: optionShowName,
            show: true,
            color: themeColor === 'dark' ? '#fff' : '#000',
            fontSize: COMPUTED_DEFAULT_LABEL.value.fontSize,
            showExtremum: false,
            position: 'top'
        } as SeriesFormatter
        if (seriesAxisMap[next[computedIdKey.value]]) {
            initFormatCfgUnit(seriesAxisMap[next[computedIdKey.value]].formatterCfg)
            tmp = {
                ...tmp,
                formatterCfg: seriesAxisMap[next[computedIdKey.value]].formatterCfg,
                show: seriesAxisMap[next[computedIdKey.value]].show,
                color: seriesAxisMap[next[computedIdKey.value]].color,
                fontSize: seriesAxisMap[next[computedIdKey.value]].fontSize,
                showExtremum: seriesAxisMap[next[computedIdKey.value]].showExtremum,
                position: seriesAxisMap[next[computedIdKey.value]].position
            }
        } else {
            initFlag = true
        }
        formatter.push(tmp)
        next.seriesId = next.seriesId ?? next.id
        pre[next[computedIdKey.value]] = tmp
        return pre
    }, {})
    // 初始化一下序列数组，用于主题适配
    if (initFlag) {
        changeLabelAttr('seriesLabelFormatter', false)
    }
    if (!curSeriesFormatter.value || !axisMap[curSeriesFormatter.value[computedIdKey.value]]) {
        curSeriesFormatter.value = axisMap[formatter[0][computedIdKey.value]]
        return
    }
    curSeriesFormatter.value = axisMap[curSeriesFormatter.value[computedIdKey.value]]
}

const labelPositionR = [
    {name: t('chart.inside'), value: 'inner'},
    {name: t('chart.outside'), value: 'outer'}
]
const labelPositionH = [
    {name: t('chart.text_pos_left'), value: 'left'},
    {name: t('chart.center'), value: 'middle'},
    {name: t('chart.text_pos_right'), value: 'right'}
]
const labelPositionVList = [
    {name: t('chart.text_pos_top'), value: 'top'},
    {name: t('chart.center'), value: 'middle'},
    {name: t('chart.text_pos_bottom'), value: 'bottom'}
]

const labelPositionV = computed(() => {
    if (['line', 'area-stack', 'area'].includes(chartType.value)) {
        return labelPositionVList.filter(item => item.value !== 'middle')
    }
    return labelPositionVList
})

const chartType = computed(() => {
    const chart = JSON.parse(JSON.stringify(props.chart))
    return chart?.type
})

const fontSizeList = computed(() => {
    const arr = []
    for (let i = 10; i <= 40; i = i + 2) {
        if (i === 10 && chartType.value === 'liquid') {
            continue
        }
        arr.push({
            name: i + '',
            value: i
        })
    }
    for (let i = 50; i <= 200; i = i + 10) {
        arr.push({
            name: i + '',
            value: i
        })
    }
    return arr
})

const COMPUTED_DEFAULT_LABEL = computed(() => {
    if (chartType.value === 'liquid') {
        return {
            ...DEFAULT_LABEL,
            fontSize: fontSizeList.value[0].value
        }
    }
    return DEFAULT_LABEL
})

const state = reactive<{ labelForm: DeepPartial<ChartLabelAttr> }>({
    labelForm: {
        quotaLabelFormatter: DEFAULT_LABEL.quotaLabelFormatter,
        seriesLabelFormatter: [],
        labelFormatter: DEFAULT_LABEL.labelFormatter,
        conversionTag: DEFAULT_LABEL.conversionTag,
        totalFormatter: DEFAULT_LABEL.totalFormatter,
        proportionSeriesFormatter: DEFAULT_LABEL.proportionSeriesFormatter
    }
})

const emit = defineEmits(['onLabelChange'])
const changeLabelAttr = (prop: string, render = true) => {
    emit('onLabelChange', {data: state.labelForm, render}, prop)
}

function changeLabelUnitLanguage(cfg: BaseFormatter, lang, prop: string, render = true) {
    onChangeFormatCfgUnitLanguage(cfg, lang)
    changeLabelAttr(prop, render)
}

const init = () => {
    const chart = JSON.parse(JSON.stringify(props.chart))
    if (chart.customAttr) {
        const customAttr = chart.customAttr
        if (customAttr.label) {
            configCompat(customAttr.label)
            state.labelForm = defaultsDeep(customAttr.label, cloneDeep(COMPUTED_DEFAULT_LABEL.value))
            //初始化format单位语言
            initFormatCfgUnit(state.labelForm.labelFormatter)
            initFormatCfgUnit(state.labelForm.quotaLabelFormatter)
            initFormatCfgUnit(state.labelForm.totalFormatter)
            if (chartType.value === 'liquid' && state.labelForm.fontSize < fontSizeList.value[0].value) {
                state.labelForm.fontSize = fontSizeList.value[0].value
            }
            initSeriesLabel()
            formatterSelector.value?.blur()
        }
        //初始化标签位置
        initPosition()
    }
}
const configCompat = (labelAttr: DeepPartial<ChartLabelAttr>) => {
    if (labelAttr.showStackQuota === undefined) {
        labelAttr.showStackQuota = labelAttr.show
    }
}
const checkLabelContent = contentProp => {
    if (chartType.value === 'funnel') {
        return false
    }
    const propIntersection = intersection(props.propertyInner, [
        'showDimension',
        'showQuota',
        'showProportion'
    ])
    if (!propIntersection?.includes(contentProp)) {
        return false
    }
    let trueCount = 0
    propIntersection?.forEach(prop => {
        state.labelForm?.[prop] && trueCount++
    })
    return trueCount === 1 && state.labelForm?.[contentProp]
}
const showProperty = prop => {
    return props.propertyInner?.includes(prop)
}

const showEmpty = computed(() => {
    return (
        props.propertyInner.length === 0 ||
        (batchOptStatus.value && showProperty('seriesLabelFormatter'))
    )
})
const showSeriesLabelFormatter = computed(() => {
    return !batchOptStatus.value && showProperty('seriesLabelFormatter')
})
const showDivider = computed(() => {
    const DIVIDER_PROPS = ['labelFormatter', 'showDimension', 'showQuota', 'showProportion']
    return (
        includesAny(props.propertyInner, ...DIVIDER_PROPS) &&
        !isBarRangeTime.value &&
        !isGroupBar.value &&
        !isGauge.value
    )
})

const isBarRangeTime = computed<boolean>(() => {
    if (props.chart.type === 'bar-range') {
        const tempYAxis = props.chart.yAxis[0]
        const tempYAxisExt = props.chart.yAxisExt[0]
        if (
            (tempYAxis && tempYAxis.groupType === 'd') ||
            (tempYAxisExt && tempYAxisExt.groupType === 'd')
        ) {
            return true
        }
    }
    return false
})
const showPositionH = computed(() => {
    if (showProperty('hPosition')) {
        if (props.chart.type !== 'bidirectional-bar') {
            return true
        }
        return props.chart.customAttr.basicStyle.layout === 'horizontal'
    }
    return false
})
const showPositionV = computed(() => {
    if (showProperty('vPosition')) {
        if (props.chart.type !== 'bidirectional-bar' && props.chart.type !== 'bar-group') {
            return true
        }
        return props.chart.customAttr.basicStyle.layout === 'vertical'
    }
    return false
})

function initBidirectionalBarPosition() {
    if (chartType.value === 'bidirectional-bar') {
        const layout = props.chart.customAttr.basicStyle.layout
        const oldPosition = state?.labelForm?.position
        if (state?.labelForm?.position === 'inner' || state?.labelForm?.position === 'outer') {
            state.labelForm.position = 'middle'
        }
        if (layout === 'horizontal') {
            if (state?.labelForm?.position === 'top') {
                state.labelForm.position = 'right'
            }
            if (state?.labelForm?.position === 'bottom') {
                state.labelForm.position = 'left'
            }
        }
        if (layout === 'vertical') {
            if (state?.labelForm?.position === 'left') {
                state.labelForm.position = 'bottom'
            }
            if (state?.labelForm?.position === 'right') {
                state.labelForm.position = 'top'
            }
        }
        if (oldPosition !== state.labelForm.position) {
            changeLabelAttr('position')
        }
    }
}

function initPosition() {
    if (chartType.value === 'bidirectional-bar') {
        initBidirectionalBarPosition()
    } else {
        const oldPosition = state?.labelForm?.position
        if (showProperty('rPosition')) {
            if (state?.labelForm?.position !== 'inner') {
                state.labelForm.position = 'outer'
            }
        } else if (showProperty('hPosition')) {
            if (state?.labelForm?.position === 'top') {
                state.labelForm.position = 'right'
            } else if (state?.labelForm?.position === 'bottom') {
                state.labelForm.position = 'left'
            } else if (state?.labelForm?.position === 'inner' || state?.labelForm?.position === 'outer') {
                state.labelForm.position = 'middle'
            }
        } else if (showProperty('vPosition')) {
            if (state?.labelForm?.position === 'left') {
                state.labelForm.position = 'bottom'
            } else if (state?.labelForm?.position === 'right') {
                state.labelForm.position = 'top'
            } else if (state?.labelForm?.position === 'inner' || state?.labelForm?.position === 'outer') {
                state.labelForm.position = 'middle'
            }
        }
        if (oldPosition !== state.labelForm.position) {
            changeLabelAttr('position')
        }
    }
}

watch(
    () => props.chart.customAttr.basicStyle.layout,
    () => {
        initBidirectionalBarPosition()
    },
    {deep: true}
)

watch(chartType, () => {
    initPosition()
})

const allFields = computed(() => {
    return defaultTo(props.allFields, []).map(item => ({
        key: item.dataeaseName,
        name: item.name,
        value: `${item.dataeaseName}@${item.name}`,
        disabled: false
    }))
})

const defaultPlaceholder = computed(() => {
    if (state.labelForm.showFields && state.labelForm.showFields.length > 0) {
        return state.labelForm.showFields
            .filter(field => !isEmpty(field))
            ?.map(field => {
                return '${' + field.split('@')[1] + '}'
            })
            .join(',')
    }
    return ''
})
watch(
    () => allFields.value,
    () => {
        if (!showProperty('showFields')) {
            return
        }
        let result = []
        state.labelForm.showFields?.forEach(field => {
            if (allFields.value?.map(i => i.value).includes(field)) {
                result.push(field)
            }
        })
        state.labelForm.showFields = result
        if (allFields.value.length > 0) {
            changeLabelAttr('showFields')
        }
    }
)
onMounted(() => {
    init()
})
const isGroupBar = computed(() => {
    return props.chart.type === 'bar-group'
})
const conversionPrecision = [
    {name: t('chart.reserve_zero'), value: 0},
    {name: t('chart.reserve_one'), value: 1},
    {name: t('chart.reserve_two'), value: 2}
]
const noFullDisplay = computed(() => {
    return !['liquid', 'gauge', 'indicator'].includes(props.chart.type)
})
const isGauge = computed(() => {
    return props.chart.type === 'gauge'
})
const isProgressBar = computed(() => {
    return props.chart.type === 'progress-bar'
})
</script>

<template>
    <el-form
        ref="labelForm"
        :disabled="!state.labelForm.show"
        :model="state.labelForm"
        label-position="top"
    >
        <el-row v-show="showEmpty" style="margin-bottom: 12px">
            {{ t('chart.no_other_configurable_properties') }}
        </el-row
        >
        <div>
            <el-form-item v-if="noFullDisplay" :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.labelForm.fullDisplay"
                    :effect="themes"
                    :label="t('chart.full_display')"
                    size="small"
                    @change="changeLabelAttr('fullDisplay')"
                />
            </el-form-item>
            <el-form-item
                v-if="showProperty('showStackQuota')"
                :class="'form-item-' + themes"
                class="form-item"
                style="display: inline-block; margin-right: 8px"
            >
                <el-checkbox
                    v-model="state.labelForm.showStackQuota"
                    :effect="themes"
                    :label="t('chart.quota')"
                    size="small"
                    @change="changeLabelAttr('showStackQuota')"
                />
            </el-form-item>
            <el-form-item
                v-if="showProperty('showTotal')"
                :class="'form-item-' + themes"
                class="form-item"
                style="display: inline-block"
            >
                <el-checkbox
                    v-model="state.labelForm.showTotal"
                    :effect="themes"
                    :label="t('chart.total_show')"
                    size="small"
                    @change="changeLabelAttr('showTotal')"
                />
            </el-form-item>
        </div>
        <div v-if="!isGroupBar && !isGauge">
            <el-space>
                <el-form-item
                    v-if="showProperty('color')"
                    :class="'form-item-' + themes"
                    :label="t('chart.text')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.labelForm.color"
                        :effect="themes"
                        :predefine="COLOR_PANEL"
                        class="color-picker-style"
                        is-custom
                        @change="changeLabelAttr('color')"
                    />
                </el-form-item>
                <el-form-item
                    v-if="showProperty('fontSize')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <template #label>&nbsp;</template>
                    <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                        <el-select
                            v-model.number="state.labelForm.fontSize"
                            :effect="themes"
                            :placeholder="t('chart.text_fontsize')"
                            size="small"
                            style="width: 108px"
                            @change="changeLabelAttr('fontSize')"
                        >
                            <el-option
                                v-for="option in fontSizeList"
                                :key="option.value"
                                :label="option.name"
                                :value="option.value"
                            />
                        </el-select>
                    </el-tooltip>
                </el-form-item>
            </el-space>
        </div>
        <div v-if="showProperty('showFields') && !batchOptStatus">
            <el-form-item :class="'form-item-' + themes" :label="t('chart.label')" class="form-item">
                <el-select
                    v-model="state.labelForm.showFields"
                    :effect="themes"
                    collapse-tags
                    collapse-tags-tooltip
                    filterable
                    multiple
                    size="small"
                    @change="changeLabelAttr('showFields')"
                >
                    <el-option
                        v-for="option in allFields"
                        :key="option.key"
                        :disabled="option.disabled"
                        :label="option.name"
                        :value="option.value"
                    />
                </el-select>
            </el-form-item>
            <el-form-item v-if="showProperty('customContent')" :class="'form-item-' + themes">
                <template #label>
          <span class="data-area-label">
            <span style="margin-right: 4px">
              {{ t('chart.content_formatter') }}
            </span>
            <el-tooltip :effect="toolTip" class="item" placement="bottom">
              <template #content>
                <div>{{ t('chart.custom_label_content_tip') }}</div>
              </template>
              <el-icon :class="{ 'hint-icon--dark': themes === 'dark' }" class="hint-icon">
                <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
              </el-icon>
            </el-tooltip>
          </span>
                </template>
                <el-input
                    v-model="state.labelForm.customContent"
                    :autosize="{ minRows: 4, maxRows: 4 }"
                    :effect="themes"
                    :placeholder="defaultPlaceholder"
                    style="font-size: smaller; font-weight: normal"
                    type="textarea"
                    @blur="changeLabelAttr('customContent')"
                />
            </el-form-item>
        </div>
        <el-form-item
            v-if="showProperty('rPosition')"
            :class="'form-item-' + themes"
            :label="t('chart.label')"
            class="form-item"
        >
            <el-select
                v-model="state.labelForm.position"
                :effect="themes"
                :placeholder="t('chart.label_position')"
                size="small"
                @change="changeLabelAttr('position')"
            >
                <el-option
                    v-for="option in labelPositionR"
                    :key="option.value"
                    :label="option.name"
                    :value="option.value"
                />
            </el-select>
        </el-form-item>
        <el-form-item
            v-if="showPositionH"
            :class="'form-item-' + themes"
            :label="t('chart.label_position')"
            class="form-item"
        >
            <el-select
                v-model="state.labelForm.position"
                :effect="themes"
                :placeholder="t('chart.label_position')"
                size="small"
                @change="changeLabelAttr('position')"
            >
                <el-option
                    v-for="option in labelPositionH"
                    :key="option.value"
                    :label="option.name"
                    :value="option.value"
                />
            </el-select>
        </el-form-item>
        <el-form-item v-if="showPositionV" :class="'form-item-' + themes" class="form-item">
            <template #label>
                {{ t('chart.label_position') }}
                <el-tooltip
                    v-if="chart.type.includes('chart-mix')"
                    :effect="toolTip"
                    class="item"
                    placement="top"
                >
                    <template #content>
                        <span v-html="t('chart.chart_mix_label_only_left')"></span>
                    </template>
                    <span style="vertical-align: middle">
            <el-icon style="cursor: pointer">
              <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
            </el-icon>
          </span>
                </el-tooltip>
            </template>
            <el-select
                v-model="state.labelForm.position"
                :effect="themes"
                :placeholder="t('chart.label_position')"
                size="small"
                @change="changeLabelAttr('position')"
            >
                <el-option
                    v-for="option in labelPositionV"
                    :key="option.value"
                    :label="option.name"
                    :value="option.value"
                />
            </el-select>
        </el-form-item>
        <el-divider
            v-if="showDivider"
            :class="{ 'divider-dark': themes === 'dark' }"
            class="m-divider"
        />
        <template v-if="showProperty('labelFormatter') && !isBarRangeTime && !isGroupBar && !isGauge">
            <el-form-item
                :class="'form-item-' + themes"
                :label="$t('chart.value_formatter_type')"
                class="form-item"
            >
                <el-select
                    v-model="state.labelForm.labelFormatter.type"
                    :effect="themes"
                    size="small"
                    @change="changeLabelAttr('labelFormatter.type')"
                >
                    <el-option
                        v-for="type in formatterType"
                        :key="type.value"
                        :label="$t('chart.' + type.name)"
                        :value="type.value"
                    />
                </el-select>
            </el-form-item>
            <el-form-item
                v-if="state.labelForm.labelFormatter && state.labelForm.labelFormatter.type !== 'auto'"
                :class="'form-item-' + themes"
                :label="$t('chart.value_formatter_decimal_count')"
                class="form-item"
            >
                <el-input-number
                    v-model="state.labelForm.labelFormatter.decimalCount"
                    :effect="themes"
                    :max="10"
                    :min="0"
                    :precision="0"
                    controls-position="right"
                    @change="changeLabelAttr('labelFormatter.decimalCount')"
                />
            </el-form-item>

            <template
                v-if="state.labelForm.labelFormatter && state.labelForm.labelFormatter.type !== 'percent'"
            >
                <el-row :gutter="8">
                    <el-col v-if="!isEnLocal" :span="12">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="$t('chart.value_formatter_unit_language')"
                            class="form-item"
                        >
                            <el-select
                                v-model="state.labelForm.labelFormatter.unitLanguage"
                                :effect="themes"
                                :placeholder="$t('chart.pls_select_field')"
                                size="small"
                                @change="
                  v => changeLabelUnitLanguage(state.labelForm.labelFormatter, v, 'labelFormatter')
                "
                            >
                                <el-option :label="$t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                <el-option :label="$t('chart.value_formatter_unit_language_en')" value="en"/>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="isEnLocal ? 24 : 12">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="$t('chart.value_formatter_unit')"
                            class="form-item"
                        >
                            <el-select
                                v-model="state.labelForm.labelFormatter.unit"
                                :effect="themes"
                                :placeholder="$t('chart.pls_select_field')"
                                size="small"
                                @change="changeLabelAttr('labelFormatter')"
                            >
                                <el-option
                                    v-for="item in getUnitTypeList(state.labelForm.labelFormatter.unitLanguage)"
                                    :key="item.value"
                                    :label="item.name"
                                    :value="item.value"
                                />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-row :gutter="8">
                    <el-col :span="24">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="$t('chart.value_formatter_suffix')"
                            class="form-item"
                        >
                            <el-input
                                v-model="state.labelForm.labelFormatter.suffix"
                                :effect="themes"
                                :placeholder="$t('commons.input_content')"
                                clearable
                                @change="changeLabelAttr('labelFormatter.suffix')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </template>

            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.labelForm.labelFormatter.thousandSeparator"
                    :effect="themes"
                    :label="t('chart.value_formatter_thousand_separator')"
                    size="small"
                    @change="changeLabelAttr('labelFormatter.thousandSeparator')"
                />
            </el-form-item>
        </template>
        <template v-if="false && showProperty('totalFormatter')">
            <el-divider :class="{ 'divider-dark': themes === 'dark' }" class="m-divider"/>
            <div v-show="state.labelForm.showTotal">
                <el-space>
                    <el-form-item
                        v-if="showProperty('totalColor')"
                        :class="'form-item-' + themes"
                        :label="t('chart.text')"
                        class="form-item"
                    >
                        <el-color-picker
                            v-model="state.labelForm.totalColor"
                            :effect="themes"
                            :predefine="COLOR_PANEL"
                            class="color-picker-style"
                            is-custom
                            @change="changeLabelAttr('totalColor')"
                        />
                    </el-form-item>
                    <el-form-item
                        v-if="showProperty('totalFontSize')"
                        :class="'form-item-' + themes"
                        class="form-item"
                    >
                        <template #label>&nbsp;</template>
                        <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                            <el-select
                                v-model.number="state.labelForm.totalFontSize"
                                :effect="themes"
                                :placeholder="t('chart.text_fontsize')"
                                size="small"
                                style="width: 108px"
                                @change="changeLabelAttr('totalFontSize')"
                            >
                                <el-option
                                    v-for="option in fontSizeList"
                                    :key="option.value"
                                    :label="option.name"
                                    :value="option.value"
                                />
                            </el-select>
                        </el-tooltip>
                    </el-form-item>
                </el-space>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="$t('chart.value_formatter_type')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.labelForm.totalFormatter.type"
                        :effect="themes"
                        size="small"
                        @change="changeLabelAttr('totalFormatter.type')"
                    >
                        <el-option
                            v-for="type in formatterType"
                            :key="type.value"
                            :label="$t('chart.' + type.name)"
                            :value="type.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="state.labelForm.totalFormatter && state.labelForm.totalFormatter.type !== 'auto'"
                    :class="'form-item-' + themes"
                    :label="$t('chart.value_formatter_decimal_count')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.labelForm.totalFormatter.decimalCount"
                        :effect="themes"
                        :max="10"
                        :min="0"
                        :precision="0"
                        controls-position="right"
                        @change="changeLabelAttr('totalFormatter.decimalCount')"
                    />
                </el-form-item>

                <template
                    v-if="state.labelForm.totalFormatter && state.labelForm.totalFormatter.type !== 'percent'"
                >
                    <el-row :gutter="8">
                        <el-col v-if="!isEnLocal" :span="12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit_language')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.totalFormatter.unitLanguage"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="
                    v =>
                      changeLabelUnitLanguage(state.labelForm.totalFormatter, v, 'totalFormatter')
                  "
                                >
                                    <el-option :label="$t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                    <el-option :label="$t('chart.value_formatter_unit_language_en')" value="en"/>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="isEnLocal ? 24 : 12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.totalFormatter.unit"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="changeLabelAttr('totalFormatter')"
                                >
                                    <el-option
                                        v-for="item in getUnitTypeList(state.labelForm.totalFormatter.unitLanguage)"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="8">
                        <el-col :span="24">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_suffix')"
                                class="form-item"
                            >
                                <el-input
                                    v-model="state.labelForm.totalFormatter.suffix"
                                    :effect="themes"
                                    :placeholder="$t('commons.input_content')"
                                    clearable
                                    @change="changeLabelAttr('totalFormatter.suffix')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </template>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.labelForm.totalFormatter.thousandSeparator"
                        :effect="themes"
                        :label="t('chart.value_formatter_thousand_separator')"
                        size="small"
                        @change="changeLabelAttr('totalFormatter.thousandSeparator')"
                    />
                </el-form-item>
            </div>
        </template>

        <el-form-item
            v-if="showProperty('showDimension')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.labelForm.showDimension"
                :disabled="checkLabelContent('showDimension')"
                :effect="themes"
                label="dimension"
                size="small"
                @change="changeLabelAttr('showDimension')"
            >
                {{ t('chart.dimension') }}
            </el-checkbox>
        </el-form-item>
        <template v-if="showProperty('showQuota')">
            <el-form-item :class="'form-item-' + themes" class="form-item form-item-checkbox">
                <el-checkbox
                    v-model="state.labelForm.showQuota"
                    :disabled="isProgressBar ? false : checkLabelContent('showQuota')"
                    :effect="themes"
                    label="quota"
                    size="small"
                    @change="changeLabelAttr('showQuota')"
                >
                    {{ t('chart.quota') }}
                </el-checkbox>
            </el-form-item>

            <div style="padding-left: 22px">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.value_formatter_type')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.labelForm.quotaLabelFormatter.type"
                        :disabled="!state.labelForm.showQuota"
                        :effect="themes"
                        size="small"
                        style="width: 100%"
                        @change="changeLabelAttr('quotaLabelFormatter.type')"
                    >
                        <el-option
                            v-for="type in formatterType"
                            :key="type.value"
                            :label="t('chart.' + type.name)"
                            :value="type.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="
            state.labelForm.quotaLabelFormatter &&
            state.labelForm.quotaLabelFormatter.type !== 'auto'
          "
                    :class="'form-item-' + themes"
                    :label="t('chart.value_formatter_decimal_count')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.labelForm.quotaLabelFormatter.decimalCount"
                        :disabled="!state.labelForm.showQuota"
                        :effect="themes"
                        :max="10"
                        :min="0"
                        :precision="0"
                        controls-position="right"
                        size="small"
                        style="width: 100%"
                        @change="changeLabelAttr('quotaLabelFormatter.decimalCount')"
                    />
                </el-form-item>

                <template
                    v-if="
            state.labelForm.quotaLabelFormatter &&
            state.labelForm.quotaLabelFormatter.type !== 'percent'
          "
                >
                    <el-row :gutter="8">
                        <el-col v-if="!isEnLocal" :span="12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit_language')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.quotaLabelFormatter.unitLanguage"
                                    :disabled="!state.labelForm.showQuota"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="
                    v =>
                      changeLabelUnitLanguage(
                        state.labelForm.quotaLabelFormatter,
                        v,
                        'quotaLabelFormatter'
                      )
                  "
                                >
                                    <el-option :label="$t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                    <el-option :label="$t('chart.value_formatter_unit_language_en')" value="en"/>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="isEnLocal ? 24 : 12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="t('chart.value_formatter_unit')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.quotaLabelFormatter.unit"
                                    :disabled="!state.labelForm.showQuota"
                                    :effect="themes"
                                    :placeholder="t('chart.pls_select_field')"
                                    size="small"
                                    @change="changeLabelAttr('quotaLabelFormatter')"
                                >
                                    <el-option
                                        v-for="item in getUnitTypeList(
                      state.labelForm.quotaLabelFormatter.unitLanguage
                    )"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="8">
                        <el-col :span="24">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="t('chart.value_formatter_suffix')"
                                class="form-item"
                            >
                                <el-input
                                    v-model="state.labelForm.quotaLabelFormatter.suffix"
                                    :disabled="!state.labelForm.showQuota"
                                    :effect="themes"
                                    :placeholder="t('commons.input_content')"
                                    clearable
                                    size="small"
                                    @change="changeLabelAttr('quotaLabelFormatter.suffix')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </template>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.labelForm.quotaLabelFormatter.thousandSeparator"
                        :disabled="!state.labelForm.showQuota"
                        :effect="themes"
                        :label="t('chart.value_formatter_thousand_separator')"
                        size="small"
                        @change="changeLabelAttr('quotaLabelFormatter.thousandSeparator')"
                    />
                </el-form-item>
            </div>
        </template>
        <template v-if="showProperty('showProportion')">
            <el-form-item :class="'form-item-' + themes" class="form-item form-item-checkbox">
                <el-checkbox
                    v-model="state.labelForm.showProportion"
                    :disabled="isProgressBar ? false : checkLabelContent('showProportion')"
                    :effect="themes"
                    label="proportion"
                    size="small"
                    @change="changeLabelAttr('showProportion')"
                >
                    {{ isProgressBar ? t('chart.value_formatter_percent') : t('chart.proportion') }}
                </el-checkbox>
            </el-form-item>
            <div style="padding-left: 22px">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.label_reserve_decimal_count')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.labelForm.reserveDecimalCount"
                        :disabled="!state.labelForm.showProportion"
                        :effect="themes"
                        size="small"
                        @change="changeLabelAttr('reserveDecimalCount')"
                    >
                        <el-option :label="t('chart.reserve_zero')" :value="0"/>
                        <el-option :label="t('chart.reserve_one')" :value="1"/>
                        <el-option :label="t('chart.reserve_two')" :value="2"/>
                    </el-select>
                </el-form-item>
            </div>
        </template>
        <el-form-item
            v-if="showProperty('reserveDecimalCount')"
            :class="'form-item-' + themes"
            :label="t('chart.label_reserve_decimal_count')"
            class="form-item"
        >
            <el-select
                v-model="state.labelForm.reserveDecimalCount"
                :effect="themes"
                size="small"
                @change="changeLabelAttr('reserveDecimalCount')"
            >
                <el-option :label="t('chart.reserve_zero')" :value="0"/>
                <el-option :label="t('chart.reserve_one')" :value="1"/>
                <el-option :label="t('chart.reserve_two')" :value="2"/>
            </el-select>
        </el-form-item>
        <div v-if="showSeriesLabelFormatter">
            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-select
                    ref="formatterSelector"
                    v-model="curSeriesFormatter"
                    :disabled="!formatterEditable"
                    :effect="themes"
                    :teleported="false"
                    :value-key="computedIdKey"
                    class="series-select"
                    size="small"
                >
                    <template #prefix>
                        <el-icon v-if="curSeriesFormatter[computedIdKey]" style="font-size: 14px">
                            <Icon :className="`field-icon-${fieldType[curSeriesFormatter.deType]}`"
                            >
                                <component
                                    :is="iconFieldMap[fieldType[curSeriesFormatter.deType]]"
                                    :class="`field-icon-${fieldType[curSeriesFormatter.deType]}`"
                                    class="svg-icon"
                                ></component
                                >
                            </Icon>
                        </el-icon>
                    </template>
                    <template v-for="item in state.labelForm.seriesLabelFormatter" :key="item[computedIdKey]">
                        <el-option :label="item.optionLabel" :value="item" class="series-select-option">
                            <el-icon style="margin-right: 8px">
                                <Icon :className="`field-icon-${fieldType[item.deType]}`"
                                >
                                    <component
                                        :is="iconFieldMap[fieldType[item.deType]]"
                                        :class="`field-icon-${fieldType[item.deType]}`"
                                        class="svg-icon"
                                    ></component
                                    >
                                </Icon>
                            </el-icon>
                            {{ item.optionShowName }}
                        </el-option>
                    </template>
                </el-select>
            </el-form-item>
            <template v-if="curSeriesFormatter?.id">
                <el-form-item :class="'form-item-' + themes" class="form-item form-item-checkbox">
                    <el-checkbox
                        v-model="curSeriesFormatter.show"
                        :effect="themes"
                        label="quota"
                        size="small"
                        @change="changeLabelAttr('seriesLabelFormatter')"
                    >
                        {{ t('chart.show_label') }}
                    </el-checkbox>
                </el-form-item>

                <div style="padding-left: 22px">
                    <el-form-item
                        v-if="showProperty('seriesLabelVPosition')"
                        :class="'form-item-' + themes"
                        :label="t('chart.position')"
                        class="form-item"
                    >
                        <el-select
                            v-model="curSeriesFormatter.position"
                            :disabled="!curSeriesFormatter.show"
                            :effect="themes"
                            :placeholder="t('chart.label_position')"
                            size="small"
                            @change="changeLabelAttr('seriesLabelFormatter')"
                        >
                            <el-option
                                v-for="option in labelPositionV"
                                :key="option.value"
                                :label="option.name"
                                :value="option.value"
                            />
                        </el-select>
                    </el-form-item>
                    <el-space>
                        <el-form-item :class="'form-item-' + themes" :label="t('chart.text')" class="form-item">
                            <el-color-picker
                                v-model="curSeriesFormatter.color"
                                :disabled="!curSeriesFormatter.show"
                                :effect="themes"
                                :predefine="COLOR_PANEL"
                                class="color-picker-style"
                                is-custom
                                style="width: 100%"
                                @change="changeLabelAttr('seriesLabelFormatter')"
                            />
                        </el-form-item>
                        <el-form-item :class="'form-item-' + themes" class="form-item">
                            <template #label>&nbsp;</template>
                            <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                                <el-select
                                    v-model.number="curSeriesFormatter.fontSize"
                                    :disabled="!curSeriesFormatter.show"
                                    :effect="themes"
                                    :placeholder="t('chart.text_fontsize')"
                                    size="small"
                                    style="width: 108px"
                                    @change="changeLabelAttr('seriesLabelFormatter')"
                                >
                                    <el-option
                                        v-for="option in fontSizeList"
                                        :key="option.value"
                                        :label="option.name"
                                        :value="option.value"
                                    />
                                </el-select>
                            </el-tooltip>
                        </el-form-item>
                    </el-space>

                    <el-form-item
                        v-if="curSeriesFormatter.formatterCfg"
                        :class="'form-item-' + themes"
                        :label="t('chart.value_formatter_type')"
                        class="form-item"
                    >
                        <el-select
                            v-model="curSeriesFormatter.formatterCfg.type"
                            :disabled="!curSeriesFormatter.show"
                            :effect="props.themes"
                            size="small"
                            style="width: 100%"
                            @change="changeLabelAttr('seriesLabelFormatter')"
                        >
                            <el-option
                                v-for="type in formatterType"
                                :key="type.value"
                                :label="t('chart.' + type.name)"
                                :value="type.value"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item
                        v-if="
              curSeriesFormatter.formatterCfg && curSeriesFormatter.formatterCfg.type !== 'auto'
            "
                        :class="'form-item-' + themes"
                        :label="t('chart.value_formatter_decimal_count')"
                        class="form-item"
                    >
                        <el-input-number
                            v-model="curSeriesFormatter.formatterCfg.decimalCount"
                            :disabled="!curSeriesFormatter.show"
                            :effect="props.themes"
                            :max="10"
                            :min="0"
                            :precision="0"
                            controls-position="right"
                            size="small"
                            style="width: 100%"
                            @change="changeLabelAttr('seriesLabelFormatter')"
                        />
                    </el-form-item>

                    <template
                        v-if="
              curSeriesFormatter.show &&
              curSeriesFormatter.formatterCfg &&
              curSeriesFormatter.formatterCfg.type !== 'percent'
            "
                    >
                        <el-row :gutter="8">
                            <el-col v-if="!isEnLocal" :span="12">
                                <el-form-item
                                    :class="'form-item-' + themes"
                                    :label="$t('chart.value_formatter_unit_language')"
                                    class="form-item"
                                >
                                    <el-select
                                        v-model="curSeriesFormatter.formatterCfg.unitLanguage"
                                        :disabled="!curSeriesFormatter.show"
                                        :effect="themes"
                                        :placeholder="$t('chart.pls_select_field')"
                                        size="small"
                                        @change="
                      v =>
                        changeLabelUnitLanguage(
                          curSeriesFormatter.formatterCfg,
                          v,
                          'seriesLabelFormatter'
                        )
                    "
                                    >
                                        <el-option :label="$t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                        <el-option :label="$t('chart.value_formatter_unit_language_en')" value="en"/>
                                    </el-select>
                                </el-form-item>
                            </el-col>
                            <el-col :span="isEnLocal ? 24 : 12">
                                <el-form-item
                                    :class="'form-item-' + themes"
                                    :label="t('chart.value_formatter_unit')"
                                    class="form-item"
                                >
                                    <el-select
                                        v-model="curSeriesFormatter.formatterCfg.unit"
                                        :disabled="!curSeriesFormatter.show"
                                        :effect="props.themes"
                                        :placeholder="t('chart.pls_select_field')"
                                        size="small"
                                        @change="changeLabelAttr('seriesLabelFormatter')"
                                    >
                                        <el-option
                                            v-for="item in getUnitTypeList(curSeriesFormatter.formatterCfg.unitLanguage)"
                                            :key="item.value"
                                            :label="item.name"
                                            :value="item.value"
                                        />
                                    </el-select>
                                </el-form-item>
                            </el-col>
                        </el-row>
                        <el-row :gutter="8">
                            <el-col :span="24">
                                <el-form-item
                                    :class="'form-item-' + themes"
                                    :label="t('chart.value_formatter_suffix')"
                                    class="form-item"
                                >
                                    <el-input
                                        v-model="curSeriesFormatter.formatterCfg.suffix"
                                        :disabled="!curSeriesFormatter.show"
                                        :effect="props.themes"
                                        :placeholder="t('commons.input_content')"
                                        clearable
                                        size="small"
                                        @change="changeLabelAttr('seriesLabelFormatter')"
                                    />
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </template>

                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-checkbox
                            v-model="curSeriesFormatter.formatterCfg.thousandSeparator"
                            :disabled="!curSeriesFormatter.show"
                            :effect="props.themes"
                            :label="t('chart.value_formatter_thousand_separator')"
                            size="small"
                            @change="changeLabelAttr('seriesLabelFormatter')"
                        />
                    </el-form-item>
                </div>
                <el-form-item
                    v-if="showProperty('showExtremum')"
                    :class="'form-item-' + themes"
                    class="form-item form-item-checkbox"
                >
                    <el-checkbox
                        v-model="curSeriesFormatter.showExtremum"
                        :effect="themes"
                        label="quota"
                        size="small"
                        @change="changeLabelAttr('seriesLabelFormatter')"
                    >
                        {{ t('chart.show_extremum') }}
                    </el-checkbox>
                </el-form-item>
            </template>
        </div>
        <template v-if="isGroupBar">
            <el-form-item :class="'form-item-' + themes" class="form-item form-item-checkbox">
                <el-checkbox
                    v-model="state.labelForm.childrenShow"
                    :effect="themes"
                    label="quota"
                    size="small"
                    @change="changeLabelAttr('childrenShow')"
                >
                    {{ t('chart.show_label') }}
                </el-checkbox>
            </el-form-item>
            <div style="padding-left: 22px">
                <el-space>
                    <el-form-item
                        v-if="showProperty('color')"
                        :class="'form-item-' + themes"
                        :label="t('chart.text')"
                        class="form-item"
                    >
                        <el-color-picker
                            v-model="state.labelForm.color"
                            :disabled="!state.labelForm.childrenShow"
                            :effect="themes"
                            :predefine="COLOR_PANEL"
                            class="color-picker-style"
                            is-custom
                            @change="changeLabelAttr('color')"
                        />
                    </el-form-item>
                    <el-form-item
                        v-if="showProperty('fontSize')"
                        :class="'form-item-' + themes"
                        class="form-item"
                    >
                        <template #label>&nbsp;</template>
                        <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                            <el-select
                                v-model.number="state.labelForm.fontSize"
                                :disabled="!state.labelForm.childrenShow"
                                :effect="themes"
                                :placeholder="t('chart.text_fontsize')"
                                size="small"
                                style="width: 108px"
                                @change="changeLabelAttr('fontSize')"
                            >
                                <el-option
                                    v-for="option in fontSizeList"
                                    :key="option.value"
                                    :label="option.name"
                                    :value="option.value"
                                />
                            </el-select>
                        </el-tooltip>
                    </el-form-item>
                </el-space>
                <el-form-item
                    v-if="showProperty('vPosition')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <template #label>
                        {{ t('chart.label_position') }}
                        <el-tooltip
                            v-if="chart.type.includes('chart-mix')"
                            :effect="toolTip"
                            class="item"
                            placement="top"
                        >
                            <template #content>
                                <span v-html="t('chart.chart_mix_label_only_left')"></span>
                            </template>
                            <span style="vertical-align: middle">
                <el-icon style="cursor: pointer">
                  <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
                </el-icon>
              </span>
                        </el-tooltip>
                    </template>
                    <el-select
                        v-model="state.labelForm.position"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        :placeholder="t('chart.label_position')"
                        size="small"
                        @change="changeLabelAttr('position')"
                    >
                        <el-option
                            v-for="option in labelPositionV"
                            :key="option.value"
                            :label="option.name"
                            :value="option.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="$t('chart.value_formatter_type')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.labelForm.labelFormatter.type"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        size="small"
                        @change="changeLabelAttr('labelFormatter.type')"
                    >
                        <el-option
                            v-for="type in formatterType"
                            :key="type.value"
                            :label="$t('chart.' + type.name)"
                            :value="type.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="state.labelForm.labelFormatter && state.labelForm.labelFormatter.type !== 'auto'"
                    :class="'form-item-' + themes"
                    :label="$t('chart.value_formatter_decimal_count')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.labelForm.labelFormatter.decimalCount"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        :max="10"
                        :min="0"
                        :precision="0"
                        controls-position="right"
                        @change="changeLabelAttr('labelFormatter.decimalCount')"
                    />
                </el-form-item>

                <template
                    v-if="state.labelForm.labelFormatter && state.labelForm.labelFormatter.type !== 'percent'"
                >
                    <el-row :gutter="8">
                        <el-col v-if="!isEnLocal" :span="12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit_language')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.labelFormatter.unitLanguage"
                                    :disabled="!state.labelForm.childrenShow"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="
                    v =>
                      changeLabelUnitLanguage(state.labelForm.labelFormatter, v, 'labelFormatter')
                  "
                                >
                                    <el-option :label="$t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                    <el-option :label="$t('chart.value_formatter_unit_language_en')" value="en"/>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="isEnLocal ? 24 : 12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.labelFormatter.unit"
                                    :disabled="!state.labelForm.childrenShow"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="changeLabelAttr('labelFormatter')"
                                >
                                    <el-option
                                        v-for="item in getUnitTypeList(state.labelForm.labelFormatter.unitLanguage)"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="8">
                        <el-col :span="24">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_suffix')"
                                class="form-item"
                            >
                                <el-input
                                    v-model="state.labelForm.labelFormatter.suffix"
                                    :disabled="!state.labelForm.childrenShow"
                                    :effect="themes"
                                    :placeholder="$t('commons.input_content')"
                                    clearable
                                    @change="changeLabelAttr('labelFormatter.suffix')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </template>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.labelForm.labelFormatter.thousandSeparator"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        :label="t('chart.value_formatter_thousand_separator')"
                        size="small"
                        @change="changeLabelAttr('labelFormatter.thousandSeparator')"
                    />
                </el-form-item>
            </div>
        </template>
        <el-form-item
            v-if="showProperty('showExtremum') && !showSeriesLabelFormatter"
            :class="'form-item-' + themes"
            class="form-item form-item-checkbox"
        >
            <el-checkbox
                v-model="state.labelForm.showExtremum"
                :effect="themes"
                label="quota"
                size="small"
                @change="changeLabelAttr('showExtremum')"
            >
                {{ t('chart.show_extremum') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item v-show="showProperty('showGap')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.labelForm.showGap"
                :effect="themes"
                size="small"
                @change="changeLabelAttr('showGap')"
            >
                {{ t('chart.show_gap') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('conversionTag')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.labelForm.conversionTag.show"
                :effect="themes"
                size="small"
                @change="changeLabelAttr('conversionTag')"
            >
                {{ t('chart.conversion_rate') }}
            </el-checkbox>
        </el-form-item>
        <div v-if="showProperty('conversionTag')" style="padding-left: 22px">
            <el-row :gutter="8">
                <el-col :span="12">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.label_reserve_decimal_count')"
                        class="form-item"
                    >
                        <el-select
                            v-model.number="state.labelForm.conversionTag.precision"
                            :disabled="!state.labelForm.conversionTag.show"
                            :effect="themes"
                            size="small"
                            style="width: 108px"
                            @change="changeLabelAttr('conversionTag')"
                        >
                            <el-option
                                v-for="option in conversionPrecision"
                                :key="option.value"
                                :label="option.name"
                                :value="option.value"
                            />
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.conversion_rate') + t('chart.name')"
                        class="form-item"
                    >
                        <el-input
                            v-model="state.labelForm.conversionTag.text"
                            :disabled="!state.labelForm.conversionTag.show"
                            :effect="themes"
                            maxlength="100"
                            size="small"
                            @blur="changeLabelAttr('conversionTag')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <template v-if="isGauge">
            <el-form-item :class="'form-item-' + themes" class="form-item form-item-checkbox">
                <el-checkbox
                    v-model="state.labelForm.childrenShow"
                    :effect="themes"
                    label="quota"
                    size="small"
                    @change="changeLabelAttr('childrenShow')"
                >
                    {{ t('chart.quota') }}
                </el-checkbox>
            </el-form-item>
            <div style="padding-left: 22px">
                <el-space>
                    <el-form-item
                        v-if="showProperty('color')"
                        :class="'form-item-' + themes"
                        :label="t('chart.text')"
                        class="form-item"
                    >
                        <el-color-picker
                            v-model="state.labelForm.color"
                            :disabled="!state.labelForm.childrenShow"
                            :effect="themes"
                            :predefine="COLOR_PANEL"
                            class="color-picker-style"
                            is-custom
                            @change="changeLabelAttr('color')"
                        />
                    </el-form-item>
                    <el-form-item
                        v-if="showProperty('fontSize')"
                        :class="'form-item-' + themes"
                        class="form-item"
                    >
                        <template #label>&nbsp;</template>
                        <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                            <el-select
                                v-model.number="state.labelForm.fontSize"
                                :disabled="!state.labelForm.childrenShow"
                                :effect="themes"
                                :placeholder="t('chart.text_fontsize')"
                                size="small"
                                style="width: 108px"
                                @change="changeLabelAttr('fontSize')"
                            >
                                <el-option
                                    v-for="option in fontSizeList"
                                    :key="option.value"
                                    :label="option.name"
                                    :value="option.value"
                                />
                            </el-select>
                        </el-tooltip>
                    </el-form-item>
                </el-space>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="$t('chart.value_formatter_type')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.labelForm.labelFormatter.type"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        size="small"
                        @change="changeLabelAttr('labelFormatter.type')"
                    >
                        <el-option
                            v-for="type in formatterType"
                            :key="type.value"
                            :label="$t('chart.' + type.name)"
                            :value="type.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="state.labelForm.labelFormatter && state.labelForm.labelFormatter.type !== 'auto'"
                    :class="'form-item-' + themes"
                    :label="$t('chart.value_formatter_decimal_count')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.labelForm.labelFormatter.decimalCount"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        :max="10"
                        :min="0"
                        :precision="0"
                        controls-position="right"
                        @change="changeLabelAttr('labelFormatter.decimalCount')"
                    />
                </el-form-item>

                <template
                    v-if="state.labelForm.labelFormatter && state.labelForm.labelFormatter.type !== 'percent'"
                >
                    <el-row :gutter="8">
                        <el-col v-if="!isEnLocal" :span="12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit_language')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.labelFormatter.unitLanguage"
                                    :disabled="!state.labelForm.childrenShow"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="
                    v =>
                      changeLabelUnitLanguage(state.labelForm.labelFormatter, v, 'labelFormatter')
                  "
                                >
                                    <el-option :label="$t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                    <el-option :label="$t('chart.value_formatter_unit_language_en')" value="en"/>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="isEnLocal ? 24 : 12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_unit')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.labelForm.labelFormatter.unit"
                                    :disabled="!state.labelForm.childrenShow"
                                    :effect="themes"
                                    :placeholder="$t('chart.pls_select_field')"
                                    size="small"
                                    @change="changeLabelAttr('labelFormatter')"
                                >
                                    <el-option
                                        v-for="item in getUnitTypeList(state.labelForm.labelFormatter.unitLanguage)"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>

                    <el-row :gutter="8">
                        <el-col :span="24">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="$t('chart.value_formatter_suffix')"
                                class="form-item"
                            >
                                <el-input
                                    v-model="state.labelForm.labelFormatter.suffix"
                                    :disabled="!state.labelForm.childrenShow"
                                    :effect="themes"
                                    :placeholder="$t('commons.input_content')"
                                    clearable
                                    @change="changeLabelAttr('labelFormatter.suffix')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </template>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.labelForm.labelFormatter.thousandSeparator"
                        :disabled="!state.labelForm.childrenShow"
                        :effect="themes"
                        :label="t('chart.value_formatter_thousand_separator')"
                        size="small"
                        @change="changeLabelAttr('labelFormatter.thousandSeparator')"
                    />
                </el-form-item>
            </div>
            <el-form-item :class="'form-item-' + themes" class="form-item form-item-checkbox">
                <el-checkbox
                    v-model="state.labelForm.proportionSeriesFormatter.show"
                    :effect="themes"
                    label="quota"
                    size="small"
                    @change="changeLabelAttr('proportionSeriesFormatter')"
                >
                    {{ t('chart.proportion') }}
                </el-checkbox>
            </el-form-item>
            <div style="padding-left: 22px">
                <el-space>
                    <el-form-item
                        v-if="showProperty('color')"
                        :class="'form-item-' + themes"
                        :label="t('chart.text')"
                        class="form-item"
                    >
                        <el-color-picker
                            v-model="state.labelForm.proportionSeriesFormatter.color"
                            :disabled="!state.labelForm.proportionSeriesFormatter.show"
                            :effect="themes"
                            :predefine="COLOR_PANEL"
                            class="color-picker-style"
                            is-custom
                            @change="changeLabelAttr('proportionSeriesFormatter.color')"
                        />
                    </el-form-item>
                    <el-form-item
                        v-if="showProperty('fontSize')"
                        :class="'form-item-' + themes"
                        class="form-item"
                    >
                        <template #label>&nbsp;</template>
                        <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                            <el-select
                                v-model.number="state.labelForm.proportionSeriesFormatter.fontSize"
                                :disabled="!state.labelForm.proportionSeriesFormatter.show"
                                :effect="themes"
                                :placeholder="t('chart.text_fontsize')"
                                size="small"
                                style="width: 108px"
                                @change="changeLabelAttr('proportionSeriesFormatter.fontSize')"
                            >
                                <el-option
                                    v-for="option in fontSizeList"
                                    :key="option.value"
                                    :label="option.name"
                                    :value="option.value"
                                />
                            </el-select>
                        </el-tooltip>
                    </el-form-item>
                </el-space>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.label_reserve_decimal_count')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.labelForm.proportionSeriesFormatter.formatterCfg.decimalCount"
                        :disabled="!state.labelForm.proportionSeriesFormatter.show"
                        :effect="themes"
                        size="small"
                        @change="changeLabelAttr('proportionSeriesFormatter')"
                    >
                        <el-option :label="t('chart.reserve_zero')" :value="0"/>
                        <el-option :label="t('chart.reserve_one')" :value="1"/>
                        <el-option :label="t('chart.reserve_two')" :value="2"/>
                    </el-select>
                </el-form-item>
            </div>
        </template>
    </el-form>
</template>

<style lang="less" scoped>
.form-item-checkbox {
    margin-bottom: 8px !important;
}

.series-select {
    :deep(.ed-select__prefix--light) {
        padding-right: unset;
        border-right: unset;
    }

    :deep(.ed-select__prefix--dark) {
        padding-right: unset;
        border-right: unset;
    }
}

.series-select-option {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 11px;
}

.m-divider {
    margin: 0 0 16px;
    border-color: rgba(31, 35, 41, 0.15);

    &.divider-dark {
        border-color: rgba(255, 255, 255, 0.15);
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
