<template>
    <div class="ticket-dialog-container">
        <el-dialog
            v-model="dialogVisible"
            :append-to-body="true"
            :before-close="handleClose"
            :title="t('user.change_password')"
            class="is-ticket-dialog hidden-footer"
            width="600"
        >
            <slot/>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'

const {t} = useI18n()
const dialogVisible = ref(false)

const handleClose = done => {
    done()
}
const open = () => {
    dialogVisible.value = true
}
const close = () => {
    dialogVisible.value = false
}
defineExpose({
    open,
    close
})
</script>
<style lang="less" scoped>
.ticket-dialog-container {
    :deep(.is-ticket-dialog) {
        .ed-dialog__header {
            display: none;
        }
    }
}
</style>
