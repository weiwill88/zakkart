<template>
  <div class="coming-page">
    <div class="page-header">
      <h2>{{ title }}</h2>
    </div>

    <el-card shadow="never" class="coming-card">
      <div class="coming-kicker">开发排期中</div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <el-tag type="info">{{ phase }}</el-tag>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => route.meta.title || '页面建设中')
const description = computed(() => route.meta.description || '该页面已纳入正式开发计划，当前阶段先完成基础设施和主链路。')
const phase = computed(() => route.meta.phase || '后续阶段')
</script>

<style scoped>
.coming-page {
  min-height: calc(100vh - 160px);
}

.coming-card {
  padding: 12px;
}

.coming-kicker {
  display: inline-flex;
  margin-bottom: 14px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #92400e;
  background: #fffbeb;
}

.coming-card h3 {
  margin: 0 0 12px;
  font-size: 24px;
}

.coming-card p {
  margin: 0 0 18px;
  max-width: 720px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}
</style>
