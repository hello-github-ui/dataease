<template>
    <div class="attr-list de-collapse-style">
        <CommonAttr :element="curComponent" :themes="themes">
            <el-collapse-item
                v-if="curComponent && curComponent.frameLinks && !mobileInPc"
                :effect="themes"
                :title="t('visualization.link_info')"
                name="frameLinks"
            >
                <frame-links :frame-links="curComponent.frameLinks" :themes="themes"></frame-links>
            </el-collapse-item>
        </CommonAttr>
    </div>
</template>

<script lang="ts" setup>
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import CommonAttr from '@/custom-component/common/CommonAttr.vue'
import {storeToRefs} from 'pinia'
import FrameLinks from '@/custom-component/de-frame/FrameLinks.vue'
import {useI18n} from '@/hooks/web/useI18n'

const dvMainStore = dvMainStoreWithOut()
const {curComponent, mobileInPc} = storeToRefs(dvMainStore)
const {t} = useI18n()
const props = withDefaults(
    defineProps<{
        themes?: EditorTheme
    }>(),
    {
        themes: 'dark'
    }
)
</script>
