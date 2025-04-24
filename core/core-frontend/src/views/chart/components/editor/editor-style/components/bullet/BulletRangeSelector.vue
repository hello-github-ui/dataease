<script lang="tsx" setup>
import {onMounted, reactive, watch} from 'vue'
import {COLOR_PANEL, DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import {cloneDeep, defaultsDeep} from 'lodash-es'
import {useI18n} from '@/hooks/web/useI18n'

const {t} = useI18n()
const props = defineProps({
    chart: {
        type: Object,
        required: true
    },
    themes: {
        type: String,
        default: 'dark'
    },
    propertyInner: {
        type: Array
    },
    selectorType: {
        type: String
    }
})

const predefineColors = COLOR_PANEL

const state = reactive({
    bulletRangeForm: {
        bar: {
            ranges: {
                fill: 'rgba(0,128,255,0.5)',
                size: 20,
                showType: 'dynamic',
                fixedRange: [],
                fixedRangeNumber: 3,
                symbol: 'circle',
                symbolSize: 10,
                name: ''
            }
        }
    },
    rangeList: []
})

const emit = defineEmits(['onBasicStyleChange', 'onMiscChange'])

watch(
    () => props.chart.customAttr.misc,
    () => {
        init()
    },
    {deep: true}
)

const changeStyle = (prop?) => {
    if (state.bulletRangeForm.bar.ranges.showType === 'fixed' && state.rangeList.length) {
        state.bulletRangeForm.bar.ranges.fixedRange = cloneDeep(state.rangeList)
    }
    emit('onMiscChange', {data: {bullet: {...state.bulletRangeForm}}, requestData: true}, prop)
}
const changeRangeNumber = () => {
    if (state.bulletRangeForm.bar.ranges.fixedRangeNumber === null) {
        state.bulletRangeForm.bar.ranges.fixedRangeNumber = 1
    }
    if (state.rangeList.length > state.bulletRangeForm.bar.ranges.fixedRangeNumber) {
        state.rangeList = state.rangeList.slice(0, state.bulletRangeForm.bar.ranges.fixedRangeNumber)
    } else {
        for (
            let i = state.rangeList.length;
            i < state.bulletRangeForm.bar.ranges.fixedRangeNumber;
            i++
        ) {
            state.rangeList.push({
                name: t('chart.symbolic_range') + (i + 1),
                fixedRangeValue: undefined,
                fill: 'rgba(0,128,255,0.44)'
            })
        }
    }
    changeRangeItem()
}

const changeRangeItem = () => {
    validateRangeList() && changeStyle()
}

const validateRangeList = () => {
    return state.rangeList.every(
        item => item.name && item.fixedRangeValue !== null && item.fixedRangeValue !== undefined
    )
}

const init = () => {
    const chart = JSON.parse(JSON.stringify(props.chart))
    if (chart.customAttr) {
        let customAttr = null
        if (Object.prototype.toString.call(chart.customAttr) === '[object Object]') {
            customAttr = JSON.parse(JSON.stringify(chart.customAttr))
        } else {
            customAttr = JSON.parse(chart.customAttr)
        }
        state.bulletRangeForm = defaultsDeep(customAttr.misc.bullet, cloneDeep(DEFAULT_MISC.bullet))
        getRangeList()
    }
}

const getRangeList = () => {
    const range = []
    if (state.bulletRangeForm.bar.ranges?.fixedRange?.length) {
        state.rangeList = state.bulletRangeForm.bar.ranges.fixedRange
    } else {
        for (let i = 0; i < state.bulletRangeForm.bar.ranges.fixedRangeNumber; i++) {
            range.push({
                name: '区间' + (i + 1),
                fixedRangeValue: undefined,
                fill: 'rgba(0,128,255,0)'
            })
        }
        state.rangeList = cloneDeep(range)
    }
}

const changeShowType = () => {
    if (state.bulletRangeForm.bar.ranges.showType === 'dynamic') {
        changeStyle()
    } else {
        changeRangeItem()
    }
}

onMounted(() => {
    init()
})
</script>

<template>
    <el-form
        ref="bulletRangeForm"
        :model="state.bulletRangeForm"
        label-position="top"
        size="small"
        @submit.prevent
    >
        <div v-if="selectorType === 'range'">
            <el-form-item
                :class="'form-item-' + themes"
                :label="t('chart.radar_size')"
                class="form-item"
                style="padding-left: 4px; width: 100%"
            >
                <el-input-number
                    v-model="state.bulletRangeForm.bar.ranges.size"
                    :effect="props.themes"
                    :min="1"
                    controls-position="right"
                    size="small"
                    @change="changeStyle('bar.ranges.size')"
                />
            </el-form-item>
            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-radio-group
                    v-model="state.bulletRangeForm.bar.ranges.showType"
                    :effect="themes"
                    @change="changeShowType()"
                >
                    <el-radio :effect="themes" label="dynamic">{{ t('chart.dynamic') }}</el-radio>
                    <el-radio :effect="themes" label="fixed">{{ t('chart.fix') }}</el-radio>
                </el-radio-group>
            </el-form-item>
            <div v-if="state.bulletRangeForm.bar.ranges.showType === 'dynamic'">
                <div style="flex: 1; display: flex">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('visualization.backgroundColor')"
                        class="form-item"
                        style="padding-right: 4px"
                    >
                        <el-color-picker
                            v-model="state.bulletRangeForm.bar.ranges.fill"
                            :effect="themes"
                            :predefine="predefineColors"
                            is-custom
                            show-alpha
                            @change="changeStyle('bar.ranges.fill')"
                        />
                    </el-form-item>
                </div>
            </div>
            <div v-if="state.bulletRangeForm.bar.ranges.showType === 'fixed'">
                <div style="flex: 1; display: flex">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.range_num')"
                        class="form-item"
                        style="width: 100%"
                    >
                        <el-input-number
                            v-model="state.bulletRangeForm.bar.ranges.fixedRangeNumber"
                            :controls="true"
                            :effect="themes"
                            :max="9"
                            :min="1"
                            :precision="0"
                            :step="1"
                            controls-position="right"
                            @change="changeRangeNumber()"
                        />
                    </el-form-item>
                </div>
                <div v-for="(item, index) in state.rangeList" :key="index" style="flex: 1; display: flex">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="index === 0 ? t('chart.threshold_value') : ' '"
                        class="form-item"
                        style="width: 170px"
                    >
                        <el-input-number
                            v-model="item.fixedRangeValue"
                            :effect="themes"
                            :min="0"
                            controls-position="right"
                            size="small"
                            @change="changeRangeItem()"
                        />
                    </el-form-item>
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="index === 0 ? t('chart.show_name') : ' '"
                        class="form-item"
                        style="padding-left: 4px"
                    >
                        <el-input
                            v-model="item.name"
                            :effect="themes"
                            size="small"
                            @change="changeRangeItem()"
                        />
                    </el-form-item>
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="index === 0 ? t('visualization.backgroundColor') : ' '"
                        class="form-item"
                        style="padding-left: 4px"
                    >
                        <el-color-picker
                            v-model="item.fill"
                            :effect="themes"
                            :predefine="predefineColors"
                            is-custom
                            show-alpha
                            @change="changeRangeItem()"
                        />
                    </el-form-item>
                </div>
            </div>
        </div>
    </el-form>
</template>

<style lang="less" scoped></style>
