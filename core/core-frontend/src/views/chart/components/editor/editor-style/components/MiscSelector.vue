<script lang="ts" setup>
import icon_info_outlined from '@/assets/svg/icon_info_outlined.svg'
import {computed, onMounted, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import {ElRow} from 'element-plus-secondary'
import {fieldType} from '@/utils/attr'
import {cloneDeep, defaultsDeep, isEmpty} from 'lodash-es'
import {useEmitt} from '@/hooks/web/useEmitt'
import {iconFieldMap} from '@/components/icon-group/field-list'

const {t} = useI18n()

const props = withDefaults(
    defineProps<{
        chart: ChartObj
        themes?: EditorTheme
        quotaFields: Array<any>
        propertyInner?: Array<string>
        mobileInPc?: boolean
    }>(),
    {themes: 'dark', mobileInPc: false}
)

useEmitt({
    name: 'word-cloud-default-data-range',
    callback: args => wordCloudDefaultDataRange(args)
})
useEmitt({
    name: 'gauge-default-data',
    callback: args => gaugeOrLiquidDefaultRangeData(args)
})
useEmitt({
    name: 'liquid-default-data',
    callback: args => gaugeOrLiquidDefaultRangeData(args)
})
const emit = defineEmits(['onMiscChange'])

watch(
    () => props.quotaFields,
    () => {
        init()
        initField()
    },
    {deep: true}
)

const validLiquidMaxField = computed(() => {
    return isValidField(state.liquidMaxField)
})
const validMinField = computed(() => {
    return isValidField(state.minField)
})
const validMaxField = computed(() => {
    return isValidField(state.maxField)
})

const state = reactive({
    miscForm: JSON.parse(JSON.stringify(DEFAULT_MISC)),
    minField: {},
    maxField: {},
    liquidMaxField: {},
    quotaData: [],
    // 是否已处理没有 y 轴字段的情况
    liquidProcessedNoYAxis: false,
    gaugeProcessedNoYAxis: false
})

const liquidShapeOptions = [
    {name: t('chart.liquid_shape_circle'), value: 'circle'},
    {name: t('chart.liquid_shape_diamond'), value: 'diamond'},
    {name: t('chart.liquid_shape_triangle'), value: 'triangle'},
    {name: t('chart.liquid_shape_pin'), value: 'pin'},
    {name: t('chart.liquid_shape_rect'), value: 'rect'}
]

const changeMisc = (prop = '', refresh = false) => {
    emit('onMiscChange', {data: state.miscForm, requestData: refresh}, prop)
}

const init = () => {
    const misc = cloneDeep(props.chart.customAttr.misc)
    state.miscForm = defaultsDeep(misc, cloneDeep(DEFAULT_MISC)) as ChartMiscAttr
    const maxTypeKey = props.chart.type === 'liquid' ? 'liquidMaxType' : 'gaugeMaxType'
    const maxValueKey = props.chart.type === 'liquid' ? 'liquidMax' : 'gaugeMax'
    if (!props.chart.yAxis.length) {
        state.miscForm[maxTypeKey] = 'fix'
        state.miscForm[maxValueKey] = undefined
    }
}

const initField = () => {
    // 数据集字段中，如果没有 y 轴字段，直接返回
    const yAxisInDataset = props.quotaFields.find(ele => ele.id === props.chart.yAxis?.[0]?.id)
    if (!yAxisInDataset) {
        return
    }
    // 过滤掉记录数字段以及计算字段
    state.quotaData = props.quotaFields.filter(ele => ele.id !== '-1' && ele.extField !== 2)
    if (!isEmpty(state.miscForm.gaugeMinField.id)) {
        state.minField = getQuotaField(state.miscForm.gaugeMinField.id)
    }
    if (!isEmpty(state.miscForm.gaugeMaxField.id)) {
        state.maxField = getQuotaField(state.miscForm.gaugeMaxField.id)
    }
    if (!isEmpty(state.miscForm.liquidMaxField.id)) {
        state.liquidMaxField = getQuotaField(state.miscForm.liquidMaxField.id)
    }
}
const COUNT_DE_TYPE = [0, 1, 5]
const NUMBER_DE_TYPE = [1, 2, 3]
const getFieldSummaryByDeType = (deType: number) => {
    return COUNT_DE_TYPE.includes(deType) || !deType ? 'count' : 'sum'
}

const getDynamicFieldId = () => {
    // 返回yAxis字段ID
    const curFieldObj = quotaData.value?.find(item => item.id === props.chart.yAxis?.[0]?.id)
    if (curFieldObj) return curFieldObj.id
    // 返回第一个数字类型字段ID
    return quotaData.value?.filter(item => NUMBER_DE_TYPE.includes(item.deType))?.[0]?.id
}

const changeQuotaField = (type: string, resetSummary?: boolean) => {
    if (isGauge.value) {
        if (type === 'max') {
            const isDynamic = state.miscForm.gaugeMaxType === 'dynamic'
            if (isDynamic) {
                if (!state.miscForm.gaugeMaxField.id) {
                    setDynamicFieldId(state.miscForm.gaugeMaxField)
                }
                if (!state.miscForm.gaugeMaxField.summary || resetSummary) {
                    state.miscForm.gaugeMaxField.summary = 'sum'
                }
                if (state.miscForm.gaugeMaxField.id && state.miscForm.gaugeMaxField.summary) {
                    state.maxField = getQuotaField(state.miscForm.gaugeMaxField.id)
                }
            } else {
                state.miscForm.gaugeMax = state.miscForm.gaugeMax || cloneDeep(defaultMaxValue.gaugeMax)
            }
            changeMisc('gaugeMaxField', true)
        }
        if (type === 'min') {
            const isDynamic = state.miscForm.gaugeMinType === 'dynamic'
            if (isDynamic) {
                if (!state.miscForm.gaugeMinField.id) {
                    setDynamicFieldId(state.miscForm.gaugeMinField)
                }
                if (!state.miscForm.gaugeMinField.summary || resetSummary) {
                    state.miscForm.gaugeMinField.summary = 'sum'
                }
                if (state.miscForm.gaugeMinField.id && state.miscForm.gaugeMinField.summary) {
                    state.minField = getQuotaField(state.miscForm.gaugeMinField.id)
                }
            } else {
                state.miscForm.gaugeMin = state.miscForm.gaugeMin ?? 0
            }
            changeMisc('gaugeMinField', true)
        }
    }
    if (isLiquid.value) {
        const field = state.miscForm.liquidMaxField
        const maxValueKey = 'liquidMax'
        const isDynamic = state.miscForm.liquidMaxType === 'dynamic'
        if (isDynamic) {
            if (!field.id) setDynamicFieldId(field)
            if (!field.summary || resetSummary) field.summary = 'count'
            if (field.id && field.summary) {
                state.liquidMaxField = getQuotaField(field.id)
            }
        } else {
            state.miscForm.liquidMax = state.miscForm.liquidMax || cloneDeep(defaultMaxValue.liquidMax)
        }
        changeMisc(`${maxValueKey}Field`, true)
    }
}

const setDynamicFieldId = fieldObj => {
    const yAxisField = props.chart.yAxis?.[0]
    if (
        yAxisField?.extField === 2 ||
        yAxisField?.id === '-1' ||
        !NUMBER_DE_TYPE.includes(yAxisField?.deType)
    ) {
        fieldObj.id = getDynamicFieldId()
    } else {
        fieldObj.id = yAxisField?.id
    }
}

const getQuotaField = id => {
    return quotaData.value.find(ele => ele.id === id) || {}
}

const isValidField = field => {
    return field.id !== '-1' && quotaData.value.findIndex(ele => ele.id === field.id) !== -1
}

const showProperty = prop => props.propertyInner?.includes(prop)
const wordCloudDefaultDataRange = args => {
    state.miscForm.wordCloudAxisValueRange.max = args.data.max
    state.miscForm.wordCloudAxisValueRange.min = args.data.min
    state.miscForm.wordCloudAxisValueRange.fieldId = props.chart.yAxis?.[0]?.id
}
const defaultMaxValue = {
    gaugeMax: undefined,
    liquidMax: undefined
}
const gaugeOrLiquidDefaultRangeData = args => {
    if (args.data.type === 'gauge') {
        defaultMaxValue.gaugeMax = cloneDeep(args.data.max)
        if (!state.miscForm.gaugeMax) {
            state.miscForm.gaugeMax = cloneDeep(defaultMaxValue.gaugeMax)
            changeMisc('gaugeMaxField', true)
        }
    }
    if (args.data.type === 'liquid') {
        defaultMaxValue.liquidMax = cloneDeep(args.data.max)
        if (!state.miscForm.liquidMax) {
            state.miscForm.liquidMax = cloneDeep(defaultMaxValue.liquidMax)
            changeMisc('liquidMaxField', true)
        }
    }
}
/**
 * 校验最大值的输入
 */
const changeMaxValidate = prop => {
    if (prop === 'gaugeMax' && !state.miscForm.gaugeMax) {
        state.miscForm.gaugeMax = cloneDeep(defaultMaxValue.gaugeMax)
    }
    if (prop === 'liquidMax' && !state.miscForm.liquidMax) {
        state.miscForm.liquidMax = cloneDeep(defaultMaxValue.liquidMax)
    }
    changeMisc(prop, true)
}
const addAxis = (form: AxisEditForm) => {
    initAxis(form.axis[0]?.id)
}
const initAxis = yAxisId => {
    state.quotaData = []
    if (yAxisId) {
        const uniqueIds = new Set(state.quotaData.map(item => item.id))
        state.quotaData = [
            ...props.quotaFields.filter(
                ele => ele.id !== '-1' && ele.extField !== 2 && !uniqueIds.has(ele.id)
            )
        ]
        const maxTypeKey = isLiquid.value ? 'liquidMaxType' : 'gaugeMaxType'
        const maxValueKey = isLiquid.value ? 'liquidMax' : 'gaugeMax'
        if (state.quotaData.length) {
            if (isLiquid.value) {
                state.miscForm[maxTypeKey] = 'dynamic'
                state.miscForm[maxValueKey + 'Field']['id'] = getDynamicFieldId() ?? state.quotaData[0]?.id
                state.miscForm[maxValueKey + 'Field']['summary'] = 'sum'
                state.liquidMaxField = getQuotaField(state.miscForm[maxValueKey + 'Field']['id'])
                changeMisc(`${maxValueKey}Field`, true)
            }
            if (isGauge.value) {
                // max
                state.miscForm[maxTypeKey] = 'dynamic'
                state.miscForm[maxValueKey + 'Field']['id'] = getDynamicFieldId() ?? state.quotaData[0]?.id
                state.miscForm[maxValueKey + 'Field']['summary'] = 'sum'
                state.maxField = getQuotaField(state.miscForm[maxValueKey + 'Field']['id'])
                changeMisc(`${maxValueKey}Field`, true)
                // min
                state.miscForm.gaugeMinType = 'fix'
                state.miscForm.gaugeMin = 0
                changeMisc('gaugeMinField', true)
            }
        } else {
            if (isLiquid.value) {
                state.miscForm[maxTypeKey] = 'fix'
                state.miscForm[maxValueKey] = cloneDeep(defaultMaxValue[maxValueKey]) ?? 0
                state.miscForm[maxValueKey + 'Field']['id'] = ''
                state.miscForm[maxValueKey + 'Field']['summary'] = ''
            }
            if (isGauge.value) {
                // max
                state.miscForm[maxTypeKey] = 'fix'
                state.miscForm[maxValueKey] = cloneDeep(defaultMaxValue[maxValueKey]) ?? 0
                state.miscForm[maxValueKey + 'Field']['id'] = ''
                state.miscForm[maxValueKey + 'Field']['summary'] = ''
                // min
                state.miscForm.gaugeMinType = 'fix'
                state.miscForm.gaugeMin = 0
                state.miscForm.gaugeMinField.id = ''
                state.miscForm.gaugeMinField.summary = ''
            }
            changeMisc('', false)
        }
    }
}
const initStateForm = () => {
    state.quotaData = []
    if (props.chart.yAxis?.[0]?.id) {
        const uniqueIds = new Set(state.quotaData.map(item => item.id))
        state.quotaData = [
            ...props.quotaFields.filter(
                ele => ele.id !== '-1' && ele.extField !== 2 && !uniqueIds.has(ele.id)
            )
        ]
    }
    const maxTypeKey = isLiquid.value ? 'liquidMaxType' : 'gaugeMaxType'
    const maxValueKey = isLiquid.value ? 'liquidMax' : 'gaugeMax'
    if (quotaData.value.length) {
        if (isLiquid.value) {
            const hasDynamicValue = props.quotaFields.find(
                ele => ele.id === state.miscForm[maxValueKey + 'Field']['id']
            )
            const hasFixValue = state.miscForm[maxValueKey]
            if (state.miscForm[maxTypeKey] === 'dynamic' && !hasDynamicValue) {
                state.miscForm[maxValueKey + 'Field']['id'] = state.quotaData[0]?.id ?? ''
                state.miscForm[maxValueKey + 'Field']['summary'] = 'sum'
                state.liquidMaxField = getQuotaField(state.miscForm[maxValueKey + 'Field']['id'])
                changeMisc(`${maxValueKey}Field`, true)
            } else if (state.miscForm[maxTypeKey] === 'fix' && !hasFixValue && hasFixValue !== 0) {
                state.miscForm[maxValueKey] = cloneDeep(defaultMaxValue[maxValueKey]) ?? 0
                changeMisc(`${maxValueKey}Field`, true)
            }
        }
        if (isGauge.value) {
            // max
            const hasDynamicValue = props.quotaFields.find(
                ele => ele.id === state.miscForm[maxValueKey + 'Field']['id']
            )
            const hasFixValue = state.miscForm[maxValueKey]
            if (state.miscForm[maxTypeKey] === 'dynamic' && !hasDynamicValue) {
                state.miscForm[maxValueKey + 'Field']['id'] = state.quotaData[0]?.id ?? ''
                state.miscForm[maxValueKey + 'Field']['summary'] = 'sum'
                state.maxField = getQuotaField(state.miscForm[maxValueKey + 'Field']['id'])
                changeMisc(`${maxValueKey}Field`, true)
            } else if (state.miscForm[maxTypeKey] === 'fix' && !hasFixValue && hasFixValue !== 0) {
                state.miscForm[maxValueKey] = cloneDeep(defaultMaxValue[maxValueKey]) ?? 0
                changeMisc(`${maxValueKey}Field`, true)
            }
            // min
            const hasDynamicMinValue = props.quotaFields.find(
                ele => ele.id === state.miscForm.gaugeMinField.id
            )
            if (state.miscForm.gaugeMinType === 'dynamic' && !hasDynamicMinValue) {
                state.miscForm.gaugeMin = 0
                state.miscForm.gaugeMinField.id = state.quotaData[0]?.id ?? ''
                state.miscForm.gaugeMinField.summary = 'sum'
                state.minField = getQuotaField(state.miscForm.gaugeMinField.id)
                changeMisc('gaugeMinField', true)
            }
        }
    } else {
        const hasFixValue = state.miscForm[maxValueKey]
        if (isLiquid.value) {
            state.miscForm[maxTypeKey] = 'fix'
            state.miscForm[maxValueKey] = hasFixValue
                ? hasFixValue
                : cloneDeep(defaultMaxValue[maxValueKey]) ?? 0
            state.miscForm[maxValueKey + 'Field']['id'] = ''
            state.miscForm[maxValueKey + 'Field']['summary'] = ''
        }
        if (isGauge.value) {
            // max
            state.miscForm[maxTypeKey] = 'fix'
            state.miscForm[maxValueKey] = hasFixValue
                ? hasFixValue
                : cloneDeep(defaultMaxValue[maxValueKey]) ?? 0
            state.miscForm[maxValueKey + 'Field']['id'] = ''
            state.miscForm[maxValueKey + 'Field']['summary'] = ''
            // min
            state.miscForm.gaugeMinType = 'fix'
            state.miscForm.gaugeMin = 0
            state.miscForm.gaugeMinField.id = ''
            state.miscForm.gaugeMinField.summary = ''
        }
        changeMisc('', false)
    }
}

onMounted(() => {
    init()
    initField()
    useEmitt({name: 'addAxis', callback: addAxis})
    useEmitt({
        name: 'chart-data-change',
        callback: () => {
            initStateForm()
        }
    })
    useEmitt({
        name: 'chart-type-change',
        callback: () => {
            if (isLiquid.value || isGauge.value) {
                init()
                initField()
                initAxis(props.chart.yAxis[0]?.id)
            }
        }
    })
})

/**
 * 不包含记录数字段以及计算字段
 */
const quotaData = computed(() => {
    return state.quotaData.filter(item => NUMBER_DE_TYPE.includes(item.deType))
})
const isLiquid = computed(() => props.chart.type === 'liquid')
const isGauge = computed(() => props.chart.type === 'gauge')
</script>

<template>
    <el-form :model="state.miscForm">
        <el-row :gutter="8">
            <el-col v-show="showProperty('gaugeStartAngle')" :span="12">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.start_angle')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.miscForm.gaugeStartAngle"
                        :effect="themes"
                        :max="360"
                        :min="-360"
                        controls-position="right"
                        size="small"
                        @change="changeMisc('gaugeStartAngle')"
                    />
                </el-form-item>
            </el-col>
            <el-col v-show="showProperty('gaugeEndAngle')" :span="12">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.end_angle')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.miscForm.gaugeEndAngle"
                        :effect="themes"
                        :max="360"
                        :min="-360"
                        controls-position="right"
                        size="small"
                        @change="changeMisc('gaugeEndAngle')"
                    />
                </el-form-item>
            </el-col>
        </el-row>

        <!--gauge-begin-->
        <template v-if="!mobileInPc">
            <el-form-item
                v-show="showProperty('gaugeMinType')"
                :class="'form-item-' + themes"
                :label="t('chart.min')"
                class="form-item margin-bottom-8"
            >
                <el-radio-group
                    v-model="state.miscForm.gaugeMinType"
                    :disabled="quotaData.length === 0"
                    :effect="themes"
                    size="small"
                    @change="changeQuotaField('min')"
                >
                    <el-radio :effect="themes" label="fix">{{ t('chart.fix') }}</el-radio>
                    <el-radio :effect="themes" label="dynamic">{{ t('chart.dynamic') }}</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item
                v-if="showProperty('gaugeMin') && state.miscForm.gaugeMinType === 'fix'"
                :class="'form-item-' + themes"
                class="form-item"
            >
                <el-input-number
                    v-model="state.miscForm.gaugeMin"
                    :effect="themes"
                    controls-position="right"
                    size="small"
                    @change="changeMisc('gaugeMin')"
                />
            </el-form-item>
            <el-row
                v-if="showProperty('gaugeMinField') && state.miscForm.gaugeMinType === 'dynamic'"
                :gutter="8"
            >
                <el-col :span="12">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-select
                            v-model="state.miscForm.gaugeMinField.id"
                            :class="{ 'invalid-field': !validMinField }"
                            :effect="themes"
                            :placeholder="t('chart.field')"
                            @change="changeQuotaField('min', true)"
                        >
                            <el-option
                                v-for="item in quotaData"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                                class="series-select-option"
                            >
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
                                {{ item.name }}
                            </el-option>
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-select
                            v-model="state.miscForm.gaugeMinField.summary"
                            :effect="themes"
                            :placeholder="t('chart.summary')"
                            @change="changeQuotaField('min')"
                        >
                            <el-option v-if="validMinField" key="sum" :label="t('chart.sum')" value="sum"/>
                            <el-option v-if="validMinField" key="avg" :label="t('chart.avg')" value="avg"/>
                            <el-option v-if="validMinField" key="max" :label="t('chart.max')" value="max"/>
                            <el-option v-if="validMinField" key="min" :label="t('chart.min')" value="min"/>
                            <el-option
                                v-if="validMinField"
                                key="stddev_pop"
                                :label="t('chart.stddev_pop')"
                                value="stddev_pop"
                            />
                            <el-option
                                v-if="validMinField"
                                key="var_pop"
                                :label="t('chart.var_pop')"
                                value="var_pop"
                            />
                            <el-option key="count" :label="t('chart.count')" value="count"/>
                            <el-option
                                v-if="state.minField.id !== '-1'"
                                key="count_distinct"
                                :label="t('chart.count_distinct')"
                                value="count_distinct"
                            />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item
                v-show="showProperty('gaugeMaxType')"
                :class="'form-item-' + themes"
                :label="t('chart.max')"
                class="form-item margin-bottom-8"
            >
                <el-radio-group
                    v-model="state.miscForm.gaugeMaxType"
                    :disabled="quotaData.length === 0"
                    size="small"
                    @change="changeQuotaField('max')"
                >
                    <el-radio :effect="themes" label="fix">{{ t('chart.fix') }}</el-radio>
                    <el-radio :effect="themes" label="dynamic">{{ t('chart.dynamic') }}</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item
                v-if="showProperty('gaugeMax') && state.miscForm.gaugeMaxType === 'fix'"
                :class="'form-item-' + themes"
                class="form-item"
            >
                <el-input-number
                    v-model="state.miscForm.gaugeMax"
                    :effect="themes"
                    controls-position="right"
                    size="small"
                    @change="changeMaxValidate('gaugeMax')"
                />
            </el-form-item>
            <el-row
                v-if="showProperty('gaugeMaxField') && state.miscForm.gaugeMaxType === 'dynamic'"
                :gutter="8"
            >
                <el-col :span="12">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-select
                            v-model="state.miscForm.gaugeMaxField.id"
                            :class="{ 'invalid-field': !validMaxField }"
                            :effect="themes"
                            :placeholder="t('chart.field')"
                            @change="changeQuotaField('max', true)"
                        >
                            <el-option
                                v-for="item in quotaData"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                                class="series-select-option"
                            >
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
                                {{ item.name }}
                            </el-option>
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-select
                            v-model="state.miscForm.gaugeMaxField.summary"
                            :effect="themes"
                            :placeholder="t('chart.summary')"
                            @change="changeQuotaField('max')"
                        >
                            <el-option v-if="validMaxField" key="sum" :label="t('chart.sum')" value="sum"/>
                            <el-option v-if="validMaxField" key="avg" :label="t('chart.avg')" value="avg"/>
                            <el-option v-if="validMaxField" key="max" :label="t('chart.max')" value="max"/>
                            <el-option v-if="validMaxField" key="min" :label="t('chart.min')" value="min"/>
                            <el-option
                                v-if="validMaxField"
                                key="stddev_pop"
                                :label="t('chart.stddev_pop')"
                                value="stddev_pop"
                            />
                            <el-option
                                v-if="validMaxField"
                                key="var_pop"
                                :label="t('chart.var_pop')"
                                value="var_pop"
                            />
                            <el-option key="count" :label="t('chart.count')" value="count"/>
                            <el-option
                                v-if="state.maxField.id !== '-1'"
                                key="count_distinct"
                                :label="t('chart.count_distinct')"
                                value="count_distinct"
                            />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>
        </template>

        <!--gauge-end-->

        <!--liquid-begin-->
        <el-row :gutter="8">
            <el-col :span="12">
                <el-form-item
                    v-show="showProperty('liquidShape')"
                    :class="'form-item-' + themes"
                    :label="t('chart.liquid_shape')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.miscForm.liquidShape"
                        :effect="themes"
                        :placeholder="t('chart.liquid_shape')"
                        @change="changeMisc('liquidShape')"
                    >
                        <el-option
                            v-for="item in liquidShapeOptions"
                            :key="item.value"
                            :label="item.name"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item
                    v-show="showProperty('liquidSize')"
                    :class="'form-item-' + themes"
                    :label="t('chart.radar_size')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.miscForm.liquidSize"
                        :effect="themes"
                        :max="100"
                        :min="1"
                        controls-position="right"
                        size="small"
                        @change="changeMisc('liquidSize')"
                    />
                </el-form-item>
            </el-col>
        </el-row>

        <el-form-item
            v-show="showProperty('liquidMaxType')"
            :class="'form-item-' + themes"
            :label="t('chart.liquid_max')"
            class="form-item margin-bottom-8"
        >
            <el-radio-group
                v-model="state.miscForm.liquidMaxType"
                :disabled="quotaData.length === 0"
                :effect="themes"
                size="small"
                @change="changeQuotaField('max')"
            >
                <el-radio :effect="themes" label="fix">
                    {{ t('chart.fix') }}
                </el-radio>
                <el-radio :effect="themes" label="dynamic">{{ t('chart.dynamic') }}</el-radio>
            </el-radio-group>
        </el-form-item>

        <el-form-item
            v-if="showProperty('liquidMaxType') && state.miscForm.liquidMaxType === 'fix'"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-input-number
                v-model="state.miscForm.liquidMax"
                :effect="themes"
                controls-position="right"
                size="small"
                @blur="changeMaxValidate('liquidMax')"
            />
        </el-form-item>

        <el-row
            v-if="showProperty('liquidMaxField') && state.miscForm.liquidMaxType === 'dynamic'"
            :gutter="8"
        >
            <el-col :span="12">
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-select
                        v-model="state.miscForm.liquidMaxField.id"
                        :class="{ 'invalid-field': !validLiquidMaxField }"
                        :effect="themes"
                        :placeholder="t('chart.field')"
                        @change="changeQuotaField('max', true)"
                    >
                        <el-option
                            v-for="item in quotaData"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            class="series-select-option"
                        >
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
                            {{ item.name }}
                        </el-option>
                    </el-select>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-select
                        v-model="state.miscForm.liquidMaxField.summary"
                        :effect="themes"
                        :placeholder="t('chart.summary')"
                        @change="changeQuotaField('max')"
                    >
                        <el-option v-if="validLiquidMaxField" key="sum" :label="t('chart.sum')" value="sum"/>
                        <el-option v-if="validLiquidMaxField" key="avg" :label="t('chart.avg')" value="avg"/>
                        <el-option v-if="validLiquidMaxField" key="max" :label="t('chart.max')" value="max"/>
                        <el-option v-if="validLiquidMaxField" key="min" :label="t('chart.min')" value="min"/>
                        <el-option
                            v-if="validLiquidMaxField"
                            key="stddev_pop"
                            :label="t('chart.stddev_pop')"
                            value="stddev_pop"
                        />
                        <el-option
                            v-if="validLiquidMaxField"
                            key="var_pop"
                            :label="t('chart.var_pop')"
                            value="var_pop"
                        />
                        <el-option key="count" :label="t('chart.count')" value="count"/>
                        <el-option
                            v-if="state.liquidMaxField.id !== '-1'"
                            key="count_distinct"
                            :label="t('chart.count_distinct')"
                            value="count_distinct"
                        />
                    </el-select>
                </el-form-item>
            </el-col>
        </el-row>
        <!--liquid-end-->

        <!-- word-cloud start -->
        <template v-if="showProperty('wordCloudAxisValueRange')">
            <div style="display: flex; flex-direction: row; justify-content: space-between">
                <label :class="'custom-form-item-label--' + themes" class="custom-form-item-label">
                    {{ t('chart.axis_value') }}
                    <el-tooltip :effect="toolTip" class="item" placement="top">
                        <template #content><span v-html="t('chart.axis_tip')"></span></template>
                        <span style="vertical-align: middle">
              <el-icon style="cursor: pointer">
                <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
              </el-icon>
            </span>
                    </el-tooltip>
                </label>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.miscForm.wordCloudAxisValueRange.auto"
                        :effect="props.themes"
                        size="small"
                        @change="changeMisc()"
                    >
                        {{ t('chart.axis_auto') }}
                    </el-checkbox>
                </el-form-item>
            </div>
            <template
                v-if="
          showProperty('wordCloudAxisValueRange') && !state.miscForm.wordCloudAxisValueRange.auto
        "
            >
                <el-row :gutter="8">
                    <el-col :span="12">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="t('chart.axis_value_max')"
                            class="form-item"
                        >
                            <el-input-number
                                v-model="state.miscForm.wordCloudAxisValueRange.max"
                                :effect="props.themes"
                                controls-position="right"
                                @change="changeMisc()"
                            />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="t('chart.axis_value_min')"
                            class="form-item"
                        >
                            <el-input-number
                                v-model="state.miscForm.wordCloudAxisValueRange.min"
                                :effect="props.themes"
                                controls-position="right"
                                @change="changeMisc()"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </template>
        </template>
        <div v-if="showProperty('wordSizeRange')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.word_size_range') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="24">
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.miscForm.wordSizeRange"
                            :effect="themes"
                            :max="100"
                            :min="1"
                            range
                            @change="changeMisc()"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>

        <div v-if="showProperty('wordSpacing')" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.word_spacing') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="24">
                    <el-form-item
                        v-show="showProperty('wordSpacing')"
                        :class="'form-item-' + themes"
                        class="form-item alpha-slider"
                    >
                        <el-slider
                            v-model="state.miscForm.wordSpacing"
                            :max="20"
                            :min="0"
                            @change="changeMisc()"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <!-- word-cloud end -->
    </el-form>
</template>

<style lang="less" scoped>
.dynamic-value-style {
    :deep(.ed-form-item__content) {
        flex-direction: row;
        justify-content: space-between;
    }

    :deep(.dynamic-item) {
        width: 100px !important;
    }
}

.field-item {
    float: left;
    color: #8492a6;
    font-size: 12px;
}

.margin-bottom-8 {
    margin-bottom: 8px !important;
}

.series-select-option {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 11px;
}

.invalid-field {
    :deep(.ed-input__wrapper) {
        box-shadow: 0 0 0 1px rgb(245, 74, 69) inset !important;
    }
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
</style>
