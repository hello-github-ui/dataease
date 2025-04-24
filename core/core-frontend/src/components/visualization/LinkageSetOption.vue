<script lang="ts" setup>
import {ref, toRefs} from 'vue'
import {propTypes} from '@/utils/propTypes'
import {useI18n} from '@/hooks/web/useI18n'

const {t} = useI18n()

const props = defineProps({
    title: propTypes.string,
    baseWidth: {
        required: false,
        type: String,
        default: '100%'
    },
    actionSelection: {
        required: true,
        type: Object
    },
    themes: {
        type: String,
        default: 'dark'
    }
})

const selection = ref()

const selectionChange = () => {
    // do selection
}

const {title, themes, actionSelection} = toRefs(props)
</script>

<template>
    <el-popover
        :popper-style="'max-width:' + baseWidth"
        :show-arrow="false"
        placement="right-start"
        trigger="click"
        width="auto"
    >
        <template #reference>
      <span class="option-set ed-dialog__title"
      >{{ t('visualization.linkage_setting') }}
        <el-icon style="margin: 5px 0 0 5px"><Setting/></el-icon
        ></span>
        </template>
        <el-row>
            {{ t('visualization.select_linkage_tips') }}
        </el-row>
        <el-row>
            <el-radio-group
                v-model="actionSelection.linkageActive"
                class="radio_group"
                style="margin-top: 12px"
                @change="selectionChange"
            >
                <el-radio label="custom"
                ><span style="font-weight: normal">
            {{ t('visualization.linkage_option1') }}
          </span></el-radio
                >
                <el-radio label="auto"
                ><span style="font-weight: normal">{{
                        t('visualization.linkage_option2')
                    }}</span></el-radio
                >
            </el-radio-group>
        </el-row>
    </el-popover>
</template>
<style lang="less" scoped>
.option-set {
    position: absolute;
    display: flex;
    left: 24px;
    top: 30px;
}

.radio_group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
</style>
