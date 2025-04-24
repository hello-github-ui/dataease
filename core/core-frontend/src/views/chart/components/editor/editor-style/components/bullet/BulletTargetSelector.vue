<script lang="tsx" setup>
import {onMounted, PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {COLOR_PANEL, DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import {cloneDeep, defaultsDeep} from 'lodash-es'

const {t} = useI18n()
const props = defineProps({
    chart: {
        type: Object,
        required: true
    },
    themes: {
        type: String as PropType<EditorTheme>,
        default: 'dark'
    },
    propertyInner: {
        type: Array<string>
    },
    selectorType: {
        type: String
    }
})

const predefineColors = COLOR_PANEL

const state = reactive({
    bulletTargetForm: {
        bar: {
            target: {
                fill: 'rgb(0,0,0)',
                size: 20,
                showType: 'dynamic',
                value: 0,
                name: ''
            }
        }
    }
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
    if (state.bulletTargetForm.bar.target.value === null) {
        state.bulletTargetForm.bar.target.value = 1
    }
    emit('onMiscChange', {data: {bullet: {...state.bulletTargetForm}}, requestData: true}, prop)
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
        state.bulletTargetForm = defaultsDeep(customAttr.misc.bullet, cloneDeep(DEFAULT_MISC.bullet))
    }
}

onMounted(() => {
    init()
})
</script>

<template>
    <el-form
        ref="bulletTargetForm"
        :model="state.bulletTargetForm"
        label-position="top"
        size="small"
        @submit.prevent
    >
        <div v-if="selectorType === 'target'">
            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-radio-group
                    v-model="state.bulletTargetForm.bar.target.showType"
                    :effect="themes"
                    @change="changeStyle('bar.target.name')"
                >
                    <el-radio :effect="themes" label="dynamic">{{ t('chart.dynamic') }}</el-radio>
                    <el-radio :effect="themes" label="fixed">{{ t('chart.fix') }}</el-radio>
                </el-radio-group>
            </el-form-item>
            <div v-if="state.bulletTargetForm.bar.target.showType === 'dynamic'">
                <div style="flex: 1; display: flex">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('visualization.color')"
                        class="form-item"
                        style="padding-right: 4px"
                    >
                        <el-color-picker
                            v-model="state.bulletTargetForm.bar.target.fill"
                            :effect="themes"
                            :predefine="predefineColors"
                            is-custom
                            show-alpha
                            @change="changeStyle('bar.target.fill')"
                        />
                    </el-form-item>
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.height')"
                        class="form-item"
                        style="padding-left: 4px; width: 100%"
                    >
                        <el-input-number
                            v-model="state.bulletTargetForm.bar.target.size"
                            :effect="props.themes"
                            :max="100"
                            :min="1"
                            controls-position="right"
                            size="small"
                            @change="changeStyle('bar.target.size')"
                        />
                    </el-form-item>
                </div>
            </div>
            <div v-if="state.bulletTargetForm.bar.target.showType === 'fixed'">
                <div style="flex: 1; display: flex">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.progress_target')"
                        class="form-item"
                        style="width: 100%"
                    >
                        <el-input-number
                            v-model="state.bulletTargetForm.bar.target.value"
                            :effect="props.themes"
                            :min="1"
                            controls-position="right"
                            size="small"
                            @change="changeStyle('bar.target.value')"
                        />
                    </el-form-item>
                </div>
                <div style="flex: 1; display: flex">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('visualization.color')"
                        class="form-item"
                        style="padding-left: 4px"
                    >
                        <el-color-picker
                            v-model="state.bulletTargetForm.bar.target.fill"
                            :effect="themes"
                            :predefine="predefineColors"
                            is-custom
                            show-alpha
                            @change="changeStyle('bar.target.fill')"
                        />
                    </el-form-item>
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.height')"
                        class="form-item"
                        style="padding-left: 4px; width: 100%"
                    >
                        <el-input-number
                            v-model="state.bulletTargetForm.bar.target.size"
                            :effect="props.themes"
                            :max="100"
                            :min="1"
                            controls-position="right"
                            size="small"
                            @change="changeStyle('bar.target.size')"
                        />
                    </el-form-item>
                </div>
            </div>
        </div>
    </el-form>
</template>

<style lang="less" scoped></style>
