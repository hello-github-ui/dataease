<template>
    <div class="attr-list de-collapse-style">
        <CommonAttr :element="curComponent" :themes="themes">
            <el-collapse-item
                v-if="curComponent && curComponent.videoLinks && !mobileInPc"
                :effect="themes"
                :title="t('visualization.link_info')"
                name="videoLinks"
            >
                <video-links :link-info="curComponent.videoLinks" :themes="themes"></video-links>
            </el-collapse-item>
        </CommonAttr>
    </div>
</template>

<script lang="ts" setup>
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import CommonAttr from '@/custom-component/common/CommonAttr.vue'
import {storeToRefs} from 'pinia'
import VideoLinks from '@/custom-component/de-video/VideoLinks.vue'
import {useI18n} from '@/hooks/web/useI18n'

const dvMainStore = dvMainStoreWithOut()
const {curComponent, mobileInPc} = storeToRefs(dvMainStore)
const {t} = useI18n()

withDefaults(
    defineProps<{
        themes?: EditorTheme
    }>(),
    {
        themes: 'dark'
    }
)
</script>
