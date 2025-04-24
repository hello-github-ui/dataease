<template>
    <div class="circle-shape">
        <v-text :element="element" :prop-value="element.propValue"/>
    </div>
</template>

<script lang="ts" setup>
defineProps({
    propValue: {
        type: String,
        required: true,
        default: ''
    },
    element: {
        type: Object,
        default() {
            return {
                propValue: null
            }
        }
    }
})
</script>

<style lang="less" scoped>
.rect-shape {
    width: 100%;
    height: 100%;
    overflow: auto;
}
</style>
