<template>
    <el-drawer
        v-model="dialogShow"
        :title="t('visualization.multiplexing')"
        custom-class="custom-drawer"
        direction="btt"
        size="90%"
        trigger="click"
        @closed="handleClose()"
    >
        <!-- 标识当前在复用页，用于作为轮播提示前缀 -->
        <div v-if="dialogShow" id="multiplexingDrawer"/>
        <dashboard-preview-show
            v-if="dialogShow && curDvType === 'dashboard'"
            ref="multiplexingPreviewShowRef"
            class="multiplexing-area"
            no-close
            resource-table="snapshot"
            show-position="multiplexing"
        ></dashboard-preview-show>
        <preview-show
            v-if="dialogShow && curDvType === 'dataV'"
            ref="multiplexingPreviewShowRef"
            class="multiplexing-area"
            no-close
            resource-table="snapshot"
            show-position="multiplexing"
        ></preview-show>
        <template #footer>
            <el-row class="multiplexing-footer">
                <el-col class="adapt-count">
                    <span>{{ t('visualization.multi_selected', [selectComponentCount]) }} </span>
                </el-col>
                <el-col class="adapt-select">
                    <span class="adapt-text">{{ t('visualization.component_style') }} ： </span>
                    <el-select
                        v-model="multiplexingStyleAdapt"
                        placeholder="Select"
                        placement="top-start"
                        style="width: 120px"
                    >
                        <el-option
                            v-for="item in state.copyOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-col>
                <el-button class="close-button" @click="dialogShow = false">{{
                        t('visualization.close')
                    }}
                </el-button>
                <el-button
                    :disabled="!selectComponentCount"
                    class="confirm-button"
                    type="primary"
                    @click="saveMultiplexing"
                >{{ t('visualization.multiplexing') }}
                </el-button
                >
            </el-row>
        </template>
    </el-drawer>
</template>

<script lang="ts" setup>
import {computed, nextTick, reactive, ref} from 'vue'
import DashboardPreviewShow from '@/views/dashboard/DashboardPreviewShow.vue'
import {copyStoreWithOut} from '@/store/modules/data-visualization/copy'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import {snapshotStoreWithOut} from '@/store/modules/data-visualization/snapshot'
import PreviewShow from '@/views/data-visualization/PreviewShow.vue'
import {useI18n} from '@/hooks/web/useI18n'
import ChartCarouselTooltip from '@/views/chart/components/js/g2plot_tooltip_carousel'

const dvMainStore = dvMainStoreWithOut()
const snapshotStore = snapshotStoreWithOut()
const dialogShow = ref(false)
const copyStore = copyStoreWithOut()
const multiplexingPreviewShowRef = ref(null)
const {multiplexingStyleAdapt, curMultiplexingComponents} = storeToRefs(dvMainStore)
const curDvType = ref('dashboard')
const {t} = useI18n()
const selectComponentCount = computed(() => Object.keys(curMultiplexingComponents.value).length)
const state = reactive({
    copyOptions: [
        {label: t('visualization.adapt_new_subject'), value: true},
        {label: t('visualization.keep_subject'), value: false}
    ]
})
const dialogInit = (dvType = 'dashboard') => {
    ChartCarouselTooltip.paused()
    curDvType.value = dvType
    dialogShow.value = true
    dvMainStore.initCurMultiplexingComponents()
}

const saveMultiplexing = () => {
    dialogShow.value = false
    const previewStateInfo = multiplexingPreviewShowRef.value.getPreviewStateInfo()
    const canvasViewInfoPreview = previewStateInfo.canvasViewInfoPreview
    nextTick(() => {
        copyStore.copyMultiplexingComponents(
            canvasViewInfoPreview,
            undefined,
            undefined,
            undefined,
            previewStateInfo.canvasStylePreview.scale
        )
        snapshotStore.recordSnapshotCache('saveMultiplexing')
    })
}
const handleClose = () => {
    ChartCarouselTooltip.closeEnlargeDialogDestroy()
}
defineExpose({
    dialogInit
})
</script>

<style lang="less" scoped>
.close-button {
    position: absolute;
    top: 18px;
    right: 120px;
}

.confirm-button {
    position: absolute;
    top: 18px;
    right: 20px;
}

.multiplexing-area {
    width: 100%;
    height: 100%;
}

.multiplexing-footer {
    position: relative;
}

.adapt-count {
    position: absolute;
    top: 18px;
    left: 20px;
    color: #646a73;
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
}

.adapt-select {
    position: absolute;
    top: 18px;
    right: 220px;
}

.adapt-text {
    font-size: 14px;
    font-weight: 400;
    color: #1f2329;
    line-height: 22px;
}
</style>

<style lang="less">
.custom-drawer {
    .ed-drawer__footer {
        height: 64px !important;
        padding: 0px !important;
        box-shadow: 0 -1px 0px #d7d7d7 !important;
    }

    .ed-drawer__body {
        padding: 0 0 64px 0 !important;
    }
}
</style>
