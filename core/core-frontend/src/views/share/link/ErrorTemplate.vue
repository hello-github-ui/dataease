<script lang="ts" setup>
import EmptyBackground from '@/components/empty-background/src/EmptyBackground.vue'
import {propTypes} from '@/utils/propTypes'

const props = defineProps({
    msg: propTypes.string.def('')
})
</script>
<template>
    <EmptyBackground :description="props.msg" img-type="noneWhite"/>
</template>
