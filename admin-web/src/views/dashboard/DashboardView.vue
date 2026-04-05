<template>
  <div>
    <el-row :gutter="16" class="stat-cards">
      <el-col v-for="card in statCards" :key="card.label" :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <div v-if="card.sub" class="stat-sub">{{ card.sub }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :xl="12">
        <el-card header="用户增长趋势">
          <div ref="userChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :xl="12">
        <el-card header="交易量趋势">
          <div ref="orderChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :xl="12">
        <el-card header="商品分类分布">
          <div ref="categoryChartRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getOverview, getTrend, getDistribution } from '../../api/stats'

const userChartRef = ref()
const orderChartRef = ref()
const categoryChartRef = ref()

const statCards = reactive([
  { label: '总用户数', value: 0, sub: '' },
  { label: '在售商品', value: 0, sub: '' },
  { label: '总订单数', value: 0, sub: '' },
  { label: '待处理', value: 0, sub: '' }
])

const charts = []

function initLineChart(el, dates, counts, color) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'line',
        data: counts,
        smooth: true,
        itemStyle: { color },
        areaStyle: { color: `${color}20` }
      }
    ]
  })
  charts.push(chart)
}

function initPieChart(el, data) {
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: { trigger: 'item' },
    color: ['#010544', '#CE57C1', '#5B6CFF', '#FF8A65', '#26A69A', '#FFCA28', '#8D6E63', '#78909C'],
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.map(item => ({ name: item.name, value: item.count })),
        emphasis: { itemStyle: { shadowBlur: 10 } }
      }
    ]
  })
  charts.push(chart)
}

function handleResize() {
  charts.forEach(chart => chart.resize())
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)

  try {
    const overview = await getOverview()
    statCards[0].value = overview.totalUsers
    statCards[0].sub = `今日 +${overview.todayUsers}`
    statCards[1].value = overview.totalProducts
    statCards[1].sub = `今日 +${overview.todayProducts}`
    statCards[2].value = overview.totalOrders
    statCards[2].sub = `今日 +${overview.todayOrders}`
    statCards[3].value = overview.pendingReports + overview.openDisputes
    statCards[3].sub = `举报 ${overview.pendingReports} / 纠纷 ${overview.openDisputes}`
  } catch (err) {
    // 错误已由请求层统一处理
  }

  try {
    const userTrend = await getTrend('users', 7)
    initLineChart(
      userChartRef.value,
      userTrend.map(item => item.date),
      userTrend.map(item => item.count),
      '#010544'
    )
  } catch (err) {
    // 错误已由请求层统一处理
  }

  try {
    const orderTrend = await getTrend('orders', 7)
    initLineChart(
      orderChartRef.value,
      orderTrend.map(item => item.date),
      orderTrend.map(item => item.count),
      '#CE57C1'
    )
  } catch (err) {
    // 错误已由请求层统一处理
  }

  try {
    const distribution = await getDistribution()
    initPieChart(categoryChartRef.value, distribution)
  } catch (err) {
    // 错误已由请求层统一处理
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(chart => chart.dispose())
})
</script>

<style scoped>
.stat-cards {
  margin-bottom: 16px;
}

.chart-row {
  margin-top: 16px;
}

.stat-card {
  text-align: center;
  padding: 10px 0;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #010544;
}

.stat-label {
  color: #999;
  font-size: 14px;
  margin-top: 4px;
}

.stat-sub {
  color: #CE57C1;
  font-size: 12px;
  margin-top: 4px;
}

.chart-box {
  height: 300px;
}
</style>
