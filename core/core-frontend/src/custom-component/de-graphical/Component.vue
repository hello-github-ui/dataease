<template>
    <div class="rect-main"></div>
</template>

<script lang="ts" setup>
defineProps({
    element: {
        type: Object,
        default() {
            return {
                style: {}
            }
        }
    }
})
</script>

<style lang="less" scoped>
.rect-main {
    width: 100%;
    height: 100%;
}
</style>
