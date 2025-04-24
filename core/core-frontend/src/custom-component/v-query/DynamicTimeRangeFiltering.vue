<script lang="ts" setup>
import {computed, onBeforeMount, PropType, toRefs, watch} from 'vue'
import {Calendar} from '@element-plus/icons-vue'
import {type DatePickType} from 'element-plus-secondary'
import type {ManipulateType} from 'dayjs'
import {getAround, getCustomRange} from './time-format-dayjs'

interface SelectConfig {
    regularOrTrends: string
    regularOrTrendsValue: [Date, Date]
    intervalType: string
    relativeToCurrentRange: string
    timeNum: number
    relativeToCurrentType: ManipulateType
    around: string
    timeGranularity: DatePickType
    timeNumRange: number
    relativeToCurrentTypeRange: ManipulateType
    aroundRange: string
}

const props = defineProps({
    config: {
        type: Object as PropType<SelectConfig>,
        default: () => {
            return {
                timeGranularityMultiple: 'daterange',
                regularOrTrendsValue: [],
                regularOrTrends: 'fixed',
                timeNum: 0,
                intervalType: 'none',
                relativeToCurrentRange: 'custom',
                relativeToCurrentType: 'year',
                around: 'f',
                timeGranularity: 'date',
                timeNumRange: 0,
                relativeToCurrentTypeRange: 'year',
                aroundRange: 'f'
            }
        }
    },
    timeGranularityMultiple: {
        type: String as PropType<DatePickType>,
        default: () => {
            return 'yearrange'
        }
    }
})
const {config} = toRefs(props)

const timeConfig = computed(() => {
    const {
        timeNum,
        relativeToCurrentType,
        around,
        relativeToCurrentRange,
        intervalType,
        regularOrTrends,
        timeGranularity,
        timeNumRange,
        relativeToCurrentTypeRange,
        aroundRange
    } = config.value
    return {
        timeNum,
        relativeToCurrentType,
        around,
        intervalType,
        relativeToCurrentRange,
        regularOrTrends,
        timeGranularity,
        timeNumRange,
        relativeToCurrentTypeRange,
        aroundRange,
        timeGranularityMultiple: props.timeGranularityMultiple
    }
})
const timeInterval = computed<DatePickType>(() => {
    const noTime = props.timeGranularityMultiple.split('time').join('')
    return config.value.intervalType === 'timeInterval'
        ? (noTime as DatePickType)
        : (noTime.split('range')[0] as DatePickType)
})
watch(
    () => timeConfig.value,
    () => {
        init()
    },
    {
        deep: true
    }
)

const init = () => {
    const {
        timeNum,
        relativeToCurrentType,
        around,
        relativeToCurrentRange,
        regularOrTrends,
        timeNumRange,
        relativeToCurrentTypeRange,
        aroundRange
    } = timeConfig.value

    if (regularOrTrends === 'fixed') {
        if (
            Array.isArray(config.value.regularOrTrendsValue) &&
            !!config.value.regularOrTrendsValue.length
        )
            return
        config.value.regularOrTrendsValue = [
            getAround(relativeToCurrentTypeRange, 'add', 0),
            getAround(relativeToCurrentTypeRange, 'add', 1)
        ]
        return
    }

    const startTime = getAround(relativeToCurrentType, around === 'f' ? 'subtract' : 'add', timeNum)
    const endTime = getAround(
        relativeToCurrentTypeRange,
        aroundRange === 'f' ? 'subtract' : 'add',
        timeNumRange
    )

    if (!!relativeToCurrentRange && relativeToCurrentRange !== 'custom') {
        config.value.regularOrTrendsValue = getCustomRange(relativeToCurrentRange)
        return
    }

    config.value.regularOrTrendsValue = [startTime, endTime]
}

onBeforeMount(() => {
    init()
})

const formatDate = computed(() => {
    return (props.timeGranularityMultiple as string) === 'yearrange' ? 'YYYY' : undefined
})
</script>

<template>
    <el-date-picker
        :key="timeInterval"
        v-model="config.regularOrTrendsValue"
        :disabled="config.regularOrTrends !== 'fixed'"
        :end-placeholder="$t('datasource.end_time')"
        :format="formatDate"
        :popper-class="'custom-dynamic-time-range-filter-popper_class'"
        :prefix-icon="Calendar"
        :range-separator="$t('cron.to')"
        :start-placeholder="$t('datasource.start_time')"
        :type="timeInterval"
    />
</template>

<style lang="less">
.custom-dynamic-time-range-filter-popper_class {
    font-family: var(--de-canvas_custom_font);
}
</style>
