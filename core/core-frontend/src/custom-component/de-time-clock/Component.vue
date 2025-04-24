<template>
    <div style="height: 100%">
        <time-default :ref="element.id" :element="element"/>
    </div>
</template>

<script lang="ts" setup>
import TimeDefault from '@/custom-component/de-time-clock/TimeDefault.vue'

defineProps({
    element: {
        type: Object
    }
})
</script>
